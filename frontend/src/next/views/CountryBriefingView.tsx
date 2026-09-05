import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { DataTable } from '../../app/components/DataTable';
import { CountryFlag } from '../../app/components/CountryFlag';
import {
  ArrowLeft, CheckCircle2, Loader2, XCircle, MinusCircle, Banknote, Coins, Gem, Cpu,
  ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react';
import {
  api,
  resolveToNumericId,
  type ApiCountry,
  type ApiIssuer,
  type ApiLicense,
  type ApiReserveType,
  type CountryOverview,
  type CountryCorridorBreakdown,
  type CountryAdoptionMetric,
  type CorridorFlow,
} from '../../app/services/api';
import { useFilters, getPreviousPeriod, MONTHS } from '../../app/context/FilterContext';
import { useCurrencyFormat } from '../../app/hooks/useCurrencyFormat';
import { TrendBadge } from '../../app/components/TrendBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../app/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '../../app/components/ui/tooltip';
import { classifyMarket, stageLabel } from '../lib/marketType';
import { fmtPct, fmtPer100k } from '../lib/format';
import { TokenMixBar } from '../components/TokenMixBar';
import { canonicalCountrySlug, countryDisplayName, prettyCountryName } from '../../app/lib/countryRoutes';
import { SEO, usePageMeta } from '../lib/seo';

const ISSUER_DOMAINS: Record<string, string> = {
  tether: 'tether.to',
  circle: 'circle.com',
  makerdao: 'makerdao.com',
  maker: 'makerdao.com',
  sky: 'sky.money',
  paxos: 'paxos.com',
  binance: 'binance.com',
  coinbase: 'coinbase.com',
  paypal: 'paypal.com',
  ripple: 'ripple.com',
  gemini: 'gemini.com',
  'first digital': 'firstdigital.com',
  frax: 'frax.finance',
  aave: 'aave.com',
  curve: 'curve.fi',
  angle: 'angle.money',
  agora: 'agora.finance',
  ondo: 'ondo.finance',
  reserve: 'reserve.org',
  bitfinex: 'bitfinex.com',
  kraken: 'kraken.com',
  trueusd: 'trueusd.com',
  'true usd': 'trueusd.com',
  stasis: 'stasis.net',
  monerium: 'monerium.com',
  anchored: 'anchored-coins.com',
  societe: 'societegenerale.com',
  'société générale': 'societegenerale.com',
};

function getIssuerDomain(name: string): string | null {
  const lower = name.toLowerCase();
  for (const [keyword, domain] of Object.entries(ISSUER_DOMAINS)) {
    if (lower.includes(keyword)) return domain;
  }
  return null;
}

function IssuerLogo({ name }: { name: string }) {
  const [failed, setFailed] = useState(false);
  const domain = getIssuerDomain(name);
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  if (domain && !failed) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt={name}
        onError={() => setFailed(true)}
        className="w-6 h-6 rounded-full object-contain bg-white border border-slate-200 dark:border-neutral-600 shrink-0 p-0.5"
      />
    );
  }
  return (
    <div
      className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
      style={{ backgroundColor: 'var(--brand)' }}
    >
      {initials}
    </div>
  );
}

const RESERVE_TYPE_DEFS: {
  key: 'fiatBacked' | 'cryptoBacked' | 'commodityBacked' | 'algorithmBacked';
  alertKey: 'fiatAlert' | 'cryptoAlert' | 'commodityAlert' | 'algorithmAlert';
  label: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { key: 'fiatBacked', alertKey: 'fiatAlert', label: 'Fiat-backed', Icon: Banknote },
  { key: 'cryptoBacked', alertKey: 'cryptoAlert', label: 'Crypto-backed', Icon: Coins },
  { key: 'commodityBacked', alertKey: 'commodityAlert', label: 'Commodity-backed', Icon: Gem },
  { key: 'algorithmBacked', alertKey: 'algorithmAlert', label: 'Algorithm-backed', Icon: Cpu },
];

