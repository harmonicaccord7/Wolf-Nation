# Africa Share & IPO Review — 13 October 2026

This increment supplies a free local-only company-review worksheet at /africa/share-review. All nine country workspaces link to it with the country context; the Africa desk, public search and sitemap also expose it. It does not ingest a local-equity quote or company statement.

Readers enter a share/offer price, cash budget, broker lot size, percentage fees, assumed price change and independently chosen dividend cash per share. Optional historical annual EPS, dividends and book value produce P/E, earnings yield, past dividend yield, payout and price/book. Empty inputs and non-positive denominators remain unavailable. A past dividend does not populate a future assumption.

Whole lots fit within the budget including entry fees. Six-decimal integer input arithmetic prevents floating-point boundary errors in affordability, including a 3.19 budget for a ten-share lot at 0.29 with 10% fees. The selected case and ±20% teaching cases show final cash, profit/loss and return after the entered percentage fees. Capital at risk, unused cash, dividend cash and the conditional break-even price are visible. There is no trade, leverage, price probability or suitability rating.

## Evidence and privacy

- Figures start empty. A deliberately labelled hypothetical company can be loaded for teaching; it is never presented as an issuer or source observation.
- Changing country clears all figures and source notes rather than silently assigning a different currency.
- Optional source URL, document date and accounts-period notes are explicitly user-supplied and unverified. Invalid future dates, non-HTTPS/credential-bearing links and control characters block the export.
- Inputs stay in the browser tab. There is no account/API write, tracking addition, entitlement, payment or publication transition.
- CSV includes the inputs, manual evidence notes, result, missingness, limitations and calculation version. Text cells that could be interpreted as spreadsheet formulas are escaped.
- Existing currency/inflation tools remain a separate next step; no private assumptions are put in navigation URLs.
- Tables and monetary values are usable on small screens with an internally scrolling table. Phone landscape is included in browser acceptance; this is emulation, not physical-device or rural-connectivity proof.

## Financial scope and source checks

General formulas and reading guidance were verified on 13 October 2026 against:

- https://www.sec.gov/about/reports-publications/investorpubsbegfinstmtguide
- https://www.investor.gov/introduction-investing/investing-basics/glossary/price-earnings-pe-ratio
- https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks

The tool gives arithmetic from the reader's inputs. Taxes, spreads, fixed fees, custody, dividend eligibility, currency, inflation, transfer rules, IPO allotment and the ability to sell are outside that arithmetic. An official exchange portal is an external evidence source, not an ingested live feed. Issuer financial data, local market access and current IPO availability still require their own verification.

## Verification

Relevant QA covers fees, dividend separation, whole-lot affordability, exact boundary cases, zero exit price, safe quantity ranges, analytic break-even, missing/zero/negative denominators, invalid inputs, source-note dates/URLs and CSV formula protection. Browser tests verify country discovery, ratios, an unaffordable lot, invalid recovery/export withholding, country-change clearing, search/sitemap, local export and no POST of entered figures. The full CI suite and intended preview must pass on the checked commit before merge; production acceptance is recorded in the focused PR after deployment.

No Supabase migration, policy, credential or model artifact changes. Authenticated reader/editor acceptance remains separate and requires a genuine session. The owner already reviewed the newsletter content; do not ask for generic editorial review again or impersonate approval.
