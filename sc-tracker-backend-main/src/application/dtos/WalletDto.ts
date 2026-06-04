export interface WalletDto {
    walletId: string;
    countryId: string;
    dateOpened: string;
    dateClosed: string | null;
}

export interface WalletPageDto {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    items: WalletDto[];
}
