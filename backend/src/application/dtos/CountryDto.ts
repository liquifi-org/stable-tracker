export interface CountryDto {
    countryId: string;
    name: string;
    region: string;
    // Stride API fields
    stage?: number;
    regulatorName?: string;
    regulatorDescription?: string;
    description?: string;
    currency?: string;
    fiatBacked?: number;
    fiatAlert?: string;
    cryptoBacked?: number;
    cryptoAlert?: string;
    commodityBacked?: number;
    commodityAlert?: string;
    algorithmBacked?: number;
    algorithmAlert?: string;
    isStablecoinSpecific?: number;
}

export interface CountryPageDto {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    items: CountryDto[];
}