const EU_COUNTRY_ID = 999;

function mergeUnique<T>(own: T[], extra: T[], keyFn: (item: T) => string | number): T[] {
  const seen = new Set(own.map(keyFn));
  return [...own, ...extra.filter((item) => !seen.has(keyFn(item)))];
}

function pctChange(current: number, previous: number): number | null {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

export function CountryBriefingView() {
  const { countrySlug, countryCode } = useParams<{ countrySlug?: string; countryCode?: string }>();
  const param = countrySlug ?? countryCode;
  const navigate = useNavigate();
  const location = useLocation();
  const filters = useFilters();
  const { formatCurrency } = useCurrencyFormat();
  const periodLabel = `${MONTHS[filters.month - 1]} ${filters.year}`;
  const navState = (location.state as { name?: string; isoAlpha2?: string } | null) ?? null;
  const numericId = param && !/^\d+$/.test(param) ? resolveToNumericId(param) : null;
  const previousPeriod = getPreviousPeriod(filters.year, filters.month);

  const [overview, setOverview] = useState<CountryOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [corridors, setCorridors] = useState<CountryCorridorBreakdown | null>(null);
  const [corridorsLoading, setCorridorsLoading] = useState(false);
  const [previousOverview, setPreviousOverview] = useState<CountryOverview | null>(null);
  const [previousCorridors, setPreviousCorridors] = useState<CountryCorridorBreakdown | null>(null);
  const [adoptionRow, setAdoptionRow] = useState<CountryAdoptionMetric | null>(null);
  const [globalCorridors, setGlobalCorridors] = useState<CorridorFlow[]>([]);
  const [licensesDialogOpen, setLicensesDialogOpen] = useState(false);
  const LICENSE_PREVIEW = 4;
  const [regulatoryLoading, setRegulatoryLoading] = useState(false);
  const [apiRegulatory, setApiRegulatory] = useState<{
    countryDetail: ApiCountry | null;
    issuers: ApiIssuer[];
    licenses: ApiLicense[];
    reserveTypes: ApiReserveType[];
  } | null>(null);

  useEffect(() => {
    if (!numericId) return;
    const id = String(numericId);
    setOverviewLoading(true);
    api.getCountryOverview(numericId, filters.year, filters.month)
      .then(setOverview)
      .catch(() => setOverview(null))
      .finally(() => setOverviewLoading(false));
    setCorridorsLoading(true);
    api.getCountryCorridors(numericId, filters.year, filters.month)
      .then(setCorridors)
      .catch(() => setCorridors(null))
      .finally(() => setCorridorsLoading(false));
    api.getAdoptionAnalytics(filters.year, filters.month)
      .then((rows) => setAdoptionRow(rows.find((r) => r.countryId === id) ?? null))
      .catch(() => setAdoptionRow(null));
    api.getCorridors(filters.year, filters.month)
      .then((flows) => setGlobalCorridors(flows.filter((f) => f.from === id || f.to === id)))
      .catch(() => setGlobalCorridors([]));
  }, [numericId, filters.year, filters.month]);

  useEffect(() => {
    if (!numericId) return;
    api.getCountryOverview(numericId, previousPeriod.year, previousPeriod.month)
      .then(setPreviousOverview)
      .catch(() => setPreviousOverview(null));
    api.getCountryCorridors(numericId, previousPeriod.year, previousPeriod.month)
      .then(setPreviousCorridors)
      .catch(() => setPreviousCorridors(null));
  }, [numericId, previousPeriod.year, previousPeriod.month]);

  useEffect(() => {
    if (!numericId) return;
    setRegulatoryLoading(true);
    setApiRegulatory(null);
    Promise.all([
      api.getCountry(numericId),
      api.getCountryIssuers(numericId),
      api.getCountryLicenses(numericId),
      api.getCountryReserveTypes(numericId),
    ])
      .then(async ([countryDetail, issuers, licenses, reserveTypes]) => {
        if (countryDetail.region === 'EU' && numericId !== EU_COUNTRY_ID) {
          const [euIssuers, euLicenses] = await Promise.all([
            api.getCountryIssuers(EU_COUNTRY_ID).catch(() => []),
            api.getCountryLicenses(EU_COUNTRY_ID).catch(() => []),
          ]);
          issuers = mergeUnique(issuers, euIssuers, (i) => i.issuerId);
          licenses = mergeUnique(licenses, euLicenses, (l) => l.licenseId);
        }
        setApiRegulatory({ countryDetail, issuers, licenses, reserveTypes });
      })
      .catch(() => setApiRegulatory(null))
      .finally(() => setRegulatoryLoading(false));
  }, [numericId]);

  const totalInbound = useMemo(
    () => (corridors?.inflows ?? []).reduce((sum, f) => sum + f.value.amount, 0),
    [corridors],
  );
  const totalOutbound = useMemo(
    () => (corridors?.outflows ?? []).reduce((sum, f) => sum + f.value.amount, 0),
    [corridors],
  );
  const previousTotalInbound = useMemo(
    () => (previousCorridors?.inflows ?? []).reduce((sum, f) => sum + f.value.amount, 0),
    [previousCorridors],
  );
  const previousTotalOutbound = useMemo(
    () => (previousCorridors?.outflows ?? []).reduce((sum, f) => sum + f.value.amount, 0),
    [previousCorridors],
  );

  const remittanceRatio =
    adoptionRow?.remittancesSent && adoptionRow.remittancesSent > 0
      ? totalOutbound / adoptionRow.remittancesSent
      : null;

  const market = overview
    ? classifyMarket({
        dollarization: overview.dollarizationIndex,
        remittanceRatio,
        stage: apiRegulatory?.countryDetail?.stage,
        activeWallets: overview.activeWallets,
        adoptionRate: overview.adoptionRate,
      })
    : null;

  const tokenMix = useMemo(() => {
    const map = new Map<string, number>();
    let accounted = 0;
    let total = 0;
    for (const flow of globalCorridors) {
      total += flow.value.amount;
      for (const t of flow.topStablecoins ?? []) {
        const vol = flow.value.amount * t.share;
        accounted += vol;
        map.set(t.name, (map.get(t.name) ?? 0) + vol);
      }
    }
    const items = Array.from(map.entries()).map(([name, volume]) => ({ name, volume }));
    if (total - accounted > 0) items.push({ name: 'Other', volume: total - accounted });
    return items;
  }, [globalCorridors]);

  const isoName = numericId != null ? countryDisplayName(numericId) : null;
  const rawName = overview?.name ?? apiRegulatory?.countryDetail?.name ?? navState?.name ?? isoName;
  const name =
    prettyCountryName({
      countryId: numericId ?? undefined,
      isoAlpha2: overview?.isoAlpha2 ?? navState?.isoAlpha2,
      name: rawName,
    }) || (numericId != null ? `Country ${numericId}` : 'Unknown country');
  const iso = overview?.isoAlpha2 ?? navState?.isoAlpha2;
  const canonicalSlug = canonicalCountrySlug({
    countryId: numericId ?? undefined,
    name,
    isoAlpha2: iso,
  });

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  usePageMeta(
    numericId
      ? {
          title: `${name} stablecoin usage and regulation · ${SEO.site}`,
          description: `${name} stablecoin usage, international corridor volume, wallets per 100k people, and regulatory framework. World Bank remittances.`,
          path: canonicalSlug ? `/country/${canonicalSlug}` : `/country/${param}`,
          jsonLd: [
            {
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Overview', item: `${origin}/` },
                { '@type': 'ListItem', position: 2, name, item: `${origin}/country/${canonicalSlug ?? param}` },
              ],
            },
            {
              '@context': 'https://schema.org',
              '@type': 'Dataset',
              name: `${name} stablecoin usage`,
              description: `Country briefing for ${name}: adoption, corridors, and regulation.`,
              spatialCoverage: { '@type': 'Country', name },
              url: `${origin}/country/${canonicalSlug ?? param}`,
            },
          ],
        }
      : {
          title: `Country not found · ${SEO.site}`,
          description: 'This country briefing could not be resolved.',
          path: param ? `/country/${param}` : '/',
        },
  );

  if (!numericId) return <div>Country not found</div>;

  const rankDelta =
    overview?.adoptionRank != null && previousOverview?.adoptionRank != null
      ? previousOverview.adoptionRank - overview.adoptionRank
      : null;
  const walletsChangePct =
    overview && previousOverview ? pctChange(overview.activeWallets, previousOverview.activeWallets) : null;
  const dollarizationChangePp =
    overview && previousOverview
      ? (overview.dollarizationIndex - previousOverview.dollarizationIndex) * 100
      : null;

  const partnerColumns = [
    { key: 'partner', header: 'Partner' },
    {
      key: 'amount',
      header: 'Volume',
      render: (v: number) => formatCurrency(v),
    },
  ];
  const outflows = (corridors?.outflows ?? []).map((f) => ({
    partner: f.toName ?? f.to,
    amount: f.value.amount,
  }));
  const inflows = (corridors?.inflows ?? []).map((f) => ({
    partner: f.fromName ?? f.from,
    amount: f.value.amount,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-[var(--paper)] rounded-full transition-ui text-[var(--muted-ink)] border border-[var(--hairline)]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <nav className="kicker mb-1.5" aria-label="Breadcrumb">
            <ol className="flex items-center">
              <li>
                <button type="button" onClick={() => navigate('/')} className="hover:text-[var(--brand)] transition-ui">
                  Overview
                </button>
              </li>
              <li className="mx-1.5 font-normal tracking-normal" aria-hidden="true">/</li>
              <li aria-current="page">{name}</li>
            </ol>
          </nav>
          <h1 className="display text-[2rem] sm:text-[2.35rem] text-[var(--ink-text)] flex items-center gap-3">
            {iso && <CountryFlag isoAlpha2={iso} className="w-8 h-8 rounded-sm" />}
            {name}
          </h1>
          <p className="text-sm text-[var(--muted-ink)] mt-1">{periodLabel} briefing</p>
        </div>
      </div>

      {market && (
        <div className="surface p-5 flex flex-wrap items-start gap-3">
          <span className="kicker px-2.5 py-1 rounded-full bg-[var(--ink)] text-[var(--paper)] tracking-[0.12em]">
            {market.label}
          </span>
          <p className="text-[15px] leading-relaxed text-[var(--ink-text)] flex-1 min-w-[16rem]">{market.reason}</p>
        </div>
      )}

      <section className="space-y-3">
        <h3 className="kicker">Scale</h3>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <MetricCard
            label="Wallets per 100k people"
            hint="Wallets ÷ population. Rank only if >10k wallets."
            loading={overviewLoading}
            value={overview ? fmtPer100k(overview.adoptionRate) : '—'}
            sub={
              overview?.adoptionRank != null
                ? `#${overview.adoptionRank} of ${overview.eligibleCountries}`
                : 'Unranked (<10k wallets)'
            }
            trend={rankDelta}
            trendFormat={(v) => String(v)}
          />
          <MetricCard
            label="Wallets holding stablecoins"
            loading={overviewLoading}
            value={overview ? overview.activeWallets.toLocaleString() : '—'}
            sub={overview ? `${fmtPct(overview.adoptionRate)} of population` : undefined}
            trend={walletsChangePct}
            trendFormat={(v) => `${v.toFixed(1)}%`}
          />
          <MetricCard
            label="Share of global TX value"
            hint="This country's outbound TX ÷ global TX."
            loading={overviewLoading}
            value={overview ? fmtPct(overview.txValueShare) : '—'}
          />
          <MetricCard
            label="Vs official remittances"
            hint="Outbound corridors ÷ World Bank remittances sent (annual / 12)."
            loading={corridorsLoading}
            value={remittanceRatio != null ? fmtPct(remittanceRatio) : '—'}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="kicker">Money</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MetricCard
            label="Out"
            loading={corridorsLoading}
            value={totalOutbound > 0 ? formatCurrency(totalOutbound) : '—'}
            trend={pctChange(totalOutbound, previousTotalOutbound)}
            trendFormat={(v) => `${v.toFixed(1)}%`}
          />
          <MetricCard
            label="In"
            loading={corridorsLoading}
            value={totalInbound > 0 ? formatCurrency(totalInbound) : '—'}
            trend={pctChange(totalInbound, previousTotalInbound)}
            trendFormat={(v) => `${v.toFixed(1)}%`}
          />
          <MetricCard
            label="USD-referenced share"
            hint="Share of corridor USD volume in USD-referenced stablecoins."
            loading={overviewLoading}
            value={overview && overview.dollarizationIndex > 0 ? fmtPct(overview.dollarizationIndex) : '—'}
            trend={dollarizationChangePp}
            trendFormat={(v) => `${v.toFixed(2)}pp`}
          />
        </div>
        <div className="surface p-5">
          <h4 className="display text-xl mb-3">Token mix on this country's corridors</h4>
          <TokenMixBar items={tokenMix} formatVolume={formatCurrency} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h4 className="display text-lg mb-3 flex items-center gap-2">
              <ArrowUpFromLine className="w-4 h-4 text-[var(--brand)]" /> Out to
            </h4>
            {corridorsLoading ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm p-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : outflows.length > 0 ? (
              <DataTable data={outflows} columns={partnerColumns} paginate={false} defaultSortKey="amount" defaultSortDirection="desc" />
            ) : (
              <Empty>No outflow corridors</Empty>
            )}
          </div>
          <div>
            <h4 className="display text-lg mb-3 flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-[var(--brand)]" /> In from
            </h4>
            {corridorsLoading ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm p-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : inflows.length > 0 ? (
              <DataTable data={inflows} columns={partnerColumns} paginate={false} defaultSortKey="amount" defaultSortDirection="desc" />
            ) : (
              <Empty>No inflow corridors</Empty>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="kicker">Rules</h3>
          {apiRegulatory?.countryDetail && (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 dark:bg-neutral-700">
              {stageLabel(apiRegulatory.countryDetail.stage)}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">Regulatory status does not move with the month slider.</p>
        <div className="surface p-5 sm:p-6 space-y-4">
          {apiRegulatory?.countryDetail && (
            <div className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
              {apiRegulatory.countryDetail.regulatorName && (
                <p>
                  Regulator:{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {apiRegulatory.countryDetail.regulatorName}
                  </span>
                </p>
              )}
              {apiRegulatory.countryDetail.regulatorDescription && (
                <p>{apiRegulatory.countryDetail.regulatorDescription}</p>
              )}
              {apiRegulatory.countryDetail.currency && (
                <p>
                  Currency:{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {apiRegulatory.countryDetail.currency}
                  </span>
                </p>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-semibold mb-3">Authorized issuers</h4>
              {regulatoryLoading ? (
                <Spinner />
              ) : apiRegulatory?.issuers && apiRegulatory.issuers.length > 0 ? (
                <div className="space-y-2">
                  {apiRegulatory.issuers.map((issuer) => (
                    <div key={issuer.issuerId} className="flex items-center gap-2 text-sm">
                      <IssuerLogo name={issuer.name} />
                      <span>{issuer.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">None listed</p>
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Licenses</h4>
              {regulatoryLoading ? (
                <Spinner />
              ) : apiRegulatory?.licenses && apiRegulatory.licenses.length > 0 ? (
                <>
                  {apiRegulatory.licenses.slice(0, LICENSE_PREVIEW).map((license) => (
                    <div key={license.licenseId} className="flex items-start gap-2 text-sm mb-2">
                      <CheckCircle2 className="w-4 h-4 text-[var(--brand)] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">{license.name}</span>
                        {license.type && <p className="text-xs text-slate-400">{license.type}</p>}
                      </div>
                    </div>
                  ))}
                  {apiRegulatory.licenses.length > LICENSE_PREVIEW && (
                    <button
                      onClick={() => setLicensesDialogOpen(true)}
                      className="text-xs text-[var(--brand)] hover:underline"
                    >
                      Show {apiRegulatory.licenses.length - LICENSE_PREVIEW} more…
                    </button>
                  )}
                  <Dialog open={licensesDialogOpen} onOpenChange={setLicensesDialogOpen}>
                    <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
                      <DialogHeader>
                        <DialogTitle>Licenses</DialogTitle>
                      </DialogHeader>
                      <div className="overflow-y-auto flex-1 space-y-3 pr-1">
                        {apiRegulatory.licenses.map((license) => (
                          <div key={license.licenseId} className="flex items-start gap-3 text-sm border-b border-slate-100 dark:border-neutral-700 pb-3 last:border-0">
                            <CheckCircle2 className="w-4 h-4 text-[var(--brand)] shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium">{license.name}</p>
                              {license.type && <p className="text-xs text-slate-400">{license.type}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              ) : (
                <p className="text-sm text-slate-400">None listed</p>
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3">Reserve types</h4>
              {regulatoryLoading ? (
                <Spinner />
              ) : apiRegulatory?.countryDetail ? (
                <div className="space-y-2">
                  {RESERVE_TYPE_DEFS.map(({ key, alertKey, label, Icon }) => {
                    const cd = apiRegulatory.countryDetail!;
                    const value = cd[key];
                    const alert = cd[alertKey];
                    const StatusIcon = value === 1 ? CheckCircle2 : value === 0 ? XCircle : MinusCircle;
                    const statusCls =
                      value === 1 ? 'text-green-500' : value === 0 ? 'text-red-500' : 'text-slate-300 dark:text-slate-600';
                    return (
                      <div key={key} className="flex items-center gap-2 text-sm">
                        <Icon className="w-4 h-4 text-purple-500 shrink-0" />
                        <span className="flex-1">{label}</span>
                        {alert ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex shrink-0 cursor-help">
                                <StatusIcon className={`w-4 h-4 ${statusCls}`} />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">{alert}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <StatusIcon className={`w-4 h-4 ${statusCls} shrink-0`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No reserve type data</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  hint,
  value,
  sub,
  loading,
  trend,
  trendFormat,
}: {
  label: string;
  hint?: string;
  value: string;
  sub?: string;
  loading?: boolean;
  trend?: number | null;
  trendFormat?: (v: number) => string;
}) {
  return (
    <div className="surface p-4">
      <div className="kicker mb-1" title={hint}>
        {label}
      </div>
      <div className="flex items-center gap-2 text-[1.35rem] font-semibold tabular-nums tracking-tight">
        {loading ? <Loader2 className="w-5 h-5 animate-spin text-[var(--muted-ink)]" /> : value}
        {trendFormat && <TrendBadge value={trend ?? null} format={trendFormat} showPeriod />}
      </div>
      {sub && <div className="text-xs text-[var(--muted-ink)] mt-1">{sub}</div>}
    </div>
  );
}

function Empty({ children }: { children: string }) {
  return (
    <div className="surface p-6 text-center text-sm text-[var(--muted-ink)]">
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="text-sm text-slate-400 flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading…
    </div>
  );
}
