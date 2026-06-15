import { ISO_COUNTRIES } from '../../../../../script/shared/iso3166';
import { TransactionModel } from '../models/TransactionModel';
import { WalletModel } from '../models/WalletModel';

const NUMERIC_TO_ALPHA2 = new Map<string, string>(ISO_COUNTRIES.map((c) => [c.numeric, c.alpha2]));
import { WalletCountSnapshotModel } from '../models/WalletCountSnapshotModel';
import { CountryModel } from '../models/CountryModel';
import { IssuerModel } from '../models/IssuerModel';
import { LicenseModel } from '../models/LicenseModel';
import { ReserveTypeModel } from '../models/ReserveTypeModel';
import { StablecoinModel } from '../models/StablecoinModel';
import type {
    IAnalyticsRepository,
    AdoptionParams,
    CorridorParams,
    CountryOverviewParams,
    CountryCorridorsParams,
    CountryAdoptionMetric,
    CorridorFlow,
    BidirectionalCorridorFlow,
    CountryOverview,
    CountryCorridorBreakdown,
    StablecoinShare,
} from '../../../../domain/repositories/IAnalyticsRepository';
import { periodBoundaries } from '../utils/queryUtils';
import type { ReserveTypeCodeValue } from '../../../../domain/value-objects/ReserveTypeCode';

export class MongoAnalyticsRepository implements IAnalyticsRepository {
    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    /** "YYYY-MM" period key for the end of the requested reporting period. */
    private periodKey(year: number, month?: number): string {
        const m = month ?? 12;
        return `${year}-${String(m).padStart(2, '0')}`;
    }

    /**
     * Latest wallet-count snapshot (period <= target) per country.
     * Returns a Map of countryId -> walletCount.
     */
    private async getWalletSnapshotMap(
        countryIds: string[],
        targetPeriod: string,
    ): Promise<Map<string, number>> {
        const rows = await WalletCountSnapshotModel.aggregate<{
            _id: string;
            walletCount: number;
        }>([
            { $match: { countryId: { $in: countryIds }, period: { $lte: targetPeriod } } },
            { $sort: { period: -1 } },
            {
                $group: {
                    _id: '$countryId',
                    walletCount: { $first: '$walletCount' },
                },
            },
        ]);
        return new Map(rows.map((r) => [r._id, r.walletCount]));
    }

    // ------------------------------------------------------------------
    // Adoption heatmap
    // ------------------------------------------------------------------
    async getAdoptionMetrics(params: AdoptionParams): Promise<CountryAdoptionMetric[]> {
        const { year, month, referenceAsset, stablecoinId, countryId, region } = params;
        const { start, end } = periodBoundaries(year, month);

        // Optionally narrow down which stablecoin IDs to include
        let stablecoinIds: string[] | null = null;
        if (stablecoinId && stablecoinId !== 'All') {
            stablecoinIds = [stablecoinId];
        } else if (referenceAsset) {
            const coins = await StablecoinModel.find({ referenceAsset }).lean();
            stablecoinIds = coins.map((c) => c.stablecoinId);
        }

        // Build country filter
        const countryFilter: Record<string, unknown> = {};
        if (countryId && countryId !== 'All') countryFilter['countryId'] = countryId;
        if (region) countryFilter['region'] = region;

        const countries = await CountryModel.find(countryFilter).lean();
        if (!countries.length) return [];

        const countryIds = countries.map((c) => c.countryId);

        // Active wallets per country at end of period
        const walletAgg = await WalletModel.aggregate<{ _id: string; count: number }>([
            {
                $match: {
                    countryId: { $in: countryIds },
                    dateOpened: { $lte: end },
                    $or: [{ dateClosed: null }, { dateClosed: { $gt: end } }],
                },
            },
            { $group: { _id: '$countryId', count: { $sum: 1 } } },
        ]);

        const walletMap = new Map<string, number>(walletAgg.map((r) => [r._id, r.count]));

        // Monthly snapshots of wallets holding stablecoins. Falls back to the
        // WalletModel count above when a country has no snapshot yet.
        const snapshotMap = await this.getWalletSnapshotMap(
            countryIds,
            this.periodKey(year, month),
        );

        // Transaction values per country (senderCountryId)
        const txFilter: Record<string, unknown> = {
            senderCountryId: { $in: countryIds },
            date: { $gte: start, $lte: end },
        };
        if (stablecoinIds) txFilter['stablecoinId'] = { $in: stablecoinIds };

        const txAgg = await TransactionModel.aggregate<{ _id: string; totalValue: number }>([
            { $match: txFilter },
            { $group: { _id: '$senderCountryId', totalValue: { $sum: '$value.amount' } } },
        ]);

        const txMap = new Map<string, number>(txAgg.map((r) => [r._id, r.totalValue]));
        const globalTotal = Array.from(txMap.values()).reduce((sum, v) => sum + v, 0);

        return countries.map((c) => {
            const activeWallets = snapshotMap.get(c.countryId) ?? walletMap.get(c.countryId) ?? 0;
            const txValue = txMap.get(c.countryId) ?? 0;
            const adoptionRate =
                c.population && c.population > 0 ? activeWallets / c.population : 0;
            const txValueShare = globalTotal > 0 ? txValue / globalTotal : 0;

            return {
                countryId: c.countryId,
                isoAlpha2: NUMERIC_TO_ALPHA2.get(c.countryId) ?? '',
                name: c.name,
                region: c.region,
                adoptionRate: parseFloat(adoptionRate.toFixed(6)),
                activeWallets,
                txValueShare: parseFloat(txValueShare.toFixed(6)),
                unit: 'ratio' as const,
                remittancesSent: c.remittancesSent,
            };
        });
    }

