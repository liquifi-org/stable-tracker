import { useEffect } from 'react';

const SITE = 'Stablecoin Tracker';

export const SEO = {
  site: SITE,
  overview: {
    title: `Stablecoin usage, corridors and regulation by country · ${SITE}`,
    description:
      'See where stablecoins are used, how international corridor volume moves, and which countries have a live regulatory framework. Wallets, remittances, and rules in one country briefing.',
  },
  contact: {
    title: `Contact · ${SITE}`,
    description: 'Get in touch with the Stablecoin Tracker team about data, methodology, or partnership.',
  },
  legal: {
    title: `Legal disclaimer · ${SITE}`,
    description: 'Legal disclaimer for Stablecoin Tracker. Information is for general purposes and is not advice.',
  },
  whitepaper: {
    title: `Whitepaper · measuring usage, corridors, and regulation · ${SITE}`,
    description:
      'Methodology for Stablecoin Tracker: how wallets, corridor volume, remittance ratios, and regulatory stage are defined, sourced, and limited.',
  },
};

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${CSS.escape(key)}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertJsonLd(id: string, data: object | null) {
  const existing = document.getElementById(id);
  if (!data) {
    existing?.remove();
    return;
  }
  let el = existing as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

export function usePageMeta(opts: {
  title: string;
  description: string;
  path?: string;
  jsonLd?: object | object[] | null;
} | null) {
  const title = opts?.title ?? '';
  const description = opts?.description ?? '';
  const path = opts?.path;
  const json = opts?.jsonLd ? JSON.stringify(opts.jsonLd) : '';
  useEffect(() => {
    if (!title) return;
    const url = `${window.location.origin}${path ?? window.location.pathname}`;
    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', 'index,follow');
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:url', url);
    upsertMeta('name', 'twitter:card', 'summary');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertCanonical(url);
    let data: object | null = null;
    if (json) {
      const parsed = JSON.parse(json) as object | object[];
      data = Array.isArray(parsed) ? { '@graph': parsed } : parsed;
    }
    upsertJsonLd('seo-jsonld', data);
  }, [title, description, path, json]);
}
