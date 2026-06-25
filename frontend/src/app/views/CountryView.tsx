import { useEffect, useMemo, useState, type ComponentType } from 'react';
import { useParams, useNavigate } from 'react-router';
import { DataTable } from '../components/DataTable';
import { CountryFlag } from '../components/CountryFlag';
import {
  ArrowLeft, CheckCircle2, Loader2, XCircle, MinusCircle, Banknote, Coins, Gem, Cpu,
  Trophy, Wallet, ArrowLeftRight, Percent, ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react';
import { api, resolveToNumericId, type ApiCountry, type ApiIssuer, type ApiLicense, type ApiReserveType, type CountryOverview, type CountryCorridorBreakdown } from '../services/api';
import { useFilters, getPreviousPeriod } from '../context/FilterContext';
import { useCurrencyFormat } from '../hooks/useCurrencyFormat';
import { TrendBadge } from '../components/TrendBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/tooltip';

/** Map of known stablecoin issuer name keywords → Clearbit logo domain */
const ISSUER_DOMAINS: Record<string, string> = {
  tether: 'tether.to',
  circle: 'circle.com',
  makerdao: 'makerdao.com',
  maker: 'makerdao.com',
  sky: 'sky.money',
  paxos: 'paxos.com',
  binance: 'binance.com',
  coinbase: 'coinbase.com',
  paypal: 'paypal.com',
  ripple: 'ripple.com',
  gemini: 'gemini.com',
  'first digital': 'firstdigital.com',
  frax: 'frax.finance',
  aave: 'aave.com',
  curve: 'curve.fi',
  angle: 'angle.money',
  agora: 'agora.finance',
  ondo: 'ondo.finance',
  reserve: 'reserve.org',
  bitfinex: 'bitfinex.com',
  kraken: 'kraken.com',
  trueusd: 'trueusd.com',
  'true usd': 'trueusd.com',
  stasis: 'stasis.net',
  monerium: 'monerium.com',
  anchored: 'anchored-coins.com',
  societe: 'societegenerale.com',
  'société générale': 'societegenerale.com',
};

function getIssuerDomain(name: string): string | null {
  const lower = name.toLowerCase();
  for (const [keyword, domain] of Object.entries(ISSUER_DOMAINS)) {
    if (lower.includes(keyword)) return domain;
  }
  return null;
}

/** Shows Clearbit logo or an initials fallback */
function IssuerLogo({ name }: { name: string }) {
  const [failed, setFailed] = useState(false);
  const domain = getIssuerDomain(name);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

  if (domain && !failed) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt={name}
        onError={() => setFailed(true)}
        className="w-6 h-6 rounded-full object-contain bg-white border border-slate-200 dark:border-neutral-600 shrink-0 p-0.5"
      />
    );
  }
  return (
    <div
      className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
      style={{ backgroundColor: 'var(--brand)' }}
    >
      {initials}
    </div>
  );
}

const RESERVE_TYPE_DEFS: {
  key: 'fiatBacked' | 'cryptoBacked' | 'commodityBacked' | 'algorithmBacked';
  alertKey: 'fiatAlert' | 'cryptoAlert' | 'commodityAlert' | 'algorithmAlert';
  label: string;
  Icon: ComponentType<{ className?: string }>;
}[] = [
  { key: 'fiatBacked',      alertKey: 'fiatAlert',       label: 'Fiat-backed',      Icon: Banknote },
  { key: 'cryptoBacked',    alertKey: 'cryptoAlert',     label: 'Crypto-backed',    Icon: Coins },
  { key: 'commodityBacked', alertKey: 'commodityAlert',  label: 'Commodity-backed', Icon: Gem },
  { key: 'algorithmBacked', alertKey: 'algorithmAlert',  label: 'Algorithm-backed', Icon: Cpu },
];

/** Stride's country id for "European Union (EU)" — covers MiCA-passported issuers/licenses
 *  that apply across member states regardless of which national regulator granted them. */
const EU_COUNTRY_ID = 999;

/** Country's own entries first, then any EU-level ones not already present (by key). */
function mergeUnique<T>(own: T[], extra: T[], keyFn: (item: T) => string | number): T[] {
  const seen = new Set(own.map(keyFn));
  return [...own, ...extra.filter((item) => !seen.has(keyFn(item)))];
}

function fmtPct(ratio: number) {
  const pct = ratio * 100;
  if (pct < 0.01) return pct.toFixed(4) + '%';
  if (pct < 1) return pct.toFixed(2) + '%';
  return pct.toFixed(1) + '%';
}

