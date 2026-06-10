export interface IssuerProps {
    issuerId: string;
    name: string;
    originCountry: string;
}

export class Issuer {
    readonly issuerId: string;
    readonly name: string;
    readonly originCountry: string;

    constructor(props: IssuerProps) {
        this.issuerId = props.issuerId;
        this.name = props.name;
        this.originCountry = props.originCountry;
    }
}
