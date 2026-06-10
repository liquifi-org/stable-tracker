import type { IIssuerRepository } from '../../../domain/repositories/IIssuerRepository';
import type { IssuerDto } from '../../dtos/IssuerDto';
import { IssuerMapper } from '../../mappers/IssuerMapper';
import { NotFoundError } from '../../../domain/errors/NotFoundError';

export class GetIssuerUseCase {
    constructor(private readonly issuerRepo: IIssuerRepository) {}

    async execute(issuerId: string): Promise<IssuerDto> {
        const issuer = await this.issuerRepo.findById(issuerId);
        if (!issuer) throw new NotFoundError('Issuer', issuerId);
        return IssuerMapper.toDto(issuer);
    }
}
