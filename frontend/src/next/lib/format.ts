export function fmtPct(ratio: number): string {
  const pct = ratio * 100;
  if (pct < 0.01) return pct.toFixed(4) + '%';
  if (pct < 1) return pct.toFixed(2) + '%';
  return pct.toFixed(1) + '%';
}

export function fmtPer100k(rate: number): string {
  const per100k = rate * 100_000;
  if (per100k >= 100) return per100k.toFixed(0);
  if (per100k >= 10) return per100k.toFixed(1);
  return per100k.toFixed(2);
}
