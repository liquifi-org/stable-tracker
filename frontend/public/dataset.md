# Filter the dataset (same as the sidebar)

The homepage right-hand filters map onto `/v1` query parameters. Use these when arguing about a slice (USDC only, from Southeast Asia, July, …). Do not scrape the map. HTML country URLs need JavaScript; prefer this file, `/countries.md`, and `/country/{slug}.md`.

Base: `https://stabletracker.org/v1`

Default in the app (and in the generated markdown snapshot): **previous closed calendar month**, Reference currency **All**, Stablecoin **All**, Region from **All**, Region to **All**. Never treat the current month as complete.

## Sidebar → query

| Sidebar control | Query parameter | Values |
|---|---|---|
| Year | `year` | Integer. Latest allowed is the previous calendar month’s year. |
| Month | `month` | `1`–`12`, not after the previous calendar month. |
| Reference currency | `referenceAsset` | Omit or `All` = no filter. Else `USD` or `EUR`. |
| Stablecoin | `stablecoinId` | Omit or `All` = no filter. Else a ticker from the list endpoint (e.g. `USDT`, `USDC`). Matched case-insensitively to `tokenSymbol`. |
| Region from | `regionFrom` | Omit or `All` = no filter. Exact `WorldRegion` string (below). |
| Region to | `regionTo` | Same as from, destination region. |

List tickers for a period:

```
GET /analytics/corridors/stablecoins?year=2026&month=8
```

## Region strings (exact)

North America, Latin America, Central America, Caribbean, Europe, MENA, Sub-Saharan Africa, South Asia, East Asia, Southeast Asia, Central Asia, Oceania

The API also stores `EU` and `Other`. The sidebar does not offer those two; only send them if you mean the stored value.

## Endpoints the homepage uses

| What the UI shows | Request |
|---|---|
| Attributed wallets card | `GET /analytics/global-insights?year&month` → `totalActiveWallets` |
| Corridor volume, dollarization, pair table, token mix | `GET /analytics/corridors?year&month&referenceAsset&stablecoinId&regionFrom&regionTo` |
| Country table; official-outflows denominator | `GET /analytics/adoption?year&month` |
| Regulatory stage | `GET /countries?pageSize=200` |
| Country briefing | `GET /analytics/countries/{isoNumeric}/overview?year&month` and `.../corridors?year&month` |

Wallets on the homepage are **not** sliced by reference currency, token, or region. Only year/month. Corridor volume, dollarization, and vs-outflows **are** sliced by those corridor filters.

## Recompute the four cards after filtering

Same arithmetic as the SPA.

1. **Attributed wallets** = `global-insights.totalActiveWallets` for that month (ignore corridor filters).
2. **Corridor volume** = sum of `flow.value.amount` on the filtered corridors response. International pairs only; domestic rows are already omitted.
3. **Dollarization** = `sum(amount × dollarizationIndex) / volume`.
4. **Vs outflows** = `volume / sum(officialOutflows)` over adoption rows with `outboundVolume > 0`. `officialOutflows` is remittances paid + services imports, monthly. Not “share of remittances that are stablecoins.”

Month-on-month: call the same endpoints for the previous calendar month, then percent change for wallets and volume, percentage-point change for the two ratios.

## Worked examples

All filters default, August 2026 (closed month as of September 2026):

```
GET https://stabletracker.org/v1/analytics/global-insights?year=2026&month=8
GET https://stabletracker.org/v1/analytics/corridors?year=2026&month=8
GET https://stabletracker.org/v1/analytics/adoption?year=2026&month=8
```

USDC only, sent from Southeast Asia:

```
GET https://stabletracker.org/v1/analytics/corridors?year=2026&month=8&stablecoinId=USDC&regionFrom=Southeast%20Asia
```

USD-referenced, into North America:

```
GET https://stabletracker.org/v1/analytics/corridors?year=2026&month=8&referenceAsset=USD&regionTo=North%20America
```

When you state a filtered figure, name the filters (period, token, regions) so it is not confused with the unfiltered homepage cards.
