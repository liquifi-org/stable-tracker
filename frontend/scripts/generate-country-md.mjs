/**
 * Writes dist/country/{slug}.md from the same /v1 analytics the SPA uses.
 * Run after `vite build`. Set ST_MD_REQUIRED=1 so a broken API fails the deploy.
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.env.ST_MD_OUT || path.resolve(process.cwd(), 'dist');
const SITE = 'https://stabletracker.org';
const REQUIRED = process.env.ST_MD_REQUIRED === '1';
const API_CANDIDATES = [
  process.env.ST_API_BASE,
  'http://127.0.0.1:3003/v1',
  'https://stabletracker.org/v1',
].filter(Boolean);

function closedPeriod(now = new Date()) {
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth() + 1;
  if (month === 1) {
    year -= 1;
    month = 12;
  } else {
    month -= 1;
  }
  return { year, month };
}

function shortCountryName(name) {
  return String(name ?? '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toCountrySlug(value) {
  return shortCountryName(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stageLabel(stage) {
  if (stage === 3) return 'Live';
  if (stage === 2) return 'Proposed';
  if (stage === 1) return 'Draft';
  if (stage === 0) return 'No framework / restricted';
  return 'Unknown';
}

function classifyMarket({ dollarization, remittanceRatio, stage, activeWallets, adoptionRate }) {
  const noLiveRules = stage == null || stage < 3;
  const highDollar = dollarization >= 0.55;
  const remittanceHeavy = remittanceRatio != null && remittanceRatio >= 0.15;
  if (noLiveRules && (highDollar || remittanceHeavy || activeWallets >= 50_000)) {
    return { label: 'Necessity market', reason: 'Material usage without a live stablecoin framework.' };
  }
  if (remittanceHeavy) {
    return { label: 'Remittance corridor', reason: 'Outbound stablecoin volume is large relative to official remittances.' };
  }
  if (stage === 3 && activeWallets >= 50_000 && adoptionRate < 0.01) {
    return { label: 'Infrastructure market', reason: 'Live rules and a large wallet base, with low population penetration.' };
  }
  if (highDollar) {
    return { label: 'Digital-dollar savings', reason: 'Most corridor volume is USD-referenced stablecoins.' };
  }
  if (stage === 3) {
    return { label: 'Live framework', reason: 'A live stablecoin regime is in force.' };
  }
  return { label: 'Mixed', reason: 'No single use-case dominates the numbers we have.' };
}

function formatUsd(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function formatPct(ratio) {
  if (ratio == null || !Number.isFinite(ratio)) return '—';
  const pct = ratio * 100;
  if (pct < 0.01) return `${pct.toFixed(4)}%`;
  if (pct < 1) return `${pct.toFixed(2)}%`;
  return `${pct.toFixed(1)}%`;
}

function padId(id) {
  return String(id).trim().padStart(3, '0');
}

function previousPeriod({ year, month }) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function corridorStats(corridors, adoption) {
  const volume = corridors.reduce((sum, flow) => sum + (flow.value?.amount ?? 0), 0);
  const usd = corridors.reduce(
    (sum, flow) => sum + (flow.value?.amount ?? 0) * (flow.dollarizationIndex ?? 0),
    0,
  );
  const official = adoption
    .filter((row) => (row.outboundVolume ?? 0) > 0)
    .reduce((sum, row) => sum + (row.officialOutflows ?? 0), 0);
  return {
    volume,
    dollarization: volume > 0 ? usd / volume : null,
    outflowRatio: official > 0 ? volume / official : null,
  };
}

function pctChange(current, previous) {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

function formatSignedPct(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  const arrow = n > 0 ? '↑' : n < 0 ? '↓' : '→';
  return `${arrow} ${Math.abs(n).toFixed(1)}% vs prev. mo.`;
}

function formatCardUsd(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toLocaleString('en-US')}`;
}

function formatCardPct(ratio) {
  if (ratio == null || !Number.isFinite(ratio)) return '—';
  return `${(ratio * 100).toFixed(1)}%`;
}

function formatSignedPp(n, digits) {
  if (n == null || !Number.isFinite(n)) return '—';
  const arrow = n > 0 ? '↑' : n < 0 ? '↓' : '→';
  return `${arrow} ${Math.abs(n).toFixed(digits)}pp vs prev. mo.`;
}

function insertBeforeHeading(markdown, heading, section) {
  const index = markdown.indexOf(heading);
  if (index < 0) return `${markdown.trim()}\n\n${section}\n`;
  return `${markdown.slice(0, index)}${section}\n${markdown.slice(index)}`;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

async function getJson(base, urlPath) {
  const url = `${base}${urlPath}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`GET ${url} → HTTP ${response.status}`);
  return response.json();
}

async function loadPeriodData(year, month) {
  let lastError;
  for (const base of API_CANDIDATES) {
    try {
      const [adoption, regulationPage, corridors, insights] = await Promise.all([
        getJson(base, `/analytics/adoption?year=${year}&month=${month}`),
        getJson(base, '/countries?pageSize=200'),
        getJson(base, `/analytics/corridors?year=${year}&month=${month}`),
        getJson(base, `/analytics/global-insights?year=${year}&month=${month}`),
      ]);
      console.log(`Country markdown source: ${base}`);
      return { base, adoption, regulationPage, corridors, insights };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('No API base responded');
}

function topPartners(flows, nameKey, limit = 8) {
  return [...flows]
    .sort((a, b) => b.value.amount - a.value.amount)
    .slice(0, limit)
    .map((flow) => `- ${flow[nameKey] || flow.to || flow.from}: ${formatUsd(flow.value.amount)}`)
    .join('\n');
}

const { year, month } = closedPeriod();
const period = `${year}-${String(month).padStart(2, '0')}`;

let adoption;
let regulationPage;
let corridors;
let insights;
let apiBase;
try {
  ({ base: apiBase, adoption, regulationPage, corridors, insights } = await loadPeriodData(year, month));
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (REQUIRED) throw error;
  console.warn(`Skipping country markdown (${message})`);
  process.exit(0);
}

if (!Array.isArray(adoption)) throw new Error('adoption response is not an array');
if (!Array.isArray(corridors)) throw new Error('corridors response is not an array');

const regulationById = new Map((regulationPage.items ?? []).map((row) => [padId(row.countryId), row]));
const adoptionById = new Map(adoption.map((row) => [padId(row.countryId), row]));

const outByOrigin = new Map();
const inByDest = new Map();
const dollarByOrigin = new Map();

for (const flow of corridors) {
  const from = padId(flow.from);
  const to = padId(flow.to);
  if (!outByOrigin.has(from)) outByOrigin.set(from, []);
  outByOrigin.get(from).push(flow);
  if (!inByDest.has(to)) inByDest.set(to, []);
  inByDest.get(to).push(flow);
  const bucket = dollarByOrigin.get(from) ?? { usd: 0, total: 0 };
  bucket.total += flow.value.amount;
  bucket.usd += flow.value.amount * (flow.dollarizationIndex ?? 0);
  dollarByOrigin.set(from, bucket);
}

const ids = new Set([...adoptionById.keys(), ...regulationById.keys()]);
const countryDir = path.join(OUT, 'country');
fs.mkdirSync(countryDir, { recursive: true });

const indexRows = [];

for (const id of [...ids].sort()) {
  const row = adoptionById.get(id);
  const rules = regulationById.get(id);
  const name = shortCountryName(row?.name || rules?.name || `Country ${id}`);
  const slug = toCountrySlug(name);
  if (!slug) continue;

  const iso = row?.isoAlpha2 || rules?.isoAlpha2 || '';
  const outflows = outByOrigin.get(id) ?? [];
  const inflows = inByDest.get(id) ?? [];
  const inbound = inflows.reduce((sum, flow) => sum + flow.value.amount, 0);
  const outbound = row?.outboundVolume ?? outflows.reduce((sum, flow) => sum + flow.value.amount, 0);
  const dollar = dollarByOrigin.get(id);
  const dollarization = dollar && dollar.total > 0 ? dollar.usd / dollar.total : null;
  const remittances = row?.remittancesSent ?? null;
  const remittanceRatio = remittances > 0 && outbound > 0 ? outbound / remittances : null;
  const official = row?.officialOutflows ?? null;
  const outflowRatio = official > 0 && outbound > 0 ? outbound / official : null;
  const stage = rules?.stage;
  const wallets = row?.activeWallets ?? 0;
  const market = classifyMarket({
    dollarization: dollarization ?? 0,
    remittanceRatio,
    stage,
    activeWallets: wallets,
    adoptionRate: row?.adoptionRate ?? 0,
  });

  const nameForId = (partnerId) =>
    shortCountryName(adoptionById.get(padId(partnerId))?.name || regulationById.get(padId(partnerId))?.name || partnerId);

  const outList = topPartners(
    outflows.map((flow) => ({ ...flow, toName: nameForId(flow.to) })),
    'toName',
  );
  const inList = topPartners(
    inflows.map((flow) => ({ ...flow, fromName: nameForId(flow.from) })),
    'fromName',
  );

  const body = `# ${name}

> Country briefing for ${period}. Interactive page: ${SITE}/country/${slug}

- ISO: ${iso || '—'} (${id})
- Region: ${row?.region || rules?.region || '—'}
- Market label: ${market.label} — ${market.reason}
- Regulatory stage: ${stageLabel(stage)}${rules?.regulatorName ? ` (${rules.regulatorName})` : ''}
- GDP intensity (outbound ÷ period GDP): ${formatPct(row?.gdpIntensity)}
- Adoption rank: ${row?.adoptionRank != null ? `#${row.adoptionRank} of ${row.eligibleCountries}` : '—'}
- Attributed wallets: ${wallets ? wallets.toLocaleString('en-US') : '—'}
- Wallets per 100k people: ${row?.adoptionRate != null ? (row.adoptionRate * 100_000).toFixed(2) : '—'}
- Outbound corridor volume: ${formatUsd(outbound)}
- Inbound corridor volume: ${formatUsd(inbound)}
- Dollarization (USD-referenced share of outbound): ${formatPct(dollarization)}
- Versus official outflows (remittances paid + services imports): ${formatPct(outflowRatio)}

## Outbound corridors

${outList || '_No international outbound corridors in this period._'}

## Inbound corridors

${inList || '_No international inbound corridors in this period._'}

Wallets are addresses, not people. Corridors are international only. Methodology: ${SITE}/whitepaper.md
`;

  fs.writeFileSync(path.join(countryDir, `${slug}.md`), body);

  indexRows.push({
    slug,
    name,
    iso,
    rank: row?.adoptionRank ?? 9999,
    outbound,
    line: `- [${name}](${SITE}/country/${slug}.md) ([HTML](${SITE}/country/${slug}))${iso ? ` · ${iso}` : ''}${row?.adoptionRank != null ? ` · rank #${row.adoptionRank}` : ''} · out ${formatUsd(outbound)}`,
  });
}

indexRows.sort((a, b) => a.rank - b.rank || b.outbound - a.outbound || a.name.localeCompare(b.name));

const index = `# Country briefings

> Generated from the live API for ${period}. Same numbers as the SPA. Humans use the HTML page; agents should prefer the \`.md\` file.

Period: ${period} (previous closed month). Methodology: ${SITE}/whitepaper.md

${indexRows.map((row) => row.line).join('\n')}
`;

fs.writeFileSync(path.join(OUT, 'countries.md'), index);

const prev = previousPeriod({ year, month });
const prevPeriod = `${prev.year}-${String(prev.month).padStart(2, '0')}`;
let prevAdoption = [];
let prevCorridors = [];
let prevInsights = {};
let tickers = [];
try {
  [prevAdoption, prevCorridors, prevInsights, tickers] = await Promise.all([
    getJson(apiBase, `/analytics/adoption?year=${prev.year}&month=${prev.month}`),
    getJson(apiBase, `/analytics/corridors?year=${prev.year}&month=${prev.month}`),
    getJson(apiBase, `/analytics/global-insights?year=${prev.year}&month=${prev.month}`),
    getJson(apiBase, `/analytics/corridors/stablecoins?year=${year}&month=${month}`),
  ]);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`Previous-period snapshot incomplete (${message})`);
}

const currentStats = corridorStats(corridors, adoption);
const previousStats = Array.isArray(prevCorridors) ? corridorStats(prevCorridors, Array.isArray(prevAdoption) ? prevAdoption : []) : { volume: 0, dollarization: null, outflowRatio: null };
const wallets = insights?.totalActiveWallets ?? null;
const prevWallets = prevInsights?.totalActiveWallets ?? null;
const periodLabel = `${MONTH_NAMES[month - 1]} ${year}`;
const snapshot = `## Latest closed month (${periodLabel})

Same four homepage insight cards, generated at deploy from \`/v1\` with **all sidebar filters = All**. Previous month is ${prevPeriod}. To slice like the sidebar (token, reference currency, region from/to), use [${SITE}/dataset.md](${SITE}/dataset.md) and recompute.

- Attributed wallets: ${wallets != null ? wallets.toLocaleString('en-US') : '—'} (${formatSignedPct(wallets != null && prevWallets != null ? pctChange(wallets, prevWallets) : null)})
- International corridor volume: ${formatCardUsd(currentStats.volume)} (${formatSignedPct(pctChange(currentStats.volume, previousStats.volume))})
- Corridors vs official outflows (remittances paid + services imports): ${formatCardPct(currentStats.outflowRatio)} (${formatSignedPp(
  currentStats.outflowRatio != null && previousStats.outflowRatio != null
    ? (currentStats.outflowRatio - previousStats.outflowRatio) * 100
    : null,
  1,
)})
- Dollarization (USD-referenced share of corridor volume): ${formatCardPct(currentStats.dollarization)} (${formatSignedPp(
  currentStats.dollarization != null && previousStats.dollarization != null
    ? (currentStats.dollarization - previousStats.dollarization) * 100
    : null,
  2,
)})

Wallets are addresses, not people. Corridors are international only. These headlines are the unfiltered month. A filtered argument is a different number — name the filters.
`;

const editorialIndex = fs.readFileSync(path.resolve(process.cwd(), 'public/index.md'), 'utf8');
fs.writeFileSync(path.join(OUT, 'index.md'), insertBeforeHeading(editorialIndex, '## What it answers', snapshot));

const editorialDataset = fs.readFileSync(path.resolve(process.cwd(), 'public/dataset.md'), 'utf8');
const tickerLine = Array.isArray(tickers) && tickers.length
  ? `\nTickers present in ${period} (sidebar Stablecoin list): ${tickers.join(', ')}.\n`
  : '\n';
fs.writeFileSync(
  path.join(OUT, 'dataset.md'),
  insertBeforeHeading(editorialDataset, '## Sidebar → query', `${snapshot}${tickerLine}`),
);

for (const name of ['llms.txt', 'llms-full.txt']) {
  const source = fs.readFileSync(path.resolve(process.cwd(), `public/${name}`), 'utf8');
  const heading = name === 'llms.txt' ? '## Docs' : '## Questions the product answers';
  fs.writeFileSync(path.join(OUT, name), insertBeforeHeading(source, heading, snapshot));
}

console.log(`Wrote ${indexRows.length} country markdown files for ${period} → ${countryDir}`);
console.log(`Wrote closed-month snapshot (${periodLabel}) to index.md, dataset.md, llms.txt, llms-full.txt`);
