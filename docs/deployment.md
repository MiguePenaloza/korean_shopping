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

## Production checks

- Static build and direct route loading.
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
