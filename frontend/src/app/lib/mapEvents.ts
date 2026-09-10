export const OPEN_COUNTRY_SEARCH = 'open-country-search';
export const OPEN_FILTERS = 'open-filters';
export const MAP_FOCUS_COUNTRY = 'map-focus-country';

export type MapFocusCountryDetail = {
  countryId: string;
  name: string;
  isoAlpha2?: string;
};

export function openCountrySearch(): void {
  window.dispatchEvent(new Event(OPEN_COUNTRY_SEARCH));
}

export function openFilters(): void {
  window.dispatchEvent(new Event(OPEN_FILTERS));
}

export function focusCountryOnMap(detail: MapFocusCountryDetail): void {
  window.dispatchEvent(new CustomEvent(MAP_FOCUS_COUNTRY, { detail }));
}
