# Stablecoin Tracker

Open-source country-level picture of privately issued stablecoin **usage**, **international corridors**, and **regulation**.

- Site: https://stabletracker.org
- Methodology: https://stabletracker.org/whitepaper.md
- Country pages: https://stabletracker.org/countries.md
- Source: https://github.com/liquifi-org/stable-tracker

## What it answers

1. Where are stablecoins used, relative to the size of the economy?
2. Which international routes carry the value, and in which tokens?
3. Can you operate there — is there a live, stablecoin-specific framework?

It does not rank tokens by market cap or price. Supply dashboards answer a different question.

## How the site is organised

Two lenses on the homepage:

- **Where stablecoins are used** — corridor map, country (or APAC / Americas / EMEIA) table, token mix. Insight cards: attributed wallets, international corridor volume, corridors versus official outflows (remittances paid + services imports), USD-referenced share of corridor volume.
- **Can you operate** — usage × rules matrix and regulatory stage map (Stride).

Country briefings at `https://stabletracker.org/country/{slug}` stack scale (GDP intensity and rank, wallets per 100k, share of global corridors, outbound versus official outflows), money (in/out volume, dollarization, token mix), and rules (stage, regulator, reserve-type permissions, licenses).

## Rank and metrics (short)

- **GDP intensity** = outbound international corridor volume ÷ (annual GDP × period months / 12). This is the league table, not wallet counts.
- **Rank** is dense, among countries with positive outbound volume and a GDP figure. Grey on the map means no outbound corridor or no GDP that period, not “zero activity.”
- **Corridors** are Allium `is_adjusted_volume` international pairs. Domestic transfers are excluded. The map merges A↔B; the table keeps In and Out separate.
- **Dollarization** = USD-referenced corridor volume ÷ total corridor volume (Allium field).
- **Outflow ratio** = corridor volume ÷ ((remittances paid + services imports) × period months / 12). Not “share of remittances that are stablecoins.”
- **Regulatory stage** (Stride, stablecoin-specific only): 3 Live, 2 Proposed, 1 Draft, 0 no framework / restricted.

Latest selectable period is the previous calendar month. Current month is never shown as complete.

## Sources

Allium (wallets, corridors), World Bank (population, GDP, remittances, services imports) with IMF / CIA / Wikipedia fallbacks, Stride (rules). Contributing organizations: EY, Allium, Stride, FirmShift.

## Citation

Mikhalev, I., Descamps, T., & van der Burg, S. (2026). Whitepaper: measuring stablecoin usage, corridors, and regulation. Stablecoin Tracker. https://stabletracker.org/whitepaper
