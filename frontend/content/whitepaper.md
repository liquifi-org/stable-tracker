# Measuring stablecoin usage, corridors, and regulation

Whitepaper · v1.4 · 10 September 2026  
Living methodology for https://stabletracker.org  
HTML: https://stabletracker.org/whitepaper

Key authors: Igor Mikhalev (im@c20.org), Tatiana Descamps, Silke van der Burg, Roeland Hooijmans.

Cite: Mikhalev, I., Descamps, T., van der Burg, S., & Hooijmans, R. (2026). Whitepaper: measuring stablecoin usage, corridors, and regulation (v1.4). Stablecoin Tracker. https://stabletracker.org/whitepaper

## Abstract

Stablecoins now settle value across borders at a scale that official payment statistics still barely see. Policymakers, operators, and researchers nevertheless lack a shared, country-level picture of *where* these instruments are used, *which corridors* carry the volume, and *which jurisdictions* have a live rulebook. Stablecoin Tracker is an open-source observatory that joins on-chain wallet and corridor observations with official population, GDP, remittance, and services-import series and with a country-level regulatory taxonomy.

This paper is the specification behind stabletracker.org. It defines every headline metric, states the sources and join keys, and documents the limits of the evidence.

## 1. Purpose

Three questions recur when stablecoins are treated as money, not as a trading pair:

1. Where are they actually used, relative to the size of the economy?
2. Which international routes carry the value, and in which tokens?
3. Can you operate there — is there a live, stablecoin-specific framework?

Most public dashboards answer supply and price instead. Those figures do not tell you whether Nigeria looks different from the Netherlands, whether a corridor is a remittance rail or a treasury hop, or whether a large wallet base sits inside a live regime.

