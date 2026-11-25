/**
 * Wording Stride confirmed by email that the feed has not absorbed yet.
 * Applied on top of a country or law upsert so the next sync keeps it.
 * Drop an entry once the API text matches.
 *
 * Georgia, 25 Nov 2026: Order No. 52/04 as amended by Order No. 214/04,
 * and GELT as a planned project with no verified issuance authorisation.
 */

export const COUNTRY_EDITORIAL: Record<string, {
    description?: string;
    fiatAlert?: string;
    algorithmAlert?: string;
}> = {
    '268': {
        description:
            'Georgia has a live stablecoin framework. NBG Governor Order No. 52/04 (6 March 2026) is to be read as amended by Order No. 214/04 of 9 September 2026, effective 10 September 2026. The current framework requires a fiat peg, NBG VASP registration, separate prior written consent for the stablecoin offering, and at least 100% backing by liquid reserve assets at all times. Unbacked algorithmic stablecoins do not meet the definition and reserve requirements, so they are effectively prohibited; they are not expressly named as prohibited. The framework sits on the December 2025 organic-law amendment and on Order No. 94/04 of 13 June 2023, as amended. GELT is a planned project. No issuance authorisation has been verified. An application was reported in May 2026, but its present status has not been independently confirmed from official sources. There is no blanket crypto ban.',
        fiatAlert:
            'The framework requires a fiat peg and at least 100% backing by liquid reserve assets at all times.',
        algorithmAlert:
            'Unbacked algorithmic stablecoins do not meet the current definition and reserve requirements, so they are effectively prohibited. They are not expressly named as prohibited.',
    },
};

export const LAW_EDITORIAL: Record<string, { title?: string; description?: string }> = {
    '211': {
        title: 'Order No. 52/04 of the Governor of the NBG (Stablecoin ICO Rule), as amended by Order No. 214/04',
        description:
            'Stablecoin issuance rule for NBG-registered VASPs, signed 6 March 2026. Read as amended by Order No. 214/04 of 9 September 2026, effective 10 September 2026. Requires a fiat peg, NBG VASP registration, separate prior written consent for the stablecoin offering, and at least 100% backing by liquid reserve assets at all times.',
    },
};

export function applyCountryEditorial<T extends Record<string, unknown>>(countryId: string, fields: T): T {
    const extra = COUNTRY_EDITORIAL[countryId];
    return extra ? { ...fields, ...extra } : fields;
}

export function applyLawEditorial<T extends { title: string; description?: string | undefined }>(lawId: string, fields: T): T {
    const extra = LAW_EDITORIAL[lawId];
    return extra ? { ...fields, ...extra } : fields;
}
