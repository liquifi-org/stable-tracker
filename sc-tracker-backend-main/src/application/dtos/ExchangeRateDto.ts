export interface ExchangeRateDto {
    referenceAsset: string;
    currencyOriginal: string;
    usdExchangeRate: number;
    date: string;
}

export interface ExchangeRatePageDto {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    items: ExchangeRateDto[];
}
