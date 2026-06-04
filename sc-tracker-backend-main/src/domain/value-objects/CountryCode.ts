export class CountryCode {
    private readonly _value: string;

    private constructor(value: string) {
        this._value = value;
    }

    static create(value: string): CountryCode {
        if (!/^[A-Z]{2}$/.test(value)) {
            throw new Error(`Invalid country code: "${value}". Must be ISO 3166-1 alpha-2.`);
        }
        return new CountryCode(value);
    }

    get value(): string {
        return this._value;
    }

    equals(other: CountryCode): boolean {
        return this._value === other._value;
    }

    toString(): string {
        return this._value;
    }
}
