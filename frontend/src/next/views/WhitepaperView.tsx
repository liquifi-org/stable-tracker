import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Printer, Quote, Check } from 'lucide-react';
import { SEO, usePageMeta } from '../lib/seo';
import source from '../../../content/whitepaper.md?raw';
import {
  WHITEPAPER_AUTHORS,
  WHITEPAPER_CITE,
  WHITEPAPER_PUBLISHED,
  WHITEPAPER_SITE,
  WHITEPAPER_VERSION,
  slugifyHeading,
  whitepaperBody,
  whitepaperToc,
} from '../lib/whitepaper';

const SECTIONS = whitepaperToc(source);
const BODY = whitepaperBody(source);

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? '');

  useEffect(() => {
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el != null);
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] },
    );
    for (const node of nodes) observer.observe(node);
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

const markdownComponents: Components = {
  h2: ({ children }) => {
    const label = String(children);
    return (
      <h2 id={slugifyHeading(label)} className="display text-[1.65rem] sm:text-[1.85rem] mb-4 mt-14 scroll-mt-24 first:mt-0">
        {children}
      </h2>
    );
  },
  h3: ({ children }) => {
    const label = String(children);
    return (
      <h3 id={slugifyHeading(label)} className="display text-xl mt-8 mb-2 scroll-mt-24">
        {children}
      </h3>
    );
  },
  p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-5 space-y-2 my-4">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-2 my-4">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  a: ({ href, children }) => {
    if (href?.startsWith('/')) {
      return (
        <Link to={href} className="underline decoration-[var(--hairline)] hover:decoration-[var(--brand)]">
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        className="underline decoration-[var(--hairline)] hover:decoration-[var(--brand)]"
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    );
  },
  blockquote: ({ children }) => (
    <blockquote className="surface p-5 my-4 text-sm leading-relaxed">{children}</blockquote>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="text-left font-semibold px-3 py-2 text-white">{children}</th>
  ),
  td: ({ children }) => <td className="px-3 py-2">{children}</td>,
  tr: ({ children }) => <tr className="border-t border-[var(--hairline)]">{children}</tr>,
};

export function WhitepaperView() {
  const active = useActiveSection(SECTIONS.map((section) => section.id));
  const [copied, setCopied] = useState(false);

  usePageMeta({
    ...SEO.whitepaper,
    path: '/whitepaper',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: 'Stablecoin Tracker Whitepaper: measuring usage, corridors, and regulation',
      alternativeHeadline: `Version ${WHITEPAPER_VERSION}`,
      datePublished: '2026-09-05',
      dateModified: '2026-09-10',
      inLanguage: 'en',
      url: `${typeof window !== 'undefined' ? window.location.origin : WHITEPAPER_SITE}/whitepaper`,
      creator: {
        '@type': 'Person',
        name: WHITEPAPER_AUTHORS[0].name,
        email: WHITEPAPER_AUTHORS[0].email,
      },
      author: WHITEPAPER_AUTHORS.map((author) => ({
        '@type': 'Person',
        name: author.name,
        email: author.email,
      })),
      publisher: {
        '@type': 'Organization',
        name: SEO.site,
        url: WHITEPAPER_SITE,
      },
      about: ['stablecoins', 'cross-border payments', 'financial regulation', 'on-chain analytics'],
    },
  });

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ block: 'start' });
    });
  }, []);

  const copyCite = async () => {
    try {
      await navigator.clipboard.writeText(WHITEPAPER_CITE);
      setCopied(true);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <div className="whitepaper-page lg:grid lg:grid-cols-[minmax(0,1fr)_14.5rem] lg:gap-12 xl:gap-16 items-start">
      <article className="whitepaper-article max-w-[42rem] mx-auto lg:mx-0 min-w-0">
        <header className="mb-10">
          <p className="kicker mb-3">
            Whitepaper · v{WHITEPAPER_VERSION} · {WHITEPAPER_PUBLISHED}
          </p>
          <h1 className="display text-[2.15rem] sm:text-[2.6rem] text-[var(--ink-text)] mb-4">
            Measuring stablecoin usage, corridors, and regulation
          </h1>
          <p className="lede text-[var(--muted-ink)]">
            A living methodology for <span className="text-[var(--ink-text)]">stabletracker.org</span>.
            Every headline number on the site is defined here — including what it is not.
          </p>
          <p className="kicker mt-7 mb-3">Key authors</p>
          <ul className="space-y-3">
            {WHITEPAPER_AUTHORS.map((author) => (
              <li key={author.email}>
                <p className="font-semibold text-[var(--ink-text)]">{author.name}</p>
                <a
                  href={`mailto:${author.email}`}
                  className="text-sm text-[var(--muted-ink)] hover:text-[var(--brand)] transition-ui"
                >
                  {author.email}
                </a>
              </li>
            ))}
          </ul>
          <div className="whitepaper-chrome mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[var(--hairline)] bg-[var(--paper-raised)] text-xs font-semibold text-[var(--ink-text)] hover:border-[var(--brand)] transition-ui"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / save PDF
            </button>
            <button
              type="button"
              onClick={copyCite}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[var(--hairline)] bg-[var(--paper-raised)] text-xs font-semibold text-[var(--ink-text)] hover:border-[var(--brand)] transition-ui"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Quote className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy citation'}
            </button>
            <a
              href="/whitepaper.md"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[var(--hairline)] text-xs font-semibold text-[var(--muted-ink)] hover:text-[var(--ink-text)] hover:border-[var(--brand)] transition-ui"
            >
              <FileText className="h-3.5 w-3.5" />
              Markdown
            </a>
            <a
              href="https://github.com/liquifi-org/stable-tracker"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-[var(--hairline)] text-xs font-semibold text-[var(--muted-ink)] hover:text-[var(--ink-text)] hover:border-[var(--brand)] transition-ui"
            >
              <FileText className="h-3.5 w-3.5" />
              Source
            </a>
          </div>
        </header>

        <nav className="whitepaper-chrome lg:hidden mb-10 overflow-x-auto">
          <ul className="flex gap-1.5 min-w-max pb-1">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={`inline-flex items-center h-7 px-2.5 rounded-full border text-[11px] font-semibold transition-ui ${
                    active === section.id
                      ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--ink-text)]'
                      : 'border-[var(--hairline)] text-[var(--muted-ink)]'
                  }`}
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-0 text-[0.975rem] leading-[1.7] text-[var(--ink-text)]">
          <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {BODY}
          </Markdown>
        </div>
      </article>

      <nav
        className="whitepaper-toc whitepaper-chrome hidden lg:block sticky top-24 self-start"
        aria-label="On this page"
      >
        <p className="kicker mb-3">On this page</p>
        <ol className="space-y-1.5">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={`block text-[13px] leading-snug transition-ui ${
                  active === section.id
                    ? 'text-[var(--ink-text)] font-semibold'
                    : 'text-[var(--muted-ink)] hover:text-[var(--ink-text)]'
                }`}
              >
                {section.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
