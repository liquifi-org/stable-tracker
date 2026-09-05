import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { FileText, Printer, Quote, Check } from 'lucide-react';
import { SEO, usePageMeta } from '../lib/seo';

const VERSION = '1.0';
const PUBLISHED = '5 September 2026';
const SITE_URL = 'https://stabletracker.org';
const CITE = `Stablecoin Tracker. (2026). Whitepaper: measuring stablecoin usage, corridors, and regulation (v${VERSION}). ${SITE_URL}/whitepaper`;

const SECTIONS = [
  { id: 'abstract', label: 'Abstract' },
  { id: 'purpose', label: '1. Purpose' },
  { id: 'principles', label: '2. Design principles' },
  { id: 'metrics', label: '3. Metrics' },
  { id: 'sources', label: '4. Data sources' },
  { id: 'reading', label: '5. How to read the tracker' },
  { id: 'limitations', label: '6. Limitations' },
  { id: 'reuse', label: '7. Open source and reuse' },
  { id: 'next', label: '8. What comes next' },
  { id: 'cite', label: 'How to cite' },
  { id: 'references', label: 'References' },
] as const;

const SECTION_IDS = SECTIONS.map((s) => s.id);

function useActiveSection(ids: readonly string[]) {
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

function Formula({ children }: { children: ReactNode }) {
  return (
    <div className="my-5 px-4 py-3.5 rounded-[var(--radius)] bg-[var(--paper)] border border-[var(--hairline)] text-center overflow-x-auto">
      <p className="display text-[1.05rem] sm:text-[1.15rem] text-[var(--ink-text)] m-0">{children}</p>
    </div>
  );
}

function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <aside className="surface p-5 my-6">
      <p className="kicker mb-2">{title}</p>
      <div className="text-sm leading-relaxed text-[var(--ink-text)] space-y-2">{children}</div>
    </aside>
  );
}

