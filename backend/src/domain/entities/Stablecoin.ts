export interface StablecoinProps {
    stablecoinId: string;
    name: string;
    issuerId: string;
    referenceAsset: string;
}

export class Stablecoin {
    readonly stablecoinId: string;
    readonly name: string;
    readonly issuerId: string;
    readonly referenceAsset: string;

    constructor(props: StablecoinProps) {
        this.stablecoinId = props.stablecoinId;
        this.name = props.name;
        this.issuerId = props.issuerId;
        this.referenceAsset = props.referenceAsset;
    }
}
