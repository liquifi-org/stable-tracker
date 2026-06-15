export interface CountryProps {
    countryId: string;
    name: string;
    region: string;
    population?: number;
    regulatedIssuerIds: string[];
    regulatedReserveTypes: string[];
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

export class Country {
    readonly countryId: string;
    readonly name: string;
    readonly region: string;
    readonly population: number | undefined;
    readonly regulatedIssuerIds: ReadonlyArray<string>;
    readonly regulatedReserveTypes: ReadonlyArray<string>;
    readonly stage: number | undefined;
    readonly regulatorName: string | undefined;
    readonly regulatorDescription: string | undefined;
    readonly description: string | undefined;
    readonly currency: string | undefined;
    readonly fiatBacked: number | undefined;
    readonly fiatAlert: string | undefined;
    readonly cryptoBacked: number | undefined;
    readonly cryptoAlert: string | undefined;
    readonly commodityBacked: number | undefined;
    readonly commodityAlert: string | undefined;
    readonly algorithmBacked: number | undefined;
    readonly algorithmAlert: string | undefined;
    readonly isStablecoinSpecific: number | undefined;

    constructor(props: CountryProps) {
        this.countryId = props.countryId;
        this.name = props.name;
        this.region = props.region;
        this.population = props.population;
        this.regulatedIssuerIds = Object.freeze([...props.regulatedIssuerIds]);
        this.regulatedReserveTypes = Object.freeze([...props.regulatedReserveTypes]);
        this.stage = props.stage;
        this.regulatorName = props.regulatorName;
        this.regulatorDescription = props.regulatorDescription;
        this.description = props.description;
        this.currency = props.currency;
        this.fiatBacked = props.fiatBacked;
        this.fiatAlert = props.fiatAlert;
        this.cryptoBacked = props.cryptoBacked;
        this.cryptoAlert = props.cryptoAlert;
        this.commodityBacked = props.commodityBacked;
        this.commodityAlert = props.commodityAlert;
        this.algorithmBacked = props.algorithmBacked;
        this.algorithmAlert = props.algorithmAlert;
        this.isStablecoinSpecific = props.isStablecoinSpecific;
    }
}
