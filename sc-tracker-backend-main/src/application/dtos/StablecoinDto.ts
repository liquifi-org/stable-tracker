export interface StablecoinDto {
    stablecoinId: string;
    name: string;
    issuerId: string;
    referenceAsset: string;
}

export interface StablecoinPageDto {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    items: StablecoinDto[];
}
