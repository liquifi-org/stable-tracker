export interface MoneyDto {
    amount: number;
    currency: string;
}

export interface TransactionDto {
    transactionId: string;
    senderCountryId: string;
    receiverCountryId: string;
    date: string;
    type: string;
    stablecoinId: string;
    value: MoneyDto;
}

export interface TransactionPageDto {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    items: TransactionDto[];
}
