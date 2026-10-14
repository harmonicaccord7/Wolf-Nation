# Complete annual-chart range reuse — October 14, 2026

Annual series default to MAX and the server already loads all available stored rows, up to its explicit truncation boundary. Nevertheless, changing range made a new request each time. If that request failed, the chart correctly retained its prior view but could not select even a shorter window already available in memory.

The chart now filters its existing snapshot locally only when the initial payload is annual, MAX (including the annual default), and untruncated. Source dates, provider labels, genuine zero values, gaps, selected-point reset and the original as-of cutoff are retained. Short windows can honestly be empty; returning to MAX restores the same available history. This is range selection, not a data refresh or a claim of newer annual releases.

Partial annual payloads, truncated MAX payloads, daily/market histories and other frequencies still use the existing no-store endpoint path. A failed remote request still reports an error and retains the previous range. No endpoint, provider observation, definition, database, RLS, model, credential, newsletter or payment behavior changes.

## Verification

The real component handlers are exercised with isolated state and synthetic endpoint responses: complete annual history survives an endpoint outage without requests; partial/truncated/daily/market cases still fetch; remote failure preserves the prior view. The new outage assertion fails against the original component and passes with the change. Fixtures perform no real provider calls or database writes.

The existing desktop/phone annual browser case now deliberately returns 503 for any subsequent series-range request. It requires selecting 30D, displaying the honest empty period, restoring MAX, keeping controls enabled and making zero requests. No prior assertion, browser retry policy or device profile was removed. Existing daily Bitcoin range checks remain.

The earlier Safari annual-range CI failure is preserved in PR #45's evidence. This change removes a concrete unnecessary request dependency; it does not establish the exact cause of that earlier failure. Read the focused PR and current main for actual final-head checks, merge and production evidence.

## Production checkpoint before this change

Main `31bc475eb48d6a1c15115a554798db85305ede24` (PR #46) has green main CI `38443728744` and intended Vercel production `HUBpuF5s8xjrtPbwpKNGkQmicS6R`. Public status at 06:48 UTC on October 14 was OPERATIONAL, with 64,220 source-labelled observations, a four-minute-old market snapshot and six current source checks at 06:05 UTC. Publisher dates remain distinct from check times; North Africa's latest item is still September 22.

Read-only Supabase audit at `2026-10-14T06:46:21.342258Z`: 39 newsletter drafts, none published, database 79,850,643 bytes. K-EDGE 0.1 and K-BTC-24H 0.1.0 remain experimental. The actual newsletter editor browser is signed out. The owner's prior content review is acknowledged; genuine sign-in and an authenticated publication transition are still needed. The security advisor still reports leaked-password protection disabled; the owner-managed eligible-plan/Auth-setting action remains separate. No credentials or private forecasts are exposed or changed.
