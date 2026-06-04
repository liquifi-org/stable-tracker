// ---- Infrastructure repositories ----
import { MongoCountryRepository } from './infrastructure/database/mongoose/repositories/MongoCountryRepository';
import { MongoIssuerRepository } from './infrastructure/database/mongoose/repositories/MongoIssuerRepository';
import { MongoStablecoinRepository } from './infrastructure/database/mongoose/repositories/MongoStablecoinRepository';
import { MongoLicenseRepository } from './infrastructure/database/mongoose/repositories/MongoLicenseRepository';
import { MongoReserveTypeRepository } from './infrastructure/database/mongoose/repositories/MongoReserveTypeRepository';
import { MongoReferenceAssetRepository } from './infrastructure/database/mongoose/repositories/MongoReferenceAssetRepository';
import { MongoExchangeRateRepository } from './infrastructure/database/mongoose/repositories/MongoExchangeRateRepository';
import { MongoWalletRepository } from './infrastructure/database/mongoose/repositories/MongoWalletRepository';
import { MongoTransactionRepository } from './infrastructure/database/mongoose/repositories/MongoTransactionRepository';
import { MongoAnalyticsRepository } from './infrastructure/database/mongoose/repositories/MongoAnalyticsRepository';

// ---- Use cases ----
import { ListCountriesUseCase } from './application/use-cases/countries/ListCountriesUseCase';
import { GetCountryUseCase } from './application/use-cases/countries/GetCountryUseCase';
import { ListCountryRegulatedIssuersUseCase } from './application/use-cases/countries/ListCountryRegulatedIssuersUseCase';
import { ListCountryRegulatedReserveTypesUseCase } from './application/use-cases/countries/ListCountryRegulatedReserveTypesUseCase';
import { ListCountryLicensesUseCase } from './application/use-cases/countries/ListCountryLicensesUseCase';
import { ListIssuersUseCase } from './application/use-cases/issuers/ListIssuersUseCase';
import { GetIssuerUseCase } from './application/use-cases/issuers/GetIssuerUseCase';
import { ListStablecoinsUseCase } from './application/use-cases/stablecoins/ListStablecoinsUseCase';
import { GetStablecoinUseCase } from './application/use-cases/stablecoins/GetStablecoinUseCase';
import { ListLicensesUseCase } from './application/use-cases/licenses/ListLicensesUseCase';
import { ListReserveTypesUseCase } from './application/use-cases/reserve-types/ListReserveTypesUseCase';
import { ListReferenceAssetsUseCase } from './application/use-cases/reference-assets/ListReferenceAssetsUseCase';
import { ListExchangeRatesUseCase } from './application/use-cases/exchange-rates/ListExchangeRatesUseCase';
import { ListWalletsUseCase } from './application/use-cases/wallets/ListWalletsUseCase';
import { ListTransactionsUseCase } from './application/use-cases/transactions/ListTransactionsUseCase';
import { GetAdoptionAnalyticsUseCase } from './application/use-cases/analytics/GetAdoptionAnalyticsUseCase';
import { GetCorridorAnalyticsUseCase } from './application/use-cases/analytics/GetCorridorAnalyticsUseCase';
import { GetCountryOverviewUseCase } from './application/use-cases/analytics/GetCountryOverviewUseCase';
import { GetCountryCorridorsUseCase } from './application/use-cases/analytics/GetCountryCorridorsUseCase';

// ---- Controllers ----
import { CountryController } from './interfaces/http/controllers/CountryController';
import { IssuerController } from './interfaces/http/controllers/IssuerController';
import { StablecoinController } from './interfaces/http/controllers/StablecoinController';
import { LicenseController } from './interfaces/http/controllers/LicenseController';
import { ReserveTypeController } from './interfaces/http/controllers/ReserveTypeController';
import { ReferenceAssetController } from './interfaces/http/controllers/ReferenceAssetController';
import { ExchangeRateController } from './interfaces/http/controllers/ExchangeRateController';
import { WalletController } from './interfaces/http/controllers/WalletController';
import { TransactionController } from './interfaces/http/controllers/TransactionController';
import { AnalyticsController } from './interfaces/http/controllers/AnalyticsController';

