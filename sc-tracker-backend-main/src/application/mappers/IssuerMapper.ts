import type { Issuer } from '../../domain/entities/Issuer';
import type { IssuerDto } from '../dtos/IssuerDto';

export class IssuerMapper {
    static toDto(issuer: Issuer): IssuerDto {
        return {
            issuerId: issuer.issuerId,
            name: issuer.name,
            originCountry: issuer.originCountry,
        };
    }
}
