export interface CountryProps {
    countryId: string;
    name: string;
    region: string;
    population?: number;
    regulatedIssuerIds: string[];
    regulatedReserveTypes: string[];
}

export class Country {
    readonly countryId: string;
    readonly name: string;
    readonly region: string;
    readonly population: number | undefined;
    readonly regulatedIssuerIds: ReadonlyArray<string>;
    readonly regulatedReserveTypes: ReadonlyArray<string>;

    constructor(props: CountryProps) {
        this.countryId = props.countryId;
        this.name = props.name;
        this.region = props.region;
        this.population = props.population;
        this.regulatedIssuerIds = Object.freeze([...props.regulatedIssuerIds]);
        this.regulatedReserveTypes = Object.freeze([...props.regulatedReserveTypes]);
    }
}
