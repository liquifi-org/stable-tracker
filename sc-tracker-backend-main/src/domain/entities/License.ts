export interface LicenseProps {
    licenseId: string;
    name: string;
    type: string;
    countryId: string;
}

export class License {
    readonly licenseId: string;
    readonly name: string;
    readonly type: string;
    readonly countryId: string;

    constructor(props: LicenseProps) {
        this.licenseId = props.licenseId;
        this.name = props.name;
        this.type = props.type;
        this.countryId = props.countryId;
    }
}
