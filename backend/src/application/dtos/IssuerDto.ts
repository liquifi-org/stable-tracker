export interface IssuerDto {
    issuerId: string;
    name: string;
    originCountry: string;
}

export interface IssuerPageDto {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    items: IssuerDto[];
}
