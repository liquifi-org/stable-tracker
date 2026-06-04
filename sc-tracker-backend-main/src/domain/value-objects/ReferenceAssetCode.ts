export class ReferenceAssetCode {
    private constructor(readonly value: string) {}

    static create(value: string): ReferenceAssetCode {
        if (!value || value.trim().length === 0) {
            throw new Error('Reference asset code cannot be empty');
        }
        return new ReferenceAssetCode(value.trim().toUpperCase());
    }

    toString(): string {
        return this.value;
    }
}
