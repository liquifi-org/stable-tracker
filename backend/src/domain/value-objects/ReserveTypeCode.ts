export type ReserveTypeCodeValue = 'fiat' | 'commodity' | 'crypto' | 'algorithmic' | 'other';

const VALID: ReadonlyArray<ReserveTypeCodeValue> = [
    'fiat',
    'commodity',
    'crypto',
    'algorithmic',
    'other',
];

export class ReserveTypeCode {
    private constructor(readonly value: ReserveTypeCodeValue) {}

    static create(value: string): ReserveTypeCode {
        if (!VALID.includes(value as ReserveTypeCodeValue)) {
            throw new Error(`Invalid reserve type code: "${value}"`);
        }
        return new ReserveTypeCode(value as ReserveTypeCodeValue);
    }

    toString(): string {
        return this.value;
    }
}
