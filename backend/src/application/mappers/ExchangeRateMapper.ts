import type { ExchangeRate } from '../../domain/entities/ExchangeRate';
import type { ExchangeRateDto } from '../dtos/ExchangeRateDto';

export class ExchangeRateMapper {
    static toDto(er: ExchangeRate): ExchangeRateDto {
        return {
            referenceAsset: er.referenceAsset,
            currencyOriginal: er.currencyOriginal,
            usdExchangeRate: er.usdExchangeRate,
            date: er.date.toISOString().split('T')[0],
        };
    }
}
