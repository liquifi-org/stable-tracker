import { Request, Response, NextFunction } from 'express';
import type { ListCountriesUseCase } from '../../../application/use-cases/countries/ListCountriesUseCase';
import type { GetCountryUseCase } from '../../../application/use-cases/countries/GetCountryUseCase';
import type { ListCountryRegulatedIssuersUseCase } from '../../../application/use-cases/countries/ListCountryRegulatedIssuersUseCase';
import type { ListCountryRegulatedReserveTypesUseCase } from '../../../application/use-cases/countries/ListCountryRegulatedReserveTypesUseCase';
import type { ListCountryLicensesUseCase } from '../../../application/use-cases/countries/ListCountryLicensesUseCase';
import {
    ListCountriesSchema,
    CountryIdParamSchema,
} from '../validators/countryValidators';

export class CountryController {
    constructor(
        private readonly listCountries: ListCountriesUseCase,
        private readonly getCountry: GetCountryUseCase,
        private readonly listRegulatedIssuers: ListCountryRegulatedIssuersUseCase,
        private readonly listRegulatedReserveTypes: ListCountryRegulatedReserveTypesUseCase,
        private readonly listLicenses: ListCountryLicensesUseCase,
    ) {}

    list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const query = ListCountriesSchema.parse(req.query);
            const result = await this.listCountries.execute(query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { countryId } = CountryIdParamSchema.parse(req.params);
            const result = await this.getCountry.execute(countryId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    getRegulatedIssuers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { countryId } = CountryIdParamSchema.parse(req.params);
            const result = await this.listRegulatedIssuers.execute(countryId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    getRegulatedReserveTypes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { countryId } = CountryIdParamSchema.parse(req.params);
            const result = await this.listRegulatedReserveTypes.execute(countryId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    getLicenses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { countryId } = CountryIdParamSchema.parse(req.params);
            const result = await this.listLicenses.execute(countryId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}
