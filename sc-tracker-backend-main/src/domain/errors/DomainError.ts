export abstract class DomainError extends Error {
    abstract readonly statusCode: number;
    abstract readonly type: string;

    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
