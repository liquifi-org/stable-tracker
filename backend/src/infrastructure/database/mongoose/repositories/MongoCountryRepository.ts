import { ISO_COUNTRIES } from '../../../../../script/shared/iso3166';
import { CountryModel } from '../models/CountryModel';
import { IssuerModel } from '../models/IssuerModel';
import { LicenseModel } from '../models/LicenseModel';
import { ReserveTypeModel } from '../models/ReserveTypeModel';
import { publicCountryName } from '../../../../util/countryName';
import type {
    ICountryRepository,
    FindCountriesParams,
} from '../../../../domain/repositories/ICountryRepository';
import type { PaginatedResult } from '../../../../shared/types/Pagination';
import { Country } from '../../../../domain/entities/Country';
import { Issuer } from '../../../../domain/entities/Issuer';
import { License } from '../../../../domain/entities/License';
import { ReserveType } from '../../../../domain/entities/ReserveType';
import { buildPaginatedResult } from '../../../../shared/types/Pagination';
import { parseSortParam } from '../utils/queryUtils';
import type { ReserveTypeCodeValue } from '../../../../domain/value-objects/ReserveTypeCode';

const NUMERIC_TO_ALPHA2 = new Map<string, string>(ISO_COUNTRIES.map((c) => [c.numeric, c.alpha2]));

export class MongoCountryRepository implements ICountryRepository {
    async findAll(params: FindCountriesParams): Promise<PaginatedResult<Country>> {
        const { page, pageSize, region, q, sort } = params;
        const filter: Record<string, unknown> = {};

        if (region) filter['region'] = region;
        if (q) filter['$text'] = { $search: q };

        const skip = (page - 1) * pageSize;
        const sortObj = parseSortParam(sort);

        const [docs, total] = await Promise.all([
            CountryModel.find(filter).sort(sortObj).skip(skip).limit(pageSize).lean(),
            CountryModel.countDocuments(filter),
        ]);

        const items = docs.map(
            (d) =>
                new Country({
                    countryId: d.countryId,
                    isoAlpha2: NUMERIC_TO_ALPHA2.get(d.countryId),
                    name: publicCountryName(d.countryId, d.name),
                    region: d.region,
                    population: d.population,
                    regulatedIssuerIds: d.regulatedIssuerIds ?? [],
                    regulatedReserveTypes: d.regulatedReserveTypes ?? [],
                    stage: d.stage,
                    regulatorName: d.regulatorName,
                    regulatorDescription: d.regulatorDescription,
                    description: d.description,
                    currency: d.currency,
                    fiatBacked: d.fiatBacked,
                    fiatAlert: d.fiatAlert,
                    cryptoBacked: d.cryptoBacked,
                    cryptoAlert: d.cryptoAlert,
                    commodityBacked: d.commodityBacked,
                    commodityAlert: d.commodityAlert,
                    algorithmBacked: d.algorithmBacked,
                    algorithmAlert: d.algorithmAlert,
                    isStablecoinSpecific: d.isStablecoinSpecific !== undefined
                        ? Number(d.isStablecoinSpecific)
                        : undefined,
                }),
        );

        return buildPaginatedResult(items, total, page, pageSize);
    }

    async findById(countryId: string): Promise<Country | null> {
        const doc = await CountryModel.findOne({ countryId }).lean();
        if (!doc) return null;
        return new Country({
            countryId: doc.countryId,
            isoAlpha2: NUMERIC_TO_ALPHA2.get(doc.countryId),
            name: publicCountryName(doc.countryId, doc.name),
            region: doc.region,
            population: doc.population,
            regulatedIssuerIds: doc.regulatedIssuerIds ?? [],
            regulatedReserveTypes: doc.regulatedReserveTypes ?? [],
            stage: doc.stage,
            regulatorName: doc.regulatorName,
            regulatorDescription: doc.regulatorDescription,
            description: doc.description,
            currency: doc.currency,
            fiatBacked: doc.fiatBacked,
            fiatAlert: doc.fiatAlert,
            cryptoBacked: doc.cryptoBacked,
            cryptoAlert: doc.cryptoAlert,
            commodityBacked: doc.commodityBacked,
            commodityAlert: doc.commodityAlert,
            algorithmBacked: doc.algorithmBacked,
            algorithmAlert: doc.algorithmAlert,
            isStablecoinSpecific: doc.isStablecoinSpecific !== undefined
                ? Number(doc.isStablecoinSpecific)
                : undefined,
        });
    }

    async findRegulatedIssuers(countryId: string): Promise<Issuer[]> {
        const countryDoc = await CountryModel.findOne({ countryId }).lean();
        if (!countryDoc || !countryDoc.regulatedIssuerIds?.length) return [];

        const docs = await IssuerModel.find({
            issuerId: { $in: countryDoc.regulatedIssuerIds },
        }).lean();

        return docs.map(
            (d) => new Issuer({ issuerId: d.issuerId, name: d.name, originCountry: d.originCountry }),
        );
    }

    async findRegulatedReserveTypes(countryId: string): Promise<ReserveType[]> {
        const countryDoc = await CountryModel.findOne({ countryId }).lean();
        if (!countryDoc || !countryDoc.regulatedReserveTypes?.length) return [];

        const docs = await ReserveTypeModel.find({
            reserveType: { $in: countryDoc.regulatedReserveTypes },
        }).lean();

        return docs.map(
            (d) => new ReserveType({ reserveType: d.reserveType as ReserveTypeCodeValue, description: d.description }),
        );
    }

    async findLicenses(countryId: string): Promise<License[]> {
        const docs = await LicenseModel.find({ countryId }).lean();
        return docs.map(
            (d) =>
                new License({
                    licenseId: d.licenseId,
                    name: d.name,
                    type: d.type,
                    countryId: d.countryId,
                }),
        );
    }
}