export function CountryView() {
  const { countryCode } = useParams<{ countryCode: string }>();
  const navigate = useNavigate();
  const filters = useFilters();
  const { formatCurrency } = useCurrencyFormat();

  const numericId = countryCode ? resolveToNumericId(countryCode) : null;

  const [overview, setOverview] = useState<CountryOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const [corridors, setCorridors] = useState<CountryCorridorBreakdown | null>(null);
  const [corridorsLoading, setCorridorsLoading] = useState(false);

  const [previousOverview, setPreviousOverview] = useState<CountryOverview | null>(null);
  const [previousCorridors, setPreviousCorridors] = useState<CountryCorridorBreakdown | null>(null);
  const previousPeriod = getPreviousPeriod(filters.year, filters.month);

  const [regulatoryLoading, setRegulatoryLoading] = useState(false);
  const [licensesDialogOpen, setLicensesDialogOpen] = useState(false);
  const LICENSE_PREVIEW = 4;
  const [apiRegulatory, setApiRegulatory] = useState<{
    countryDetail: ApiCountry | null;
    issuers: ApiIssuer[];
    licenses: ApiLicense[];
    reserveTypes: ApiReserveType[];
  } | null>(null);

  useEffect(() => {
    if (!numericId) return;

    setOverviewLoading(true);
    api.getCountryOverview(numericId, filters.year, filters.month)
      .then(setOverview)
      .catch(() => setOverview(null))
      .finally(() => setOverviewLoading(false));

    setCorridorsLoading(true);
    api.getCountryCorridors(numericId, filters.year, filters.month)
      .then(setCorridors)
      .catch(() => setCorridors(null))
      .finally(() => setCorridorsLoading(false));
  }, [numericId, filters.year, filters.month]);

  useEffect(() => {
    if (!numericId) return;

    api.getCountryOverview(numericId, previousPeriod.year, previousPeriod.month)
      .then(setPreviousOverview)
      .catch(() => setPreviousOverview(null));

    api.getCountryCorridors(numericId, previousPeriod.year, previousPeriod.month)
      .then(setPreviousCorridors)
      .catch(() => setPreviousCorridors(null));
  }, [numericId, previousPeriod.year, previousPeriod.month]);

  useEffect(() => {
    if (!numericId) return;

    setRegulatoryLoading(true);
    setApiRegulatory(null);
    Promise.all([
      api.getCountry(numericId),
      api.getCountryIssuers(numericId),
      api.getCountryLicenses(numericId),
      api.getCountryReserveTypes(numericId),
    ])
      .then(async ([countryDetail, issuers, licenses, reserveTypes]) => {
        // EU member states are also covered by MiCA-passported EU-level issuers/licenses
        // (Stride country 999), in addition to whatever the country has nationally.
        if (countryDetail.region === 'EU' && numericId !== EU_COUNTRY_ID) {
          const [euIssuers, euLicenses] = await Promise.all([
            api.getCountryIssuers(EU_COUNTRY_ID).catch(() => []),
            api.getCountryLicenses(EU_COUNTRY_ID).catch(() => []),
          ]);
          issuers = mergeUnique(issuers, euIssuers, (i) => i.issuerId);
          licenses = mergeUnique(licenses, euLicenses, (l) => l.licenseId);
        }
        setApiRegulatory({ countryDetail, issuers, licenses, reserveTypes });
      })
      .catch(() => setApiRegulatory(null))
      .finally(() => setRegulatoryLoading(false));
  }, [numericId]);

  const totalInbound = useMemo(
    () => (corridors?.inflows ?? []).reduce((sum, f) => sum + f.value.amount, 0),
    [corridors]
  );
  const totalOutbound = useMemo(
    () => (corridors?.outflows ?? []).reduce((sum, f) => sum + f.value.amount, 0),
    [corridors]
  );
  const previousTotalInbound = useMemo(
    () => (previousCorridors?.inflows ?? []).reduce((sum, f) => sum + f.value.amount, 0),
    [previousCorridors]
  );
  const previousTotalOutbound = useMemo(
    () => (previousCorridors?.outflows ?? []).reduce((sum, f) => sum + f.value.amount, 0),
    [previousCorridors]
  );

  const pctChange = (current: number, previous: number): number | null =>
    previous > 0 ? ((current - previous) / previous) * 100 : null;

  const rankDelta =
    overview?.adoptionRank != null && previousOverview?.adoptionRank != null
      ? previousOverview.adoptionRank - overview.adoptionRank
      : null;
  const walletsChangePct =
    overview && previousOverview ? pctChange(overview.activeWallets, previousOverview.activeWallets) : null;
  const dollarizationChangePp =
    overview && previousOverview ? (overview.dollarizationIndex - previousOverview.dollarizationIndex) * 100 : null;
  const inboundChangePct = pctChange(totalInbound, previousTotalInbound);
  const outboundChangePct = pctChange(totalOutbound, previousTotalOutbound);

  if (!numericId) {
    return <div>Country not found</div>;
  }

  const outflowColumns = [
    { key: 'toName', header: 'To' },
    {
      key: 'value',
      header: 'Stablecoin volume',
      render: (v: { amount: number }) => formatCurrency(v.amount),
    },
  ];

  const inflowColumns = [
    { key: 'fromName', header: 'From' },
    {
      key: 'value',
      header: 'Stablecoin volume',
      render: (v: { amount: number }) => formatCurrency(v.amount),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-700 rounded transition-all duration-300 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-neutral-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
            {overview?.isoAlpha2 && <CountryFlag isoAlpha2={overview.isoAlpha2} className="w-7 h-7" />}
            {overview?.name ?? apiRegulatory?.countryDetail?.name ?? `Country ${numericId}`}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Country deep dive analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-6 shadow-md flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[var(--brand-100)] dark:bg-[var(--brand-900)]/40 text-[var(--brand)] dark:text-[var(--brand-300)]">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Adoption Index (Rank)</div>
            <div className="flex items-center gap-2 text-2xl font-semibold text-slate-800 dark:text-slate-100">
              {overviewLoading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              ) : overview?.adoptionRank != null ? (
                <>#{overview.adoptionRank}<span className="text-sm text-slate-400 font-normal"> of {overview.eligibleCountries}</span></>
              ) : (
                '—'
              )}
              <TrendBadge value={rankDelta} format={(v) => String(v)} />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-6 shadow-md flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[var(--brand-100)] dark:bg-[var(--brand-900)]/40 text-[var(--brand)] dark:text-[var(--brand-300)]">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Wallets Holding Stablecoins</div>
            <div className="flex items-center gap-2 text-2xl font-semibold text-slate-800 dark:text-slate-100">
              {overviewLoading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : overview && overview.activeWallets > 0 ? overview.activeWallets.toLocaleString() : '—'}
              <TrendBadge value={walletsChangePct} format={(v) => `${v.toFixed(2)}%`} />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-6 shadow-md flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[var(--brand-100)] dark:bg-[var(--brand-900)]/40 text-[var(--brand)] dark:text-[var(--brand-300)]">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Corridor Volume</div>
            {corridorsLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <ArrowDownToLine className="w-3.5 h-3.5" /> In
                  </span>
                  <span className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
                    {totalInbound > 0 ? formatCurrency(totalInbound) : '—'}
                    <TrendBadge value={inboundChangePct} format={(v) => `${v.toFixed(2)}%`} />
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <ArrowUpFromLine className="w-3.5 h-3.5" /> Out
                  </span>
                  <span className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
                    {totalOutbound > 0 ? formatCurrency(totalOutbound) : '—'}
                    <TrendBadge value={outboundChangePct} format={(v) => `${v.toFixed(2)}%`} />
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-6 shadow-md flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[var(--brand-100)] dark:bg-[var(--brand-900)]/40 text-[var(--brand)] dark:text-[var(--brand-300)]">
            <Percent className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">Dollarization Index</div>
            <div className="flex items-center gap-2 text-2xl font-semibold text-slate-800 dark:text-slate-100">
              {overviewLoading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : overview && overview.dollarizationIndex > 0 ? fmtPct(overview.dollarizationIndex) : '—'}
              <TrendBadge value={dollarizationChangePp} format={(v) => `${v.toFixed(2)}pp`} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-6 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Regulation</h3>
          <div className="flex items-center gap-2">
            {regulatoryLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            {apiRegulatory?.countryDetail && (() => {
              const s = apiRegulatory.countryDetail.stage;
              const cfg =
                s === 3 ? { label: 'Live', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' } :
                s === 2 ? { label: 'Proposed', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' } :
                s === 1 ? { label: 'Draft', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' } :
                           { label: 'No Framework/Banned', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
              return (
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${cfg.cls}`}>{cfg.label}</span>
              );
            })()}
          </div>
        </div>
        {apiRegulatory?.countryDetail && (
          <div className="space-y-1 mb-4 text-sm text-slate-500 dark:text-slate-400">
            {apiRegulatory.countryDetail.regulatorName && (
              <p>
                Regulator:{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {apiRegulatory.countryDetail.regulatorName}
                </span>
              </p>
            )}
            {apiRegulatory.countryDetail.regulatorDescription && (
              <p>
                Regulatory Overview:{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {apiRegulatory.countryDetail.regulatorDescription}
                </span>
              </p>
            )}
            {apiRegulatory.countryDetail.currency && (
              <p>
                Currency:{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {apiRegulatory.countryDetail.currency}
                </span>
              </p>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-6">
          {/* Authorized Issuers */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Authorized Stablecoin Issuers</h4>
            <div className="space-y-2">
              {regulatoryLoading ? (
                <div className="text-sm text-slate-400 dark:text-slate-500">Loading...</div>
              ) : apiRegulatory?.issuers && apiRegulatory.issuers.length > 0 ? (
                apiRegulatory.issuers.map((issuer) => (
                  <div key={issuer.issuerId} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <IssuerLogo name={issuer.name} />
                    <span>{issuer.name}</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-400 dark:text-slate-500">No authorized issuers found</div>
              )}
            </div>
          </div>

          {/* Licenses */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Licenses & Regulatory Frameworks</h4>
            <div className="space-y-2">
              {regulatoryLoading ? (
                <div className="text-sm text-slate-400 dark:text-slate-500">Loading...</div>
              ) : apiRegulatory?.licenses && apiRegulatory.licenses.length > 0 ? (
                <>
                  {apiRegulatory.licenses.slice(0, LICENSE_PREVIEW).map((license) => (
                    <div key={license.licenseId} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-[var(--brand)] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium">{license.name}</span>
                        {license.type && (
                          <p className="text-xs text-slate-400 mt-0.5">{license.type}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {apiRegulatory.licenses.length > LICENSE_PREVIEW && (
                    <button
                      onClick={() => setLicensesDialogOpen(true)}
                      className="text-xs text-[var(--brand)] hover:text-[var(--brand-700)] dark:text-[var(--brand-300)] dark:hover:text-[var(--brand-200)] mt-1 underline-offset-2 hover:underline transition-all duration-300"
                    >
                      Show {apiRegulatory.licenses.length - LICENSE_PREVIEW} more…
                    </button>
                  )}

                  <Dialog open={licensesDialogOpen} onOpenChange={setLicensesDialogOpen}>
                    <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
                      <DialogHeader>
                        <DialogTitle>Licenses & Regulatory Frameworks</DialogTitle>
                      </DialogHeader>
                      <div className="overflow-y-auto flex-1 space-y-3 pr-1">
                        {apiRegulatory.licenses.map((license) => (
                          <div key={license.licenseId} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-neutral-700 pb-3 last:border-0">
                            <CheckCircle2 className="w-4 h-4 text-[var(--brand)] shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium">{license.name}</p>
                              {license.type && (
                                <p className="text-xs text-slate-400 mt-0.5">{license.type}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </>
              ) : (
                <div className="text-sm text-slate-400 dark:text-slate-500">No licenses found</div>
              )}
            </div>
          </div>

          {/* Reserve Types */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Reserve Types</h4>
            {regulatoryLoading ? (
              <div className="text-sm text-slate-400 dark:text-slate-500">Loading...</div>
            ) : apiRegulatory?.countryDetail ? (
              <div className="space-y-2">
                {RESERVE_TYPE_DEFS.map(({ key, alertKey, label, Icon }) => {
                  const cd = apiRegulatory.countryDetail!;
                  const value = cd[key];
                  const alert = cd[alertKey];
                  const allowed = value === 1;
                  const prohibited = value === 0;
                  const StatusIcon = allowed ? CheckCircle2 : prohibited ? XCircle : MinusCircle;
                  const statusCls = allowed
                    ? 'text-green-500'
                    : prohibited
                    ? 'text-red-500'
                    : 'text-slate-300 dark:text-slate-600';

                  return (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      <Icon className="w-4 h-4 text-purple-500 shrink-0" />
                      <span className="flex-1 text-slate-600 dark:text-slate-300">{label}</span>
                      {alert ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex shrink-0 cursor-help">
                              <StatusIcon className={`w-4 h-4 ${statusCls}`} />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">{alert}</TooltipContent>
                        </Tooltip>
                      ) : (
                        <StatusIcon className={`w-4 h-4 ${statusCls} shrink-0`} />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-slate-400 dark:text-slate-500">No reserve type data</div>
            )}
          </div>

        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <ArrowUpFromLine className="w-5 h-5 text-[var(--brand)]" />
            Outflow Corridors
          </h3>
          {corridorsLoading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm p-4"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
          ) : corridors && corridors.outflows.length > 0 ? (
            <DataTable data={corridors.outflows} columns={outflowColumns} pageSize={5} />
          ) : (
            <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-6 text-center text-slate-500 dark:text-slate-400">
              No outflow corridors available
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-[var(--brand)]" />
            Inflow Corridors
          </h3>
          {corridorsLoading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm p-4"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
          ) : corridors && corridors.inflows.length > 0 ? (
            <DataTable data={corridors.inflows} columns={inflowColumns} pageSize={5} />
          ) : (
            <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-6 text-center text-slate-500 dark:text-slate-400">
              No inflow corridors available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
