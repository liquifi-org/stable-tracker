import type { ReserveTypeCodeValue } from '../value-objects/ReserveTypeCode';

export interface ReserveTypeProps {
    reserveType: ReserveTypeCodeValue;
    description?: string;
}

export class ReserveType {
    readonly reserveType: ReserveTypeCodeValue;
    readonly description: string | undefined;

    constructor(props: ReserveTypeProps) {
        this.reserveType = props.reserveType;
        this.description = props.description;
    }
}
