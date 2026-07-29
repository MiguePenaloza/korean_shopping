# Deployment

## Target

Cloudflare Pages will host the static `out/` directory. Deployment work belongs to
Phase 11; current phases only verify local source artifacts.

## Planned build settings

```text
Framework: Next.js static export
Build command: npm run build
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

Production setup remains part of Phase 11:

- Add the deployed site and `/auth/callback` to Supabase redirect URLs.
- Configure Google OAuth in Google and Supabase; keep the client secret in Supabase.
- Configure a production SMTP provider in Supabase Auth.
- Configure Turnstile in Supabase Auth and expose only its site key to Next.js.
- Keep email enumeration protection and sensible Auth rate limits enabled.

After the administrator creates and confirms a permanent account, a trusted database
operator can bootstrap it from the Supabase SQL editor:

```sql
select public.promote_admin_by_email(
  'administrator@example.com',
  'Initial production administrator'
);
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
