# Private Decision Lab scenarios — 12 October 2026

Readers can name a Decision Lab case, save it to their account and reopen it later or on another device. The free calculator and CSV remain available without an account. Saving does not join the newsletter, create a subscription or enable payment.

## What a saved case preserves

Each immutable case stores the asset, eight validated numerical inputs, creation time and calculation version `decision-lab-1.0`. Where a source reference is supplied, the database verifies the original asset/provider/value/timestamp against an accessible public observation and stores that reference with its source-row identifier. A custom/manual case explicitly has no provider reference. User-entered prices can differ from the stored reference; both are retained and labelled.

Opening a case restores its inputs and original reference rather than loading today's price. The existing explicit refresh button changes only the reference price and source. Editing and saving makes a new case; it does not replace earlier evidence. Hypothetical option premiums and final price changes remain assumptions, with no probability, executed trade or realised-return claim.

## Privacy, bounds and repeat requests

Only the owner can read, create or delete through authenticated RLS. There is no staff-role exception. Anonymous access is revoked. Only the input columns may be inserted; users cannot write the reference JSON, calculation version or creation timestamp. Updates are not granted. The reference trigger uses security invoker, not security definer, and checks identity before reading sources or taking its quota lock.

Each owner can retain 50 cases. A transaction-scoped per-owner advisory lock enforces the limit across concurrent inserts. A unique owner/save-key pair prevents repeated network requests creating duplicates. An existing immutable case remains idempotent even if its upstream source later changes; changed payloads under the same key are rejected by the API.

Deletion is scoped to the owner and requires a deliberate browser confirmation. The account archive and saved-case URLs are private/noindex. API responses are no-store; invalid, unavailable or unsupported-version records fail closed instead of being shown as valid or as an empty archive.

Guest sign-in opens in a separate tab so the calculator's unsaved inputs remain open. There is no automatic browser-storage copy of financial assumptions.

## Verification and remaining acceptance

The new PGlite suite tests two owners, anonymous denial, attempted identity/source/time/version forgery, exact numerical boundaries, source preservation, idempotency, quota and deletion. These are isolated fixtures, not customer records. Browser tests exercise actual unsigned API rejection and private cache headers, plus clearly labelled isolated API fixtures for save/reload/reopen/copy/delete, original references and phone landscape layout.

Actual authenticated production save/reopen/deletion acceptance still requires a genuine reader session. Studio's current session is signed out; no real session is invented. Newsletter edition acceptance remains separate, with the owner's content review already acknowledged. This change broadcasts no newsletter, changes no credential and publishes no experimental forecast.

A saved-case library demonstrates a repeatable research workflow. Billing sandbox, entitlements, payment-provider acceptance and any paid product remain separate work. Prove continuing value before enabling charges.