export function WhitepaperView() {
  const active = useActiveSection(SECTION_IDS);
  const [copied, setCopied] = useState(false);

  usePageMeta({
    ...SEO.whitepaper,
    path: '/whitepaper',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: 'Stablecoin Tracker Whitepaper: measuring usage, corridors, and regulation',
      alternativeHeadline: `Version ${VERSION}`,
      datePublished: '2026-09-05',
      dateModified: '2026-09-05',
      inLanguage: 'en',
      url: `${typeof window !== 'undefined' ? window.location.origin : SITE_URL}/whitepaper`,
      publisher: {
        '@type': 'Organization',
        name: SEO.site,
        url: SITE_URL,
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
      await navigator.clipboard.writeText(CITE);
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
          <p className="kicker mb-3">Whitepaper · v{VERSION} · {PUBLISHED}</p>
          <h1 className="display text-[2.15rem] sm:text-[2.6rem] text-[var(--ink-text)] mb-4">
            Measuring stablecoin usage, corridors, and regulation
          </h1>
          <p className="lede text-[var(--muted-ink)]">
            A living methodology for <span className="text-[var(--ink-text)]">stabletracker.org</span>.
            Every headline number on the site is defined here — including what it is not.
          </p>
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
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`inline-flex items-center h-7 px-2.5 rounded-full border text-[11px] font-semibold transition-ui ${
                    active === s.id
                      ? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--ink-text)]'
                      : 'border-[var(--hairline)] text-[var(--muted-ink)]'
                  }`}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <Section id="abstract" kicker="Abstract" title="What this paper is">
          <p>
            Stablecoins now settle value across borders at a scale that official payment statistics
            still barely see. Policymakers, operators, and researchers nevertheless lack a shared,
            country-level picture of <em>where</em> these instruments are used, <em>which corridors</em>{' '}
            carry the volume, and <em>which jurisdictions</em> have a live rulebook. Stablecoin Tracker
            is an open-source observatory that joins on-chain wallet and corridor observations with
            official population and remittance series and with a country-level regulatory taxonomy.
          </p>
          <p>
            This paper is the specification behind stabletracker.org. It defines every headline
            metric, states the sources and join keys, and documents the limits of the evidence. It is
            written to be read as methodology first and as a product guide second — the inverse of
            most tracker “whitepapers,” which describe screens and leave the numbers unexplained.
          </p>
        </Section>

        <Section id="purpose" kicker="Section 1" title="Purpose">
          <p>
            Three questions recur in any serious conversation about stablecoins as money, not as a
            trading pair:
          </p>
          <ol className="list-decimal pl-5 space-y-2 my-4">
            <li>Where are they actually used, relative to the people who live there?</li>
            <li>Which international routes carry the value, and in which tokens?</li>
            <li>Can you operate there — is there a live, stablecoin-specific framework?</li>
          </ol>
          <p>
            Most public dashboards answer a fourth question instead: how large is the outstanding
            supply, and what is the price. Those figures matter for markets. They do not tell you
            whether Nigeria looks different from the Netherlands, whether a corridor is a remittance
            rail or a treasury hop, or whether a large wallet base sits inside a live regime or
            outside one.
          </p>
          <p>
            Stablecoin Tracker exists to keep those three questions on one map, for one month at a
            time, with named sources. Country briefings then combine usage, corridor direction, and
            rules so an operator or a policy team can open one page instead of three.
          </p>
          <Callout title="Relation to CBDC Tracker">
            <p>
              The project is a sibling of{' '}
              <a href="https://cbdctracker.org" className="underline decoration-[var(--hairline)] hover:decoration-[var(--brand)]">
                cbdctracker.org
              </a>
              , which catalogues sovereign digital-currency <em>initiatives</em> — status, attributes,
              news. This tracker catalogues privately issued stablecoins as they are <em>used</em>.
              CBDCs are policy objects. Stablecoins are already a payments and savings instrument in
              many countries. The two maps should be read together, not substituted for one another.
            </p>
          </Callout>
        </Section>

        <Section id="principles" kicker="Section 2" title="Design principles">
          <dl className="space-y-5">
            <Principle
              name="People, not just rank"
              body="Adoption is wallets holding stablecoins divided by population, then shown per 100,000 people. Rank is a secondary label, and only among countries with enough activity to rank fairly."
            />
            <Principle
              name="International corridors only"
              body="The map and corridor tables show cross-border pairs. Domestic stablecoin volume is real and large in some markets; it is not in this dataset, and the interface says so."
            />
            <Principle
              name="Usage × rules"
              body="A live framework without usage, or heavy usage without a framework, are different operating environments. The regulatory view is not a heat map of friendliness — it is a join of wallets and Stride stage."
            />
            <Principle
              name="Closed months"
              body="The latest selectable period is the previous calendar month. The current month is never shown as complete. Month-over-month trends compare a month with the month before it."
            />
            <Principle
              name="Named sources"
              body="On-chain activity is Allium. Population and remittance outflows are World Bank. Regulatory stage, licenses, and reserve-type permissions are Stride. The tracker does not invent a fourth series to paper over gaps."
            />
          </dl>
        </Section>

        <Section id="metrics" kicker="Section 3" title="Metrics">
          <p>
            All country keys inside the system are ISO 3166-1 numeric codes, zero-padded to three
            characters (for example <code>840</code> for the United States). External sources that
            speak alpha-2, alpha-3, or names are resolved to that key before any metric is computed.
          </p>

          <h3 className="display text-xl mt-8 mb-2">3.1 Active wallets</h3>
          <p>
            For a country and a month <em>YYYY-MM</em>, active wallets are the Allium snapshot of
            addresses holding stablecoins attributed to that country, stored as one document per
            (country, period). Re-running the same month updates that month; it does not overwrite
            history. If a country has no snapshot yet, the API may fall back to a live wallet count
            with an open/close date window — a stopgap, not the production series.
          </p>
          <p>
            A wallet is an address, not a person. One person may control many addresses; many people
            may share one. We do not de-duplicate across chains or custodial omnibus accounts.
            Treat the series as a lower-bound activity signal, not a census.
          </p>

          <h3 className="display text-xl mt-8 mb-2">3.2 Adoption rate</h3>
          <Formula>
            adoption rate = active wallets ÷ population
          </Formula>
          <p>
            Population is the latest World Bank <code>SP.POP.TOTL</code> figure on the country
            record. The rate is a ratio; the overview table also shows wallets per 100,000 people
            (<em>rate × 100,000</em>) because that is the figure a reader can compare across
            countries without scientific notation.
          </p>
          <p>
            If population is missing, the rate is zero and the country cannot be ranked. This is a
            known gap for some territories the World Bank does not publish (Taiwan is the usual
            example).
          </p>

          <h3 className="display text-xl mt-8 mb-2">3.3 Adoption rank</h3>
          <p>
            Rank is dense and 1-based, among countries with <strong>more than 10,000</strong> wallets
            holding stablecoins in the selected period. Countries below that threshold appear in
            tables and may appear grey on the map; they do not receive a <em>#N of M</em> label.
            Two countries that round to the same wallets-per-100k integer share a rank. The
            eligibility cut is there so a tiny population with a handful of attributed wallets
            cannot dominate a league table.
          </p>

          <h3 className="display text-xl mt-8 mb-2">3.4 Corridor volume</h3>
          <p>
            A corridor snapshot is one Allium aggregate per (sender country × receiver country ×
            token) per month, stored as a transaction of type <code>corridor</code>. Volume is the
            sum of those USD amounts for the selected period, optionally filtered by token, reference
            asset, and region. The overview map merges A→B with B→A into an undirected pair so the
            reader sees a route, then splits the pair to show which side sent more.
          </p>
          <p>
            Sender = receiver (domestic) rows are not displayed. Regional corridors are the same
            international pairs rolled up by each country’s macro-region, dropping intra-region
            flows.
          </p>

          <h3 className="display text-xl mt-8 mb-2">3.5 Dollarization index</h3>
          <Formula>
            dollarization = USD-referenced stablecoin volume ÷ total corridor volume
          </Formula>
          <p>
            “USD-referenced” follows Allium’s <code>usdStablecoinVolume</code> field on each corridor
            snapshot, not a homemade ticker list. Token mix on the overview is volume-weighted from
            the top coins on each pair; residual volume is labelled Other.
          </p>

          <h3 className="display text-xl mt-8 mb-2">3.6 Volume versus official remittances</h3>
          <Formula>
            remittance ratio = corridor volume ÷ (annual remittances sent × period months / 12)
          </Formula>
          <p>
            Remittances are World Bank <code>BM.TRF.PWKR.CD.DT</code> — personal remittances paid,
            current USD, the latest non-empty year, stored on the country and pro-rated to the
            selected month so a monthly corridor total is not compared with a yearly official
            figure. The ratio is a comparison, not an identity: stablecoin corridors include
            treasury, trading, and commercial payments that are not remittances, and official
            remittances include channels that are not stablecoins. A high ratio means “this rail is
            large relative to the recorded remittance outflows,” not “X% of remittances are
            stablecoins.”
          </p>

          <h3 className="display text-xl mt-8 mb-2">3.7 Regulatory stage</h3>
          <p>
            Stage is ingested from Stride and kept only when the framework is stablecoin-specific.
            Otherwise it is stored as 0. The four values the interface labels are:
          </p>
          <div className="my-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left font-semibold px-3 py-2 text-white">Stage</th>
                  <th className="text-left font-semibold px-3 py-2 text-white">Label</th>
                  <th className="text-left font-semibold px-3 py-2 text-white">Meaning on this site</th>
                </tr>
              </thead>
              <tbody className="text-[var(--ink-text)]">
                <tr className="border-t border-[var(--hairline)]">
                  <td className="px-3 py-2 tabular-nums">3</td>
                  <td className="px-3 py-2">Live</td>
                  <td className="px-3 py-2">A stablecoin-specific regime is in force.</td>
                </tr>
                <tr className="border-t border-[var(--hairline)]">
                  <td className="px-3 py-2 tabular-nums">2</td>
                  <td className="px-3 py-2">Proposed</td>
                  <td className="px-3 py-2">A specific regime has been put forward.</td>
                </tr>
                <tr className="border-t border-[var(--hairline)]">
                  <td className="px-3 py-2 tabular-nums">1</td>
                  <td className="px-3 py-2">Draft</td>
                  <td className="px-3 py-2">Work is underway; it is not yet proposed as law.</td>
                </tr>
                <tr className="border-t border-[var(--hairline)]">
                  <td className="px-3 py-2 tabular-nums">0</td>
                  <td className="px-3 py-2">No framework / restricted</td>
                  <td className="px-3 py-2">
                    No stablecoin-specific framework, or activity is restricted. Also the default
                    when Stride marks the rules as not stablecoin-specific.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Stage is not month-dependent. “Live rules” on the overview is a count of countries at
            stage 3. Reserve-type permissions (fiat-, crypto-, commodity-, algorithm-backed) and
            issuer licenses come from the same Stride country record and are shown on the briefing,
            not mixed into the adoption rank.
          </p>

          <h3 className="display text-xl mt-8 mb-2">3.8 Market classification</h3>
          <p>
            Country briefings add a short label derived from the metrics above. It is a reading aid,
            not a score. Necessity markets are material usage without a live framework.
            Remittance corridors have outbound volume large relative to official remittances
            (threshold: 15%). Infrastructure markets have live rules, a large wallet base, and low
            population penetration. Digital-dollar savings markets are those where most corridor
            volume is USD-referenced (threshold: 55%).
          </p>
        </Section>

        <Section id="sources" kicker="Section 4" title="Data sources and pipeline">
          <div className="my-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left font-semibold px-3 py-2 text-white">Series</th>
                  <th className="text-left font-semibold px-3 py-2 text-white">Source</th>
                  <th className="text-left font-semibold px-3 py-2 text-white">Cadence</th>
                  <th className="text-left font-semibold px-3 py-2 text-white">Join</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[var(--hairline)]">
                  <td className="px-3 py-2">Wallets holding stablecoins</td>
                  <td className="px-3 py-2">
                    <a href="https://www.allium.so" className="underline decoration-[var(--hairline)] hover:decoration-[var(--brand)]">Allium</a>
                    {' '}Explorer
                  </td>
                  <td className="px-3 py-2">Monthly snapshot</td>
                  <td className="px-3 py-2">Country → ISO numeric</td>
                </tr>
                <tr className="border-t border-[var(--hairline)]">
                  <td className="px-3 py-2">International corridor volume</td>
                  <td className="px-3 py-2">Allium Explorer</td>
                  <td className="px-3 py-2">Monthly snapshot</td>
                  <td className="px-3 py-2">Sender / receiver country</td>
                </tr>
                <tr className="border-t border-[var(--hairline)]">
                  <td className="px-3 py-2">Population</td>
                  <td className="px-3 py-2">
                    World Bank Open Data, indicator <code>SP.POP.TOTL</code>
                  </td>
                  <td className="px-3 py-2">Yearly (latest non-empty)</td>
                  <td className="px-3 py-2">ISO alpha-3 → numeric</td>
                </tr>
                <tr className="border-t border-[var(--hairline)]">
                  <td className="px-3 py-2">Remittances paid</td>
                  <td className="px-3 py-2">
                    World Bank Open Data, indicator <code>BM.TRF.PWKR.CD.DT</code>
                  </td>
                  <td className="px-3 py-2">Yearly, pro-rated to the month</td>
                  <td className="px-3 py-2">ISO alpha-3 → numeric</td>
                </tr>
                <tr className="border-t border-[var(--hairline)]">
                  <td className="px-3 py-2">Stage, licenses, reserve types</td>
                  <td className="px-3 py-2">
                    <a href="https://tracker.stride.sc" className="underline decoration-[var(--hairline)] hover:decoration-[var(--brand)]">Stride</a>
                    {' '}Stablecoin Regulation Tracker
                  </td>
                  <td className="px-3 py-2">As published by Stride</td>
                  <td className="px-3 py-2">Stride country id → numeric</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Allium queries are asynchronous: a run is submitted, polled, then stored. Wallet and
            corridor jobs default to the previous calendar month and can be backfilled for a named
            year and month. World Bank pulls request the most recent non-empty observation for every
            country in one page; regional aggregates that do not resolve to an ISO country are
            dropped. Stride country, issuer, license, and stablecoin records are synced separately
            and attached to the same country documents.
          </p>
          <p>
            Contributing organizations — EY, Allium, Stride, and FirmShift — appear in the site
            footer. Data custody remains with each source; the tracker stores snapshots so a month
            can be reproduced after the next sync.
          </p>
        </Section>

        <Section id="reading" kicker="Section 5" title="How to read the tracker">
          <h3 className="display text-xl mt-2 mb-2">5.1 Overview</h3>
          <p>
            The landing page has two lenses. <strong>Usage view</strong> is the corridor map, the
            named-pair list, country or region tables, and the token mix. <strong>Regulatory view</strong>{' '}
            is the usage × rules matrix plus the stage map. Insight cards at the top are the same
            four numbers in both lenses: wallets, international corridor volume, corridor volume
            versus official remittances, and live frameworks. Clicking a card switches the lens; it
            does not change the month.
          </p>
          <p>
            Filters on the right apply to the selected month, reference asset, token, and corridor
            regions. They do not rewrite rank eligibility or Stride stage. The map’s top pairs are a
            view, not the database: the table of countries is the full eligible set for that month.
          </p>

          <h3 className="display text-xl mt-8 mb-2">5.2 Country briefing</h3>
          <p>
            A briefing is the unit of analysis. It stacks scale (wallets, rank, population
            penetration), money (dollarization, inbound and outbound corridors, token mix), and
            rules (stage, regulator, reserve-type permissions, licenses). Month-over-month badges
            use the previous closed month as the baseline. Classification labels in §3.8 sit above
            those blocks so a reader can decide in one glance whether they are looking at a
            necessity market, a remittance rail, or an infrastructure jurisdiction.
          </p>

          <h3 className="display text-xl mt-8 mb-2">5.3 What the colours are not</h3>
          <p>
            Warm colours on the usage map are wallets per capita among countries with enough
            wallets to rank — not “good.” Stage colours on the regulatory map are a four-state
            taxonomy — not a recommended jurisdiction list. Grey is “below the rank threshold” or
            “no data,” never “zero activity in the real world.”
          </p>
        </Section>

        <Section id="limitations" kicker="Section 6" title="Limitations">
          <p>A tracker that does not list its holes is a brochure. The important ones:</p>
          <ul className="list-disc pl-5 space-y-2 my-4">
            <li>
              <strong>Wallets are not people.</strong> Custodial exchanges, shared addresses, and
              one-person many-wallet behaviour all bias the headcount. Cross-chain identities are
              not unified.
            </li>
            <li>
              <strong>Geography is attributed, not observed at the passport.</strong> Allium’s
              country assignment is the best public on-chain geo we have. It is still a model.
              VPN use, travel, and institutional flow through financial centres will mis-place
              some volume.
            </li>
            <li>
              <strong>Domestic volume is omitted.</strong> In some countries most stablecoin
              activity never crosses a border. International corridor totals will understate those
              markets. Do not treat corridor volume as national turnover.
            </li>
            <li>
              <strong>Remittance ratios are a comparison of unlike series.</strong> See §3.6.
              Official remittances lag, miss informal channels, and are annual; corridors include
              non-remittance payments.
            </li>
            <li>
              <strong>Coverage follows the sources.</strong> Chains, tokens, and countries Allium
              does not yet attribute will be silent. Stride coverage determines who has a stage.
              A missing country is not evidence of prohibition or of zero use.
            </li>
            <li>
              <strong>The 10,000-wallet rank floor hides small, real markets.</strong> That is
              deliberate, so the league table is not dominated by noise. It is still a floor.
            </li>
            <li>
              <strong>This is not advice.</strong> Nothing here is a legal opinion, an investment
              recommendation, or a finding that a token or corridor is compliant. Read the legal
              disclaimer on the site before relying on a figure.
            </li>
          </ul>
        </Section>

        <Section id="reuse" kicker="Section 7" title="Open source and reuse">
          <p>
            The application, the metric code, and the sync jobs are public at{' '}
            <a
              href="https://github.com/liquifi-org/stable-tracker"
              className="underline decoration-[var(--hairline)] hover:decoration-[var(--brand)]"
            >
              github.com/liquifi-org/stable-tracker
            </a>
            . The frontend reads a versioned HTTP API under <code>/v1</code> (adoption, corridors,
            country overview, regulation). Reproduce a number from the repository rather than by
            scraping the map.
          </p>
          <p>
            Allium and Stride data remain subject to those providers’ terms. World Bank indicators
            are public. If you republish a derived chart, name the series and the month; a screenshot
            without a period is not a citation.
          </p>
        </Section>

        <Section id="next" kicker="Section 8" title="What comes next">
          <p>
            The backlog that would most improve the evidence, in order: domestic volume as a
            separate, clearly labelled series; a documented Allium geo-confidence flag on each
            country; chain-level and issuer-level cuts that do not collapse into “Other”; richer
            history so a time slider can replay closed months the way CBDC Tracker replays
            initiative status; and machine-readable downloads of the monthly snapshots the API
            already serves.
          </p>
          <p>
            This document will move with the code. When a formula changes, the version number at
            the top of the page changes. A PDF saved last quarter is not the methodology.
          </p>
        </Section>

        <Section id="cite" kicker="Citation" title="How to cite">
          <p>Please cite the living page, including the version:</p>
          <blockquote className="surface p-5 my-4 text-sm leading-relaxed">
            {CITE}
          </blockquote>
          <p className="text-sm text-[var(--muted-ink)]">
            Contributing organizations: EY, Allium, Stride, FirmShift. Correspondence:{' '}
            <Link to="/contact" className="underline decoration-[var(--hairline)] hover:decoration-[var(--brand)]">
              contact
            </Link>
            .
          </p>
        </Section>

        <Section id="references" kicker="References" title="Sources referred to in the text">
          <ol className="list-decimal pl-5 space-y-3 text-sm">
            <li>
              Allium. On-chain stablecoin wallet and corridor analytics.{' '}
              <a href="https://www.allium.so" className="underline decoration-[var(--hairline)] hover:decoration-[var(--brand)]">
                https://www.allium.so
              </a>
            </li>
            <li>
              World Bank. Population, total (<code>SP.POP.TOTL</code>). World Bank Open Data.{' '}
              <a href="https://data.worldbank.org/indicator/SP.POP.TOTL" className="underline decoration-[var(--hairline)] hover:decoration-[var(--brand)]">
                https://data.worldbank.org/indicator/SP.POP.TOTL
              </a>
            </li>
            <li>
              World Bank. Personal remittances, paid (current US$) (<code>BM.TRF.PWKR.CD.DT</code>).{' '}
              <a href="https://data.worldbank.org/indicator/BM.TRF.PWKR.CD.DT" className="underline decoration-[var(--hairline)] hover:decoration-[var(--brand)]">
                https://data.worldbank.org/indicator/BM.TRF.PWKR.CD.DT
              </a>
            </li>
            <li>
              Stride. Stablecoin Regulation Tracker.{' '}
              <a href="https://tracker.stride.sc" className="underline decoration-[var(--hairline)] hover:decoration-[var(--brand)]">
                https://tracker.stride.sc
              </a>
            </li>
            <li>
              Mikhalev, I., Burchardi, K., Struchkov, I., Song, B., &amp; Gross, J. (2021).{' '}
              <em>CBDC Tracker</em> [White paper].{' '}
              <a href="https://cbdctracker.org/cbdc-tracker-whitepaper.pdf" className="underline decoration-[var(--hairline)] hover:decoration-[var(--brand)]">
                https://cbdctracker.org/cbdc-tracker-whitepaper.pdf
              </a>
            </li>
            <li>
              Auer, R., Cornelli, G., &amp; Frost, J. (2020). Rise of the central bank digital
              currencies: drivers, approaches and technologies. <em>BIS Working Papers</em>, 880.
            </li>
            <li>
              Financial Stability Board. (2023). <em>High-level recommendations for the regulation,
              supervision and oversight of global stablecoin arrangements</em>.
            </li>
          </ol>
        </Section>
      </article>

      <nav
        className="whitepaper-toc whitepaper-chrome hidden lg:block sticky top-24 self-start"
        aria-label="On this page"
      >
        <p className="kicker mb-3">On this page</p>
        <ol className="space-y-1.5">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={`block text-[13px] leading-snug transition-ui ${
                  active === s.id
                    ? 'text-[var(--ink-text)] font-semibold'
                    : 'text-[var(--muted-ink)] hover:text-[var(--ink-text)]'
                }`}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}

function Section({
  id,
  kicker,
  title,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 mb-14">
      <p className="kicker mb-2">{kicker}</p>
      <h2 className="display text-[1.65rem] sm:text-[1.85rem] mb-4">{title}</h2>
      <div className="space-y-4 text-[0.975rem] leading-[1.7] text-[var(--ink-text)]">{children}</div>
    </section>
  );
}

function Principle({ name, body }: { name: string; body: string }) {
  return (
    <div>
      <dt className="font-semibold text-[var(--ink-text)]">{name}</dt>
      <dd className="mt-1 text-[0.975rem] leading-[1.7] text-[var(--muted-ink)]">{body}</dd>
    </div>
  );
}
