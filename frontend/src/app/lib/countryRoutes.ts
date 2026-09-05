import { ISO_COUNTRIES, resolveCountryId } from './iso3166';

export interface CountryRef {
  name?: string;
  isoAlpha2?: string;
  countryId?: string | number;
}

export function toCountrySlug(value: string): string {
  return shortCountryName(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Drop UN/M49 parentheticals: "Bahamas (the)", "Netherlands (Kingdom of the)". */
export function shortCountryName(name: string): string {
  return name.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
}

const NUMERIC_TO_SLUG = new Map<string, string>();
const SLUG_TO_NUMERIC = new Map<string, string>();

function remember(slug: string, numeric: string) {
  if (!slug) return;
  if (!SLUG_TO_NUMERIC.has(slug)) SLUG_TO_NUMERIC.set(slug, numeric);
}

for (const country of ISO_COUNTRIES) {
  const slug = toCountrySlug(country.name);
  NUMERIC_TO_SLUG.set(country.numeric, slug);
  remember(slug, country.numeric);
  remember(country.alpha2.toLowerCase(), country.numeric);
  remember(country.alpha3.toLowerCase(), country.numeric);
}

const SLUG_ALIASES: Record<string, string> = {
  usa: '840',
  us: '840',
  'united-states-of-america': '840',
  uk: '826',
  'great-britain': '826',
  britain: '826',
  'south-korea': '410',
  'republic-of-korea': '410',
  'north-korea': '408',
  russia: '643',
  'russian-federation': '643',
  'viet-nam': '704',
  uae: '784',
  czechia: '203',
  'ivory-coast': '384',
  'cote-divoire': '384',
  'cote-d-ivoire': '384',
  'hong-kong-sar': '344',
  macau: '446',
  'european-union': '999',
  eu: '999',
  palestine: '275',
  taiwan: '158',
};

for (const [slug, numeric] of Object.entries(SLUG_ALIASES)) {
  remember(slug, numeric);
}

export function resolveCountryNumericId(param: string | null | undefined): number | null {
  if (!param) return null;
  const trimmed = param.trim();
  if (!trimmed) return null;

  const fromIso = resolveCountryId(trimmed);
  if (fromIso) return parseInt(fromIso, 10);

  const fromSlug = SLUG_TO_NUMERIC.get(toCountrySlug(trimmed));
  if (fromSlug) return parseInt(fromSlug, 10);

  return null;
}

export function canonicalCountrySlug(ref: CountryRef): string | null {
  if (ref.isoAlpha2) {
    const numeric = resolveCountryId(ref.isoAlpha2);
    if (numeric) return NUMERIC_TO_SLUG.get(numeric) ?? null;
  }
  if (ref.countryId != null && /^\d+$/.test(String(ref.countryId).trim())) {
    const padded = String(ref.countryId).trim().padStart(3, '0');
    const slug = NUMERIC_TO_SLUG.get(padded);
    if (slug) return slug;
  }
  if (ref.name) {
    const numeric = resolveCountryId(ref.name) ?? SLUG_TO_NUMERIC.get(toCountrySlug(ref.name));
    if (numeric) return NUMERIC_TO_SLUG.get(numeric) ?? toCountrySlug(ref.name);
    const slug = toCountrySlug(ref.name);
    return slug || null;
  }
  return null;
}

export function countryDisplayName(numericId: number | string): string | null {
  const padded = String(numericId).trim().padStart(3, '0');
  return ISO_COUNTRIES.find((c) => c.numeric === padded)?.name ?? null;
}

/** ISO short name when we can resolve the country; otherwise strip parentheticals. */
export function prettyCountryName(ref: CountryRef): string {
  if (ref.isoAlpha2) {
    const numeric = resolveCountryId(ref.isoAlpha2);
    const iso = numeric ? countryDisplayName(numeric) : null;
    if (iso) return iso;
  }
  if (ref.countryId != null && /^\d+$/.test(String(ref.countryId).trim())) {
    const iso = countryDisplayName(ref.countryId);
    if (iso) return iso;
  }
  return ref.name ? shortCountryName(ref.name) : '';
}
export function countryPath(ref: CountryRef): string {
  const slug = canonicalCountrySlug(ref) ?? (ref.name ? toCountrySlug(ref.name) : null);
  return slug ? `/country/${slug}` : '/';
}
