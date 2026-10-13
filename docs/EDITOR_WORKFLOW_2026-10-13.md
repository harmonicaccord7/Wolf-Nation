# Newsletter editor and Agent Room cleanup — October 13, 2026

The owner asked to hide the Agent Room shown in the story workspace and noted that the newsletter archive still has no published edition. This focused application increment makes the newsletter desk directly reachable and removes the requested panel.

## Resulting workflow

- `/studio/newsletter` uses the existing verified identity and database profile role. Guests and readers receive the private-workspace lock; researchers can prepare content, and only editors/admins receive approval/publication controls. The existing server and PostgreSQL publication gates still decide every transition.
- The command center links to **Newsletter editions** near its heading. The full editorial panel moves to this dedicated page; editors no longer scroll past the model dashboard to find it. The same edition list, revision checking, source review, approval, immutable publication and consented delivery ledger are reused.
- The story workspace renders Source Pack, Claim Ledger and Editorial Handoff. The Agent Room, its analyst launch buttons and run-output props are removed rather than concealed by CSS. Source/claim/draft feedback remains in an accessible status message. The story loader no longer fetches unused run outputs. Stored runs and the authorized command-center audit trail are preserved.
- Public `/research` offers the on-site journal and newsletter archive instead of a private Studio callout. Private access remains available from the authorized account page.
- The new Studio page inherits noindex/noarchive metadata and private/no-store headers. It is absent from the public sitemap. No RLS, credential, schema, model, provider, newsletter transition or payment behavior changes.

## Actual state and remaining acceptance

Read-only Supabase audit at `2026-10-13T17:37:12.716784Z`: 36 newsletter issues, all drafts; none reviewed, approved or published in the database. Latest weekly/weekday drafts are dated October 13. The owner's prior content review remains acknowledged. That review has not yet been recorded through an authenticated editor transition. The actual live Studio browser is signed out; do not use privileged SQL to impersonate an editor or call this acceptance complete.

After genuine editor sign-in, open Newsletter editions, select the exact intended edition, record the authorized review and publish through the existing workflow. A published archive row is separate from email delivery. Do not use the **Send next batch** control as an acceptance test or broadcast without separate authorization. Consented test inbox, unsubscribe and repeat-send suppression remain independent acceptance steps.

The current Supabase advisor still reports leaked-password protection disabled. Official password-security documentation checked October 13 says **Pro and above** support it; the official price starts at **US$25/month**, with additional usage/projects potentially billed. Owner purchase of an eligible plan and enabling its Auth setting are separate actions, not accomplished by this application PR. Database size was 78,941,331 bytes; capacity is not established as the cause of the empty archive.

Sources: <https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection>, <https://supabase.com/pricing>.

## Verification

The added browser case checks unsigned editor access, no publication/draft controls or private content, inherited no-store/noindex behavior, phone landscape layout, and real public Research → Capital Intelligence News navigation. Existing newsletter state-machine/RLS checks and full CI continue to run. The focused PR body and current main are authoritative for checked commit, merge, deployment and live acceptance; this source document is not a release claim.
