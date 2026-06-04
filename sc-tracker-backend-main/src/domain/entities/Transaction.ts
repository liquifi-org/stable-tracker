import type { TransactionTypeValue } from '../value-objects/TransactionType';

export interface TransactionValueProps {
    amount: number;
    currency: string;
}

export interface TransactionProps {
    transactionId: string;
    senderCountryId: string;
    receiverCountryId: string;
    date: Date;
    type: TransactionTypeValue;
    stablecoinId: string;
    value: TransactionValueProps;
}

export class Transaction {
    readonly transactionId: string;
    readonly senderCountryId: string;
    readonly receiverCountryId: string;
    readonly date: Date;
    readonly type: TransactionTypeValue;
    readonly stablecoinId: string;
    readonly value: TransactionValueProps;

    constructor(props: TransactionProps) {
        this.transactionId = props.transactionId;
        this.senderCountryId = props.senderCountryId;
        this.receiverCountryId = props.receiverCountryId;
        this.date = props.date;
        this.type = props.type;
        this.stablecoinId = props.stablecoinId;
        this.value = { amount: props.value.amount, currency: props.value.currency };
    }
}
