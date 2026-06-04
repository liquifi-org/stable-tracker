import { DomainError } from './DomainError';

export class ValidationError extends DomainError {
    readonly statusCode = 422;
    readonly type = 'https://api.stablecoin-tracker.ey.com/problems/validation-error';

    constructor(message: string) {
        super(message);
    }
}
