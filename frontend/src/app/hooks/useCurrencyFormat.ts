import { useEffect, useState } from 'react';
import { useFilters } from '../context/FilterContext';
import { api } from '../services/api';

const SYMBOLS = { USD: '$', EUR: '€' } as const;

/**
 * Fetches the EUR/USD rate for the selected period once (cheap, single row) and exposes a
 * formatter that every $-amount display can share — keeps the USD→EUR conversion in one place
 * instead of duplicated per component. Counts/ranks/percentages should never go through this;
 * only genuine USD amounts (corridor volume, remittances, tx volume) do.
 */
export function useCurrencyFormat() {
  const { displayCurrency, setDisplayCurrency, year, month } = useFilters();
  const [usdPerEur, setUsdPerEur] = useState<number | null>(null);

  useEffect(() => {
    if (displayCurrency === 'USD') return;
    api.getExchangeRate(year, month)
      .then(setUsdPerEur)
      .catch(() => setUsdPerEur(null));
  }, [displayCurrency, year, month]);

  const convert = (amountUsd: number): number => {
    if (displayCurrency === 'USD' || !usdPerEur) return amountUsd;
    return amountUsd / usdPerEur;
  };

  /** Compact "$1.2B" / "€450M" / "$83K" style formatting. */
  const formatCurrency = (amountUsd: number): string => {
    const amount = convert(amountUsd);
    const symbol = SYMBOLS[displayCurrency];
    if (amount >= 1e9) return `${symbol}${(amount / 1e9).toFixed(1)}B`;
    if (amount >= 1e6) return `${symbol}${(amount / 1e6).toFixed(0)}M`;
    if (amount >= 1e3) return `${symbol}${(amount / 1e3).toFixed(0)}K`;
    return `${symbol}${amount.toLocaleString()}`;
  };

  return {
    displayCurrency,
    setDisplayCurrency,
    formatCurrency,
    convert,
    rateReady: displayCurrency === 'USD' || usdPerEur !== null,
  };
}
