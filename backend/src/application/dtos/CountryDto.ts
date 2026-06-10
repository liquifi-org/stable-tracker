export interface CountryDto {
    countryId: string;
    name: string;
    region: string;
}

export interface CountryPageDto {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    items: CountryDto[];
}
