export const WHITEPAPER_VERSION = '1.4';
export const WHITEPAPER_PUBLISHED = '10 September 2026';
export const WHITEPAPER_SITE = 'https://stabletracker.org';

export const WHITEPAPER_AUTHORS = [
  { name: 'Igor Mikhalev', email: 'im@c20.org' },
  { name: 'Tatiana Descamps', email: 't.a.descamps@gmail.com' },
  { name: 'Silke van der Burg', email: 'silkevanderburg@gmail.com' },
  { name: 'Roeland Hooijmans', email: 'roelandhooijmans@gmail.com' },
] as const;

export const WHITEPAPER_CITE =
  `Mikhalev, I., Descamps, T., van der Burg, S., & Hooijmans, R. (2026). Whitepaper: measuring stablecoin usage, corridors, and regulation (v${WHITEPAPER_VERSION}). Stablecoin Tracker. ${WHITEPAPER_SITE}/whitepaper`;

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function whitepaperBody(source: string): string {
  const start = source.search(/^## /m);
  return start >= 0 ? source.slice(start) : source;
}

export function whitepaperToc(source: string): { id: string; label: string }[] {
  return [...whitepaperBody(source).matchAll(/^## (.+)$/gm)].map((match) => ({
    id: slugifyHeading(match[1]),
    label: match[1],
  }));
}
