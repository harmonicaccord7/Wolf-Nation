# Africa country workspaces — October 11, 2026

The owner's homepage screenshot showed static country pills and four green metric boxes. These now navigate to country evidence rather than behaving like unavailable controls. All eleven Africa coverage cards have real destinations.

Country workspaces: Nigeria, South Africa, Egypt, Morocco, Kenya, Ghana, Côte d’Ivoire, Cameroon and Botswana. Each has four registered public World Bank series, history/source access, an official exchange portal, country-specific investigation questions and a local-currency/USD/purchasing-power scenario tool. The pages use normal public readers and retain missing-value, reporting-year and publication-date labels.

## Botswana evidence

- Migration: `20261011171512_add_botswana_macro_series.sql`, registered in production through the connected Supabase project.
- Reuses existing World Bank provider and indicator definitions: GDP growth, inflation, annual-average local units per USD, total reserves.
- A bounded one-page official World Bank response was fetched with pg_net request 6003. The response reports vintage October 8, 2026 and 48 entries. One value was null; 47 valid observations were imported. Raw snapshot SHA-256: `fe99578337ef3262a531815dabaf1ab1e1df39e515d0563371936199f793de84`.
- GDP, inflation and FX: 12 reporting years, 2014–2025. Reserves: 11 years, 2014–2024. The absent 2025 reserve value was not fabricated.
- Inserted data retains country/indicator, reporting year, source URL, raw value, provider, source vintage, snapshot checksum and storage time. Original observations were not overwritten. Existing RLS, grants and credentials are unchanged.
- Existing provider ingestion discovers public World Bank series by provider/country; no paid feed or new secret is introduced.

## Tool interpretation

The currency calculator starts with a USD budget and editable entry/exit local-currency-per-dollar rates. Entry and exit conversion fees are applied; the entered local return covers the whole horizon. It reports final local value, final USD value, USD profit/loss, net local return and local purchasing power after compounded annual inflation. It does not estimate a future rate, return or inflation path. Annual FX references are explicitly not executable current quotes.

Arithmetic tests include a local gain becoming a USD loss after depreciation, fees at both conversions, multi-year inflation, total investment loss and invalid inputs. Registration is tested twice for idempotency and RLS retention. Browser acceptance covers homepage navigation, country data, editable results, invalid rates, Botswana historical data, official IPO sources and landscape layout.

## Official market and IPO source boundaries

Exchange links are source portals, not redistributed quote feeds. Verified source discovery used Nigerian Exchange, Nairobi Securities Exchange, Ghana Stock Exchange, Botswana Stock Exchange, Casablanca Stock Exchange, Egyptian Exchange, BRVM and BVMAC. Some portals denied or timed out for automated retrieval; this increment does not claim their quotes are ingested or current. Source access and licensing still require independent operational checks before building feeds.

The Nigeria page links the issuer's `https://ipo.dangote.com/` and Nigeria SEC's September 14, 2026 notice. The regulator notice records approval for the offer to open; it does not establish the current subscription window or eligibility from all jurisdictions. No price target, subscription application, collection of funds, guaranteed allotment or future IPO result is generated. Check the latest approved prospectus, issuer timetable and authorised channels.

Cameroon's currency discussion cites BEAC's FAQ. XAF and XOF must not be merged into one instrument or one monetary authority. Questions on industry, funding, currency and liquidity are research prompts, not published trade conclusions.

## What remains

- Broader national and regional issuer/regulator/central-bank news ingestion, with dated health checks, source permissions and editorial review.
- Daily local-stock and sovereign-debt histories, corporate-action treatment, dividends and liquidity; required data licences must be checked before redistribution.
- Original reported articles and IPO analysis through the authenticated editorial workflow. Existing World Bank title matching is labelled as incomplete national coverage; regional context is separate.
- Francophone presentation, low-bandwidth acceptance with actual devices and wider continental coverage.
- Country-specific predictive models only after defined targets, frozen data, baseline comparisons and forward validation. The currency tool is arithmetic, not that model.
