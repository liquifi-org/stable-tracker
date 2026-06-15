import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { DataTable } from '../components/DataTable';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { api, resolveToNumericId, type ApiCountry, type ApiIssuer, type ApiLicense, type ApiReserveType, type CountryOverview, type CountryCorridorBreakdown } from '../services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

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

const CURRENT_YEAR = new Date().getFullYear();

function fmtPct(ratio: number) {
  const pct = ratio * 100;
  if (pct < 0.01) return pct.toFixed(4) + '%';
  if (pct < 1) return pct.toFixed(2) + '%';
  return pct.toFixed(1) + '%';
}

function fmtValue(amount: number) {
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(0)}M`;
  return `$${amount.toLocaleString()}`;
}

export function CountryView() {
  const { countryCode } = useParams<{ countryCode: string }>();
  const navigate = useNavigate();

  const numericId = countryCode ? resolveToNumericId(countryCode) : null;

  const [overview, setOverview] = useState<CountryOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);

  const [corridors, setCorridors] = useState<CountryCorridorBreakdown | null>(null);
  const [corridorsLoading, setCorridorsLoading] = useState(false);

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
    api.getCountryOverview(numericId, CURRENT_YEAR)
      .then(setOverview)
      .catch(() => setOverview(null))
      .finally(() => setOverviewLoading(false));

    setCorridorsLoading(true);
    api.getCountryCorridors(numericId, CURRENT_YEAR)
      .then(setCorridors)
      .catch(() => setCorridors(null))
      .finally(() => setCorridorsLoading(false));

    setRegulatoryLoading(true);
    setApiRegulatory(null);
    Promise.all([
      api.getCountry(numericId),
      api.getCountryIssuers(numericId),
      api.getCountryLicenses(numericId),
      api.getCountryReserveTypes(numericId),
    ])
      .then(([countryDetail, issuers, licenses, reserveTypes]) => {
        setApiRegulatory({ countryDetail, issuers, licenses, reserveTypes });
      })
      .catch(() => setApiRegulatory(null))
      .finally(() => setRegulatoryLoading(false));
  }, [numericId]);

  if (!numericId) {
    return <div>Country not found</div>;
  }

  const outflowColumns = [
    { key: 'toName', header: 'To' },
    {
      key: 'value',
      header: 'Stablecoin volume',
      render: (v: { amount: number }) => fmtValue(v.amount),
    },
  ];

  const inflowColumns = [
    { key: 'fromName', header: 'From' },
    {
      key: 'value',
      header: 'Stablecoin volume',
      render: (v: { amount: number }) => fmtValue(v.amount),
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
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
            {overview?.name ?? apiRegulatory?.countryDetail?.name ?? `Country ${numericId}`}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Country deep dive analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-6 shadow-md">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Population Using Stablecoins</div>
          <div className="text-3xl font-semibold text-slate-800 dark:text-slate-100">
            {overviewLoading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : overview ? fmtPct(overview.adoptionRate) : '—'}
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-6 shadow-md">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Stablecoin TX Value (% of total)</div>
          <div className="text-3xl font-semibold text-slate-800 dark:text-slate-100">
            {overviewLoading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : overview ? fmtPct(overview.txValueShare) : '—'}
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 border border-slate-200/50 dark:border-neutral-700 rounded-lg p-6 shadow-md">
          <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Dollarization Index</div>
          <div className="text-3xl font-semibold text-slate-800 dark:text-slate-100">
            {overviewLoading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : overview ? fmtPct(overview.dollarizationIndex) : '—'}
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
                           { label: 'No Framework', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
              return (
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${cfg.cls}`}>{cfg.label}</span>
              );
            })()}
          </div>
        </div>
        {apiRegulatory?.countryDetail?.regulatorName && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Regulator:{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {apiRegulatory.countryDetail.regulatorName}
            </span>
          </p>
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
                  <div key={issuer.id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <IssuerLogo name={issuer.name} />
                    <div>
                      <span>{issuer.name}</span>
                      {issuer.officialName && issuer.officialName !== issuer.name && (
                        <p className="text-xs text-slate-400">{issuer.officialName}</p>
                      )}
                    </div>
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
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Permitted Reserve Types</h4>
            <div className="space-y-2">
              {regulatoryLoading ? (
                <div className="text-sm text-slate-400 dark:text-slate-500">Loading...</div>
              ) : apiRegulatory?.reserveTypes && apiRegulatory.reserveTypes.length > 0 ? (
                apiRegulatory.reserveTypes.map((rt) => (
                  <div key={rt.id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />
                    {rt.name}
                  </div>
                ))
              ) : apiRegulatory?.countryDetail ? (
                // Fallback: derive from collateral flags on country detail
                <>
                  {apiRegulatory.countryDetail.fiatBacked === 1 && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />Fiat-backed
                      {apiRegulatory.countryDetail.fiatAlert && <span className="text-xs text-slate-400">({apiRegulatory.countryDetail.fiatAlert})</span>}
                    </div>
                  )}
                  {apiRegulatory.countryDetail.cryptoBacked === 1 && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />Crypto-backed
                      {apiRegulatory.countryDetail.cryptoAlert && <span className="text-xs text-slate-400">({apiRegulatory.countryDetail.cryptoAlert})</span>}
                    </div>
                  )}
                  {apiRegulatory.countryDetail.commodityBacked === 1 && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />Commodity-backed
                      {apiRegulatory.countryDetail.commodityAlert && <span className="text-xs text-slate-400">({apiRegulatory.countryDetail.commodityAlert})</span>}
                    </div>
                  )}
                  {apiRegulatory.countryDetail.algorithmBacked === 1 && (
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0" />Algorithm-backed
                      {apiRegulatory.countryDetail.algorithmAlert && <span className="text-xs text-slate-400">({apiRegulatory.countryDetail.algorithmAlert})</span>}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-slate-400 dark:text-slate-500">No reserve type data</div>
              )}
            </div>
          </div>

          {/* Regulatory context */}
          <div className="space-y-3">
            {apiRegulatory?.countryDetail?.regulatorDescription && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Regulatory Overview</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">{apiRegulatory.countryDetail.regulatorDescription}</p>
              </div>
            )}
            {apiRegulatory?.countryDetail?.currency && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Currency</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">{apiRegulatory.countryDetail.currency}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Outflow Corridors</h3>
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
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Inflow Corridors</h3>
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
