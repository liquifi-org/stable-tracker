import { ISO_COUNTRIES } from '../../script/shared/iso3166';

const ISO_NAME = new Map(ISO_COUNTRIES.map((c) => [c.numeric, c.name]));

/** Drop UN/M49 parentheticals: "Bahamas (the)", "Netherlands (Kingdom of the)". */
export function shortCountryName(name: string): string {
    return name.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
}

/** Prefer the ISO short name when we have a numeric id; otherwise strip qualifiers. */
export function publicCountryName(countryId: string | undefined, fallback: string): string {
    const padded = countryId?.trim().replace(/\D/g, '').padStart(3, '0');
    if (padded && ISO_NAME.has(padded)) return ISO_NAME.get(padded)!;
    return shortCountryName(fallback);
}
