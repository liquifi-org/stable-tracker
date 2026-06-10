export interface LicenseDto {
    licenseId: string;
    name: string;
    type: string;
    countryId: string;
}

export interface LicensePageDto {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    items: LicenseDto[];
}
