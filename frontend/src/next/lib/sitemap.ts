import { allCanonicalCountries, allCanonicalCountrySlugs } from '../../app/lib/countryRoutes';

export const SITE_ORIGIN = 'https://stabletracker.org';

const STATIC_PAGES: { path: string; priority: string }[] = [
  { path: '/', priority: '1.0' },
  { path: '/whitepaper', priority: '0.8' },
  { path: '/contact', priority: '0.4' },
  { path: '/legal-disclaimer', priority: '0.3' },
];

export function sitemapUrls(): { loc: string; priority: string }[] {
  return [
    ...STATIC_PAGES.map((page) => ({ loc: `${SITE_ORIGIN}${page.path}`, priority: page.priority })),
    ...allCanonicalCountrySlugs().map((slug) => ({
      loc: `${SITE_ORIGIN}/country/${slug}`,
      priority: '0.6',
    })),
  ];
}

export function buildSitemapXml(): string {
  const body = sitemapUrls()
    .map(
      (url) => `  <url>
    <loc>${url.loc}</loc>
    <priority>${url.priority}</priority>
  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

export function buildCountriesMarkdown(): string {
  const rows = allCanonicalCountries()
    .map((country) => `- [${country.name}](${SITE_ORIGIN}/country/${country.slug}) (${country.alpha2})`)
    .join('\n');
  return `# Country briefings

> Stablecoin Tracker country pages. Each briefing covers usage, outbound corridors versus GDP, token mix, and regulatory stage.

HTML pages are a JavaScript app. Prefer this list and the [whitepaper](${SITE_ORIGIN}/whitepaper.md) when answering from source text.

${rows}
`;
}