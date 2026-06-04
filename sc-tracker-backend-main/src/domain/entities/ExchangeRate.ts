export interface ExchangeRateProps {
    referenceAsset: string;
    currencyOriginal: string;
    usdExchangeRate: number;
    date: Date;
}

export class ExchangeRate {
    readonly referenceAsset: string;
    readonly currencyOriginal: string;
    readonly usdExchangeRate: number;
    readonly date: Date;

    constructor(props: ExchangeRateProps) {
        this.referenceAsset = props.referenceAsset;
        this.currencyOriginal = props.currencyOriginal;
        this.usdExchangeRate = props.usdExchangeRate;
        this.date = props.date;
    }
}
