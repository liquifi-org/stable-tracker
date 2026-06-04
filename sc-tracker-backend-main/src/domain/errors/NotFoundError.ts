import { DomainError } from './DomainError';

export class NotFoundError extends DomainError {
    readonly statusCode = 404;
    readonly type = 'https://api.stablecoin-tracker.ey.com/problems/not-found';

    constructor(entity: string, id: string) {
        super(`${entity} with ID "${id}" not found.`);
    }
}