    // ------------------------------------------------------------------
    // Corridor flows  (source: Allium corridor snapshots in TransactionModel)
    // ------------------------------------------------------------------
    async getCorridorFlows(
        params: CorridorParams,
    ): Promise<CorridorFlow[] | BidirectionalCorridorFlow[]> {
        const { year, month, stablecoinId, bidirectional, regionFrom, regionTo } = params;

        const periodFilter = month
            ? { period: `${year}-${String(month).padStart(2, '0')}` }
            : { period: { $gte: `${year}-01`, $lte: `${year}-12` } };

        const matchFilter: Record<string, unknown> = {
            type: 'corridor',
            source: 'allium',
            ...periodFilter,
        };

        if (stablecoinId && stablecoinId !== 'All') {
            matchFilter['tokenSymbol'] = stablecoinId.toUpperCase();
        }
        if (params.countryId && params.countryId !== 'All') {
            matchFilter['$or'] = [
                { senderCountryId: params.countryId },
                { receiverCountryId: params.countryId },
            ];
        }

        interface AlliumAggRow {
            _id: { from: string; to: string };
            totalUsdVolume: number;
            usdStablecoinVolume: number;
            tokens: { symbol: string; volume: number }[];
        }

        const rows = await TransactionModel.aggregate<AlliumAggRow>([
            { $match: matchFilter },
            {
                $group: {
                    _id: { from: '$senderCountryId', to: '$receiverCountryId' },
                    totalUsdVolume: { $sum: '$value.amount' },
                    usdStablecoinVolume: { $sum: '$usdStablecoinVolume' },
                    tokens: { $push: { symbol: '$tokenSymbol', volume: '$value.amount' } },
                },
            },
        ]);

        let filteredRows = rows;
        if (regionFrom || regionTo) {
            const allCountries = await CountryModel.find({}).lean();
            const regionMap = new Map<string, string>(
                allCountries.map((c) => [c.countryId, c.region]),
            );
            filteredRows = rows.filter((r) => {
                if (regionFrom && regionMap.get(r._id.from) !== regionFrom) return false;
                if (regionTo && regionMap.get(r._id.to) !== regionTo) return false;
                return true;
            });
        }

        const buildTopTokens = (
            tokens: { symbol: string; volume: number }[],
            totalVol: number,
        ): StablecoinShare[] => {
            const tokenMap = tokens.reduce<Map<string, number>>((acc, t) => {
                acc.set(t.symbol, (acc.get(t.symbol) ?? 0) + t.volume);
                return acc;
            }, new Map());
            return Array.from(tokenMap.entries())
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([symbol, vol]) => ({
                    stablecoinId: symbol,
                    name: symbol,
                    share: totalVol > 0 ? vol / totalVol : 0,
                }));
        };