Relation to [CBDC Tracker](https://cbdctracker.org): that project catalogues sovereign digital-currency *initiatives*. This tracker catalogues privately issued stablecoins as they are *used*. The two maps should be read together.

## 2. Design principles

- **Scale versus the economy.** The league table is outbound international corridors divided by period GDP. Wallet counts stay on the overview table; wallets per 100,000 people stay on the country briefing. Neither is the rank.
- **International corridors only.** The map and corridor tables show cross-border pairs. Domestic stablecoin volume is real and large in some markets; it is not in this dataset.
- **Usage × rules.** A live framework without usage, or heavy usage without a framework, are different operating environments. The regulatory view is a join of GDP intensity and Stride stage, not a heat map of friendliness.
- **Closed months.** The latest selectable period is the previous calendar month. The current month is never shown as complete.
- **Named sources.** On-chain activity is Allium. Population is World Bank SP.POP.TOTL, with CIA Factbook and Wikipedia fallbacks (Taiwan is the usual case). Remittance outflows are World Bank. Nominal GDP is World Bank NY.GDP.MKTP.CD, with IMF WEO, CIA Factbook, and Wikipedia fallbacks. Regulatory stage, licenses, and reserve-type permissions are Stride.

## 3. Metrics

All country keys are ISO 3166-1 numeric codes, zero-padded to three characters (for example `840` for the United States).

### 3.1 Active wallets

For a country and a month YYYY-MM, active wallets are the Allium snapshot of addresses holding stablecoins attributed to that country. A wallet is an address, not a person. Treat the series as a lower-bound activity signal, not a census.

### 3.2 Wallet penetration

wallet penetration = active wallets ÷ population

Population is World Bank `SP.POP.TOTL` first, then CIA / Wikipedia. Country briefings also show wallets per 100,000 people. This is **not** the country rank.

### 3.3 GDP intensity and adoption rank

GDP intensity = outbound corridor volume ÷ (annual GDP × period months / 12)

Outbound volume is the Allium international corridor total for the sender country in the selected period. GDP is annual nominal GDP in current US dollars, pro-rated to the period. Primary source: World Bank `NY.GDP.MKTP.CD`.

Intensity is a scale label, not a 0–100% finish line. A 3% month means outbound corridors were large relative to one-twelfth of annual GDP, not that 3% of the economy “adopted” stablecoins.

Rank is dense and 1-based, among countries with **positive outbound corridor volume and a GDP figure**. Grey on the map means no outbound corridor or no GDP, not zero real-world activity.

### 3.4 Corridor volume

One Allium aggregate per (sender × receiver × token) per month from `stablecoins.intelligence.enriched_transfers`, restricted to `is_adjusted_volume` (Visa methodology): organic addresses, bot / MEV / short-term-routing flags. That strips DEX liquidity legs, exchange hot-wallet hops, bridges, and most pump-style routing. It is not a remittance series.

The overview **map** merges A→B with B→A. The overview **table** lists countries as origins with In and Out separate. Domestic (sender = receiver) rows are not displayed. Regional corridors roll pairs into APAC, Americas, and EMEIA, dropping intra-region flows.

### 3.5 Dollarization index

dollarization = USD-referenced stablecoin volume ÷ total corridor volume

“USD-referenced” follows Allium’s `usdStablecoinVolume` field.

### 3.6 Volume versus official outflows

outflow ratio = corridor volume ÷ ((remittances paid + services imports) × period months / 12)

Remittances: World Bank `BM.TRF.PWKR.CD.DT` (fallbacks `BM.TRF.PRVT.CD` or national BOP). Services imports: `BM.GSR.NFSV.CD` (2018+). Goods imports are excluded. A high ratio means the rail is large relative to recorded household plus service outflows, **not** “X% of remittances are stablecoins.”

### 3.7 Regulatory stage

Ingested from Stride only when the framework is stablecoin-specific. Otherwise stored as 0.

| Stage | Label | Meaning |
| --- | --- | --- |
| 3 | Live | A stablecoin-specific regime is in force |
| 2 | Proposed | A specific regime has been put forward |
| 1 | Draft | Work is underway; not yet proposed as law |
| 0 | No framework / restricted | No stablecoin-specific framework, or activity is restricted |

### 3.8 Market classification

Reading aids, not scores. Necessity markets: material usage without a live framework. Remittance corridors: outbound ≥ 15% of remittances paid (not the widened §3.6 basket). Infrastructure markets: live rules, large wallet base, low population penetration. Digital-dollar savings: USD-referenced share ≥ 55%.

## 4. Data sources

| Series | Source | Cadence | Join |
| --- | --- | --- | --- |
| Wallets holding stablecoins | Allium Explorer | Monthly snapshot | Country → ISO numeric |
| International corridor volume | Allium `enriched_transfers`, `is_adjusted_volume` | Monthly snapshot | Sender / receiver country |
| Population | World Bank `SP.POP.TOTL`; CIA / Wikipedia fallback | Yearly | ISO alpha-3 → numeric |
| Nominal GDP | World Bank `NY.GDP.MKTP.CD`; IMF WEO / CIA / Wikipedia fallback | Yearly, pro-rated | ISO alpha-3 → numeric |
| Remittances paid | World Bank `BM.TRF.PWKR.CD.DT` | Yearly, pro-rated | ISO alpha-3 → numeric |
| Services imports | World Bank `BM.GSR.NFSV.CD` (2018+) | Yearly, pro-rated | ISO alpha-3 → numeric |
| Stage, licenses, reserve types | [Stride](https://tracker.stride.sc) | As published | Stride country id → numeric |

Contributing organizations: EY, Allium, Stride, FirmShift.

## 5. How to read the tracker

**Overview.** Two lenses: *Where stablecoins are used* and *Can you operate*. Four insight cards sit above the map: wallets, international corridor volume, corridors versus official outflows, dollarization. Usage view is the corridor map, country/region table, and token mix. Regulatory view is the usage × rules matrix plus the stage map.

**Country briefing.** Unit of analysis. Scale (GDP intensity and rank, wallets per 100k, share of global corridors, outbound versus official outflows), money (in/out, dollarization, token mix), rules (stage, regulator, reserve types, licenses). URLs: https://stabletracker.org/countries.md

**Colours.** Warm usage colours are GDP-intensity rank — not “good.” Stage colours are a four-state taxonomy — not a recommended-jurisdiction list. Grey is “no outbound corridor or no GDP this period.”

## 6. Limitations

- Wallets are not people.
- Geography is attributed, not observed at the passport.
- Domestic volume is omitted.
- Outflow ratios compare unlike series.
- Adjusted volume is not a census of payments (CEX hops excluded).
- Coverage follows the sources. A missing country is not evidence of prohibition.
- Corridor geography is narrower than the wallet map.
- GDP vintages differ.
- This is not legal, investment, or compliance advice. See https://stabletracker.org/legal-disclaimer

## 7. Open source and reuse

https://github.com/liquifi-org/stable-tracker — frontend reads `/v1`. Reproduce a number from the repository rather than by scraping the map. Name the series and the month when republishing.

## 8. What comes next

Domestic volume as a labelled series; geo-confidence flags; chain- and issuer-level cuts; richer history; machine-readable downloads of monthly snapshots.

## References

1. Allium — https://www.allium.so
2. World Bank population — https://data.worldbank.org/indicator/SP.POP.TOTL
3. World Bank GDP — https://data.worldbank.org/indicator/NY.GDP.MKTP.CD
4. World Bank remittances paid — https://data.worldbank.org/indicator/BM.TRF.PWKR.CD.DT
5. World Bank service imports — https://data.worldbank.org/indicator/BM.GSR.NFSV.CD
6. IMF World Economic Outlook — https://www.imf.org/en/Publications/WEO
7. CIA World Factbook — https://www.cia.gov/the-world-factbook/
8. Stride Stablecoin Regulation Tracker — https://tracker.stride.sc
9. CBDC Tracker white paper — https://cbdctracker.org/cbdc-tracker-whitepaper.pdf
