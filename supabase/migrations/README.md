# Applied production migrations

The canonical migration history is stored in the connected Supabase project.

Applied in order on 2026-08-22:

1. `kaporal_core_editorial`
2. `kaporal_intelligence_research`
3. `kaporal_live_data_and_users`
4. `kaporal_rls_and_public_access`
5. `revoke_public_rls_helper`
6. `kaporal_editorial_roles`
7. `kaporal_public_signup_newsletter`
8. `kaporal_performance_indexes`

The old pre-production `lib/db/schema.sql` is intentionally removed to avoid schema drift. Use Supabase migration history as the source of truth.
