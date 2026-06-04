import { CountryModel } from '../models/CountryModel';
import { IssuerModel } from '../models/IssuerModel';
import { LicenseModel } from '../models/LicenseModel';
import { ReserveTypeModel } from '../models/ReserveTypeModel';
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
                    name: d.name,
                    region: d.region,
                    population: d.population,
                    regulatedIssuerIds: d.regulatedIssuerIds ?? [],
                    regulatedReserveTypes: d.regulatedReserveTypes ?? [],
                }),
        );

        return buildPaginatedResult(items, total, page, pageSize);
    }

    async findById(countryId: string): Promise<Country | null> {
        const doc = await CountryModel.findOne({ countryId }).lean();
        if (!doc) return null;
        return new Country({
            countryId: doc.countryId,
            name: doc.name,
            region: doc.region,
            population: doc.population,
            regulatedIssuerIds: doc.regulatedIssuerIds ?? [],
            regulatedReserveTypes: doc.regulatedReserveTypes ?? [],
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
