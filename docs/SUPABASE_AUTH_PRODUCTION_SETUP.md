# Supabase Auth — KAPORAL Production Setup

This checklist fixes the legacy `localhost:3000` confirmation redirect, removes Supabase-branded sender identity, and makes account confirmation safer against email-link scanners.

## 1. URL Configuration

Supabase Dashboard → Authentication → URL Configuration

- Site URL: `https://www.kaporalintelligence.com`
- Allowed redirect URL: `https://www.kaporalintelligence.com/**`

Remove `http://localhost:3000` as the production Site URL. Localhost may remain only as an additional development redirect if local development is actively used.

## 2. Custom SMTP through Resend

Supabase Dashboard → Authentication → Emails → SMTP Settings

- Enable Custom SMTP: ON
- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: a dedicated Resend API key created for Supabase Auth SMTP
- Sender email: `accounts@kaporalintelligence.com`
- Sender name: `KAPORAL INTELLIGENCE`

Do not put the Resend API key in Git, Markdown, chat history, or a `NEXT_PUBLIC_` variable.

## 3. Signup confirmation email template

Use a short transactional email with no marketing images. This avoids image loading/tracking dependencies and reduces deliverability problems.

Subject:

`Confirm your KAPORAL INTELLIGENCE account`

Body:

```html
<h2>Confirm your KAPORAL INTELLIGENCE account</h2>
<p>Confirm this email address to finish creating your reader account.</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/account">
    Continue to secure confirmation
  </a>
</p>
<p>If you did not request this account, you can ignore this email.</p>
```

The `/auth/confirm` page intentionally does **not** consume the one-time token on page load. The reader must press the KAPORAL confirmation button. This reduces failures caused by enterprise email scanners and link-prefetchers consuming one-time links.

## 4. Edge Function mail secret

Newsletter and website support use Resend's API through Supabase Edge Functions. In Supabase → Edge Functions → Secrets, the key must exist under the exact name:

`RESEND_API_KEY`

Paste only the API key as the value. Do **not** paste `RESEND_API_KEY = ...` into the value field.

Optional configuration values:

- `NEWSLETTER_FROM_EMAIL` → `KAPORAL INTELLIGENCE <intelligence@kaporalintelligence.com>`
- `SITE_URL` → `https://www.kaporalintelligence.com`
- `SUPPORT_TO_EMAIL` → `globalsupport@kaporalintelligence.com`

Function code sanitizes accidental `NAME = value` prefixes for the non-secret settings, but the correct dashboard format should still be used.

## 5. Rate limits and abuse protection

After Custom SMTP is enabled, review Authentication → Rate Limits. Keep the built-in per-request cooldown; do not remove email confirmation. Add CAPTCHA/Turnstile before any large public promotion if bot signups become material.

## 6. Retest rule

Discard every old confirmation email that points to localhost or was generated before this configuration. Create a new test account and use only the newest KAPORAL-branded confirmation message.