// ---- Routers ----
import { createCountryRouter } from './interfaces/http/routes/countryRoutes';
import { createIssuerRouter } from './interfaces/http/routes/issuerRoutes';
import { createStablecoinRouter } from './interfaces/http/routes/stablecoinRoutes';
import { createLicenseRouter } from './interfaces/http/routes/licenseRoutes';
import { createReserveTypeRouter } from './interfaces/http/routes/reserveTypeRoutes';
import { createReferenceAssetRouter } from './interfaces/http/routes/referenceAssetRoutes';
import { createExchangeRateRouter } from './interfaces/http/routes/exchangeRateRoutes';
import { createWalletRouter } from './interfaces/http/routes/walletRoutes';
import { createTransactionRouter } from './interfaces/http/routes/transactionRoutes';
import { createAnalyticsRouter } from './interfaces/http/routes/analyticsRoutes';

import { Router } from 'express';

export function buildV1Router(): Router {
    // Repositories
    const countryRepo = new MongoCountryRepository();
    const issuerRepo = new MongoIssuerRepository();
    const stablecoinRepo = new MongoStablecoinRepository();
    const licenseRepo = new MongoLicenseRepository();
    const reserveTypeRepo = new MongoReserveTypeRepository();
    const referenceAssetRepo = new MongoReferenceAssetRepository();
    const exchangeRateRepo = new MongoExchangeRateRepository();
    const walletRepo = new MongoWalletRepository();
    const transactionRepo = new MongoTransactionRepository();
    const analyticsRepo = new MongoAnalyticsRepository();

    // Use cases
    const listCountries = new ListCountriesUseCase(countryRepo);
    const getCountry = new GetCountryUseCase(countryRepo);
    const listRegulatedIssuers = new ListCountryRegulatedIssuersUseCase(countryRepo);
    const listRegulatedReserveTypes = new ListCountryRegulatedReserveTypesUseCase(countryRepo);
    const listCountryLicenses = new ListCountryLicensesUseCase(countryRepo);

    const listIssuers = new ListIssuersUseCase(issuerRepo);
    const getIssuer = new GetIssuerUseCase(issuerRepo);

    const listStablecoins = new ListStablecoinsUseCase(stablecoinRepo);
    const getStablecoin = new GetStablecoinUseCase(stablecoinRepo);

    const listLicenses = new ListLicensesUseCase(licenseRepo);
    const listReserveTypes = new ListReserveTypesUseCase(reserveTypeRepo);
    const listReferenceAssets = new ListReferenceAssetsUseCase(referenceAssetRepo);
    const listExchangeRates = new ListExchangeRatesUseCase(exchangeRateRepo);
    const listWallets = new ListWalletsUseCase(walletRepo);
    const listTransactions = new ListTransactionsUseCase(transactionRepo);

    const getAdoptionAnalytics = new GetAdoptionAnalyticsUseCase(analyticsRepo);
    const getCorridorAnalytics = new GetCorridorAnalyticsUseCase(analyticsRepo);
    const getCountryOverview = new GetCountryOverviewUseCase(analyticsRepo);
    const getCountryCorridors = new GetCountryCorridorsUseCase(analyticsRepo);

    // Controllers
    const countryController = new CountryController(
        listCountries,
        getCountry,
        listRegulatedIssuers,
        listRegulatedReserveTypes,
        listCountryLicenses,
    );
    const issuerController = new IssuerController(listIssuers, getIssuer);
    const stablecoinController = new StablecoinController(listStablecoins, getStablecoin);
    const licenseController = new LicenseController(listLicenses);
    const reserveTypeController = new ReserveTypeController(listReserveTypes);
    const referenceAssetController = new ReferenceAssetController(listReferenceAssets);
    const exchangeRateController = new ExchangeRateController(listExchangeRates);
    const walletController = new WalletController(listWallets);
    const transactionController = new TransactionController(listTransactions);
    const analyticsController = new AnalyticsController(
        getAdoptionAnalytics,
        getCorridorAnalytics,
        getCountryOverview,
        getCountryCorridors,
    );

    // Router composition
    const v1 = Router();
    v1.use('/countries', createCountryRouter(countryController));
    v1.use('/issuers', createIssuerRouter(issuerController));
    v1.use('/stablecoins', createStablecoinRouter(stablecoinController));
    v1.use('/licenses', createLicenseRouter(licenseController));
    v1.use('/reserve-types', createReserveTypeRouter(reserveTypeController));
    v1.use('/reference-assets', createReferenceAssetRouter(referenceAssetController));
    v1.use('/exchange-rates', createExchangeRateRouter(exchangeRateController));
    v1.use('/wallets', createWalletRouter(walletController));
    v1.use('/transactions', createTransactionRouter(transactionController));
    v1.use('/analytics', createAnalyticsRouter(analyticsController));

    return v1;
}
