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
- `supabase/` contains migrations and seed data from Phase 3.
- `tests/` contains unit tests; database and end-to-end suites arrive later.
