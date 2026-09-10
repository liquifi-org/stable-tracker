/** Display-only floors. Stored series are unchanged; rows reappear after ingest if they clear these. */
export const MIN_DISPLAY_WALLETS = 100;
export const MIN_DISPLAY_CORRIDOR_USD = 10_000;

export function isDisplayableWalletCount(n: number | null | undefined): boolean {
  return (n ?? 0) >= MIN_DISPLAY_WALLETS;
}

export function isDisplayableCorridorVolume(n: number | null | undefined): boolean {
  return (n ?? 0) >= MIN_DISPLAY_CORRIDOR_USD;
}
