import type { License } from '../../domain/entities/License';
import type { LicenseDto } from '../dtos/LicenseDto';

export class LicenseMapper {
    static toDto(license: License): LicenseDto {
        return {
            licenseId: license.licenseId,
            name: license.name,
            type: license.type,
            countryId: license.countryId,
        };
    }
}