        if (!bidirectional) {
            return filteredRows.map((r): CorridorFlow => ({
                from: r._id.from,
                to: r._id.to,
                value: { amount: parseFloat(r.totalUsdVolume.toFixed(2)), currency: 'USD' },
                dollarizationIndex:
                    r.totalUsdVolume > 0 ? r.usdStablecoinVolume / r.totalUsdVolume : 0,
                topStablecoins: buildTopTokens(r.tokens, r.totalUsdVolume),
            }));
        }

        // Bidirectional: merge A→B and B→A
        const pairMap = new Map<string, { a: AlliumAggRow; b?: AlliumAggRow }>();
        for (const r of filteredRows) {
            const key =
                r._id.from < r._id.to
                    ? `${r._id.from}:${r._id.to}`
                    : `${r._id.to}:${r._id.from}`;
            const existing = pairMap.get(key);
            if (!existing) pairMap.set(key, { a: r });
            else existing.b = r;
        }

        return Array.from(pairMap.values()).map(({ a, b }): BidirectionalCorridorFlow => {
            const country1 = a._id.from < a._id.to ? a._id.from : a._id.to;
            const country2 = a._id.from < a._id.to ? a._id.to : a._id.from;
            const forward = a._id.from === country1 ? a : b;
            const backward = a._id.from === country2 ? a : b;

            const v1 = forward?.totalUsdVolume ?? 0;
            const v2 = backward?.totalUsdVolume ?? 0;
            const total = v1 + v2;
            const usdValue =
                (forward?.usdStablecoinVolume ?? 0) + (backward?.usdStablecoinVolume ?? 0);

            return {
                country1,
                country2,
                valueFromCountry1: { amount: parseFloat(v1.toFixed(2)), currency: 'USD' },
                valueFromCountry2: { amount: parseFloat(v2.toFixed(2)), currency: 'USD' },
                totalValue: { amount: parseFloat(total.toFixed(2)), currency: 'USD' },
                dollarizationIndex: total > 0 ? usdValue / total : 0,
            };
        });
    }

    // ------------------------------------------------------------------
    // Country overview
    // ------------------------------------------------------------------
    async getCountryOverview(params: CountryOverviewParams): Promise<CountryOverview | null> {
        const { countryId, year, month, referenceAsset } = params;
        const { start, end } = periodBoundaries(year, month);

        const countryDoc = await CountryModel.findOne({ countryId }).lean();
        if (!countryDoc) return null;

        let stablecoinIds: string[] | null = null;
        if (referenceAsset) {
            const coins = await StablecoinModel.find({ referenceAsset }).lean();
            stablecoinIds = coins.map((c) => c.stablecoinId);
        }

        // Active wallets — prefer the latest monthly snapshot, fall back to
        // live WalletModel counts when no snapshot exists yet.
        const snapshotMap = await this.getWalletSnapshotMap(
            [countryId],
            this.periodKey(year, month),
        );
        const activeWallets =
            snapshotMap.get(countryId) ??
            (await WalletModel.countDocuments({
                countryId,
                dateOpened: { $lte: end },
                $or: [{ dateClosed: null }, { dateClosed: { $gt: end } }],
            }));

        // Transaction value share (corridor snapshots excluded — they are aggregate monthly data)
        const txFilter: Record<string, unknown> = {
            type: { $ne: 'corridor' },
            date: { $gte: start, $lte: end },
        };
        if (stablecoinIds) txFilter['stablecoinId'] = { $in: stablecoinIds };

        interface TxAgg { totalValue: number }
        const [countryTxAgg, globalTxAgg] = await Promise.all([
            TransactionModel.aggregate<TxAgg>([
                { $match: { ...txFilter, senderCountryId: countryId } },
                { $group: { _id: null, totalValue: { $sum: '$value.amount' } } },
            ]),
            TransactionModel.aggregate<TxAgg>([
                { $match: txFilter },
                { $group: { _id: null, totalValue: { $sum: '$value.amount' } } },
            ]),
        ]);

        const countryTxValue = countryTxAgg[0]?.totalValue ?? 0;
        const globalTxValue = globalTxAgg[0]?.totalValue ?? 0;
        const txValueShare = globalTxValue > 0 ? countryTxValue / globalTxValue : 0;

        // Dollarization index — from Allium corridor snapshots for the period:
        // usdStablecoinVolume / totalUsdVolume across all outbound corridors.
        const periodMatch = month
            ? { period: `${year}-${String(month).padStart(2, '0')}` }
            : { period: { $gte: `${year}-01`, $lte: `${year}-12` } };

        interface CorridorDollarizationAgg { totalUsdVolume: number; usdStablecoinVolume: number }
        const [dollarizationAgg] = await TransactionModel.aggregate<CorridorDollarizationAgg>([
            {
                $match: {
                    type: 'corridor',
                    source: 'allium',
                    senderCountryId: countryId,
                    ...periodMatch,
                },
            },
            {
                $group: {
                    _id: null,
                    totalUsdVolume: { $sum: '$value.amount' },
                    usdStablecoinVolume: { $sum: '$usdStablecoinVolume' },
                },
            },
        ]);
        const dollarizationIndex =
            dollarizationAgg && dollarizationAgg.totalUsdVolume > 0
                ? dollarizationAgg.usdStablecoinVolume / dollarizationAgg.totalUsdVolume
                : 0;

        const adoptionRate =
            countryDoc.population && countryDoc.population > 0
                ? activeWallets / countryDoc.population
                : 0;

        // Compliant issuers
        const regulatedIssuerIds = countryDoc.regulatedIssuerIds ?? [];
        const issuerDocs =
            regulatedIssuerIds.length > 0
                ? await IssuerModel.find({
                      issuerId: { $in: regulatedIssuerIds },
                  }).lean()
                : [];

        // Licenses
        const licenseDocs = await LicenseModel.find({ countryId }).lean();

        // Reserve types
        const regulatedReserveTypes = countryDoc.regulatedReserveTypes ?? [];
        const reserveTypeDocs =
            regulatedReserveTypes.length > 0
                ? await ReserveTypeModel.find({
                      reserveType: { $in: regulatedReserveTypes },
                  }).lean()
                : [];

        return {
            countryId: countryDoc.countryId,
            name: countryDoc.name,
            region: countryDoc.region,
            adoptionRate: parseFloat(adoptionRate.toFixed(6)),
            activeWallets,
            txValueShare: parseFloat(txValueShare.toFixed(6)),
            dollarizationIndex: parseFloat(dollarizationIndex.toFixed(6)),
            compliantIssuers: issuerDocs.map((d) => ({
                issuerId: d.issuerId,
                name: d.name,
                originCountry: d.originCountry,
            })),
            licenses: licenseDocs.map((d) => ({
                licenseId: d.licenseId,
                name: d.name,
                type: d.type,
                countryId: d.countryId,
            })),
            reserveTypes: reserveTypeDocs.map((d) => ({
                reserveType: d.reserveType as ReserveTypeCodeValue,
                description: d.description,
            })),
        };
    }

    // ------------------------------------------------------------------
    // Country corridor breakdown
    // ------------------------------------------------------------------
    async getCountryCorridors(params: CountryCorridorsParams): Promise<CountryCorridorBreakdown> {
        const { countryId, year, month, referenceAsset, direction, topStablecoins } = params;
        const { start, end } = periodBoundaries(year, month);
        const topN = topStablecoins ?? 3;

        let stablecoinIds: string[] | null = null;
        if (referenceAsset) {
            const coins = await StablecoinModel.find({ referenceAsset }).lean();
            stablecoinIds = coins.map((c) => c.stablecoinId);
        }

        const baseTxFilter: Record<string, unknown> = {
            date: { $gte: start, $lte: end },
        };
        if (stablecoinIds) baseTxFilter['stablecoinId'] = { $in: stablecoinIds };

        interface FlowAgg {
            _id: { partner: string };
            totalValue: number;
            stablecoins: { stablecoinId: string; value: number }[];
        }

        const buildFlows = async (
            matchFilter: Record<string, unknown>,
            groupKey: string,
        ): Promise<CorridorFlow[]> => {
            const rows = await TransactionModel.aggregate<FlowAgg>([
                { $match: { ...baseTxFilter, ...matchFilter } },
                {
                    $group: {
                        _id: { partner: `$${groupKey}` },
                        totalValue: { $sum: '$value.amount' },
                        stablecoins: {
                            $push: { stablecoinId: '$stablecoinId', value: '$value.amount' },
                        },
                    },
                },
                { $sort: { totalValue: -1 } },
            ]);

            const allScIds = [...new Set(rows.flatMap((r) => r.stablecoins.map((s) => s.stablecoinId)))];
            const scDocs = await StablecoinModel.find({ stablecoinId: { $in: allScIds } }).lean();
            const scNameMap = new Map(scDocs.map((s) => [s.stablecoinId, s.name]));
            const usdCoinSet = new Set(
                scDocs.filter((s) => s.referenceAsset === 'USD').map((s) => s.stablecoinId),
            );

            return rows.map((r): CorridorFlow => {
                const scMap = r.stablecoins.reduce<Map<string, number>>((acc, s) => {
                    acc.set(s.stablecoinId, (acc.get(s.stablecoinId) ?? 0) + s.value);
                    return acc;
                }, new Map());

                const usdVal = Array.from(scMap.entries())
                    .filter(([id]) => usdCoinSet.has(id))
                    .reduce((sum, [, v]) => sum + v, 0);

                const top: StablecoinShare[] = Array.from(scMap.entries())
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, topN)
                    .map(([id, val]) => ({
                        stablecoinId: id,
                        name: scNameMap.get(id) ?? id,
                        share: r.totalValue > 0 ? val / r.totalValue : 0,
                    }));

                const isInflow = groupKey === 'senderCountryId';

                return {
                    from: isInflow ? r._id.partner : countryId,
                    to: isInflow ? countryId : r._id.partner,
                    value: { amount: parseFloat(r.totalValue.toFixed(2)), currency: 'USD' },
                    dollarizationIndex: r.totalValue > 0 ? usdVal / r.totalValue : 0,
                    topStablecoins: top,
                };
            });
        };

        const includeInflows = direction === 'both' || direction === 'inflow' || !direction;
        const includeOutflows = direction === 'both' || direction === 'outflow' || !direction;

        const [inflows, outflows] = await Promise.all([
            includeInflows
                ? buildFlows({ receiverCountryId: countryId }, 'senderCountryId')
                : Promise.resolve<CorridorFlow[]>([]),
            includeOutflows
                ? buildFlows({ senderCountryId: countryId }, 'receiverCountryId')
                : Promise.resolve<CorridorFlow[]>([]),
        ]);

        // Enrich flows with partner country names
        const partnerIds = [
            ...new Set([
                ...inflows.map((f) => f.from),
                ...outflows.map((f) => f.to),
            ]),
        ].filter((id) => id !== countryId);

        const partnerDocs = await CountryModel.find(
            { countryId: { $in: partnerIds } },
            { countryId: 1, name: 1 },
        ).lean();
        const nameMap = new Map(partnerDocs.map((d) => [d.countryId, d.name]));

        const selfDoc = await CountryModel.findOne({ countryId }, { name: 1 }).lean();
        const selfName = selfDoc?.name ?? countryId;

        const enrich = (f: CorridorFlow): CorridorFlow => ({
            ...f,
            fromName: nameMap.get(f.from) ?? (f.from === countryId ? selfName : f.from),
            toName: nameMap.get(f.to) ?? (f.to === countryId ? selfName : f.to),
        });

        return { countryId, inflows: inflows.map(enrich), outflows: outflows.map(enrich) };
    }
}
