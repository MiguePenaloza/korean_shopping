# Architecture

## Overview

```text
Mobile browser
  |
  +-- Static Next.js application -- Cloudflare Pages
  |     +-- Customer and admin UI
  |     +-- Device-local cart
  |     +-- Supabase browser client
  |     +-- Web Share and WhatsApp links
  |
  +-- Supabase
        +-- Auth
        +-- PostgreSQL, RLS, and secure RPC
        +-- Public product-image storage
        +-- Private payment-evidence storage
        +-- Cron for expiration
```

## Current implementation

Next.js uses `output: "export"` and `trailingSlash: true`. It does not use API
routes, Server Actions, request cookies, runtime dynamic routes, or default image
optimization.

Runtime entities will use static routes plus query parameters, for example
`/producto?id=...`, so products created after deployment do not require a rebuild.

Phase 3 adds a disconnected Supabase backend definition:

- Three ordered SQL migrations.
- Four pgTAP suites and development seed data.
- Public catalogue projection with no exact stock or cost fields.
- Secure RPC boundaries for prices, checkout, payment reporting, and payment
  confirmation.
- Public product-image and private payment-evidence buckets.
- Minute-level database expiration Cron.

The Next.js prototype still uses mock data. Supabase client wiring belongs to later
phases.

## Future data flow

1. The browser reads a safe public product projection.
2. Client calculations are previews only.
3. Secure PostgreSQL functions derive identity from the Supabase JWT.
4. PostgreSQL validates database time, inventory, active price versions, and totals.
5. RLS limits every direct read.
6. Storage RLS separates public product media from private payment evidence.

## Trust boundaries

The browser is untrusted for user IDs, roles, time, prices, totals, inventory,
payment status, and state transitions. Only database constraints, RLS, and secure
functions are authoritative.

## Module strategy

- `app/` contains routes and layouts.
- `components/` contains UI and feature components.
- `lib/` contains pure business helpers and future service clients.
- `types/` contains shared domain types.
- `supabase/` contains migrations, configuration, seed data, and pgTAP tests.
- `tests/` contains frontend unit tests.
- `scripts/validate-supabase.mjs` provides a finite structural database check when
  a local Supabase runtime is unavailable.
