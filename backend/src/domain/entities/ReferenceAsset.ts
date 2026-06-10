import type { ReserveTypeCodeValue } from '../value-objects/ReserveTypeCode';

export interface ReferenceAssetProps {
    referenceAsset: string;
    reserveType: ReserveTypeCodeValue;
}

export class ReferenceAsset {
    readonly referenceAsset: string;
    readonly reserveType: ReserveTypeCodeValue;

    constructor(props: ReferenceAssetProps) {
        this.referenceAsset = props.referenceAsset;
        this.reserveType = props.reserveType;
    }
}
