# Deployment

The complete provider-by-provider procedure and the separate launch rehearsal are
maintained in [the Phase 11 and 12 runbook](phase-11-12-runbook.md).

## Target

Cloudflare Pages hosts the static `out/` directory at
`https://belle-perle-korean-shopping.pages.dev`. The Pages project and production
Supabase project exist, but the first deployment remains gated by legacy-key
revocation and the remaining provider checks in the runbook.

## Planned build settings

```text
Framework: Next.js static export
Build command: npm run build:production
Output directory: out
Production branch: main
```

`public/_headers` is copied into the static artifact and defines the reviewed CSP,
frame, MIME, referrer, and permissions headers. During Phase 11, verify the actual
Cloudflare response headers and add any production custom Supabase domain to
`connect-src` and `img-src` before enabling it.

## Required services

- Supabase development and production projects.
- Docker and Supabase CLI for local migration and pgTAP verification.
- Cloudflare Pages and Turnstile.
- Google OAuth application.
- SMTP provider connected to Supabase Auth.
- GitHub repository.

The GitHub remote exists at `MiguePenaloza/korean_shopping`. The Supabase CLI is
linked to project `byxwkwzvtxogjljrmwvd`, and Wrangler is authorized to the
business owner's Cloudflare account. Provider credentials remain outside the
repository.

## Environment handling

Public configuration is copied from `.env.example` into the local and hosted
environment. Provider secrets are configured directly in Supabase, Google,
Cloudflare, or the SMTP provider and are never committed.

## Phase 4 identity setup

Local development:

1. Run `supabase start`.
2. Copy the local API URL and publishable key into `.env.local`.
3. Leave `NEXT_PUBLIC_TURNSTILE_SITE_KEY` empty only while using `next dev`; the
   checkout labels this local-only bypass.
4. Open local Mailpit to inspect email confirmation and recovery messages.

Production status in Phase 11:

- The production site and exact `/auth/callback` are configured in Supabase.
- Turnstile is restricted to the production hostname and enabled in Supabase Auth.
- Configure Google OAuth in Google and Supabase; keep the client secret in Supabase.
- Configure a production SMTP provider in Supabase Auth.
- Keep email enumeration protection and sensible Auth rate limits enabled.

There is no hard-coded administrator email. An administrator is a confirmed,
non-anonymous Supabase Auth account whose matching `public.profiles.role` is
`admin`.

To create the first administrator:

1. Create a normal account from `/registro` using email/password or Google.
2. Confirm the email address and sign in at least once so the permanent profile
   exists.
3. Open the trusted Supabase SQL editor for the same environment and run:

```sql
select public.promote_admin_by_email(
  'micky.ale7@gmail.com',
  'Initial production administrator'
);
```

4. Sign out and back in, or reload the session. The `Administrar` navigation entry
   and access to `/admin` confirm that the role was loaded.

The role can be verified without exposing private Auth data:

```sql
select auth_user.email, profile.role
from auth.users as auth_user
join public.profiles as profile on profile.id = auth_user.id
where lower(auth_user.email) = lower('micky.ale7@gmail.com');
```

Never call this procedure from browser code and never place a service-role key in
`.env.local` or Cloudflare public variables.

## Production checks

- Static build and direct route loading.
- Actual Cloudflare security headers and CSP without blocked Supabase or Turnstile
  requests.
- RLS and Storage access matrix.
- Auth redirects and password recovery.
- Anonymous checkout protection.
- Cron expiration.
- WhatsApp links on physical phones.
- Ordering-open setting.
- First administrator and active rate.

## Rollback

Redeploy the previous Cloudflare Pages artifact for frontend regressions. Database
migrations require a documented rollback or forward-fix strategy and must never
delete order snapshots or payment history without an explicit data procedure.

Before production, run the migration chain and `supabase test db` against a clean
local stack, then apply the exact same migration files to the production project.
