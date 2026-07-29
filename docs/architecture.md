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

Next.js uses `output: "export"`. It does not use API routes, Server Actions,
request cookies, runtime dynamic routes, or default image optimization.

Runtime entities will use static routes plus query parameters, for example
`/producto?id=...`, so products created after deployment do not require a rebuild.

The Supabase backend contains:

- Nine ordered SQL migrations.
- Ten pgTAP suites and development seed data.
- Public catalogue projection with no exact stock or cost fields.
- Secure RPC boundaries for prices, checkout, payment reporting, and payment
  confirmation.
- Public product-image and private payment-evidence buckets.
- Minute-level database expiration Cron.

Phase 4 connects only identity and access through the browser-safe Supabase client:

- Supabase anonymous Auth for guest checkout actors.
- Google OAuth and email/password for optional permanent accounts.
- PKCE callback, email confirmation, and password recovery routes.
- Permanent profile creation in PostgreSQL; anonymous identities receive no profile.
- Client account state and UX gates for account and administrator screens.
- Cloudflare Turnstile token support for anonymous sign-in.

At the Phase 4 gate, catalogue and order data still used mocks.

Phase 5 connects the customer catalogue to Supabase:

- The home selection, search results, categories, and product detail load in
  client components after the static page hydrates.
- `search_public_catalogue` performs server-side filtering, authoritative
  availability evaluation, stable ordering, counting, and pagination.
- Pages contain at most 20 products.
- Public projections omit exact inventory, costs, margins, and administrative
  fields.
- Product-image URLs come only from the public `product-images` bucket; the
  interface keeps its accessible placeholder when no image exists.

Phase 6 connects administrator product management:

- The browser compresses selected photographs to a full image of at most 1200 px
  and a thumbnail of at most 480 px before uploading.
- Storage policies allow administrator writes only, while safe public views expose
  published product media.
- Secure RPC functions create products, publish drafts, expose exact inventory to
  administrators, register reviewed rates, preview bulk prices, and confirm the
  new immutable price versions.
- Client-side conversion is informational; PostgreSQL calculates every persisted
  amount and the next 08:15 `America/La_Paz` expiration from database time.

Phase 7 connects cart and ordering:

- The cart stores only product identifiers and quantities in device-local storage.
  It never reserves inventory or acts as a price source.
- Cart and checkout screens reload the safe catalogue before continuing.
- `submit_order` requires a signed Supabase identity, acceptance of both documents,
  and one idempotency key per cart attempt.
- PostgreSQL locks products, validates database time and active price versions,
  derives totals, stores immutable snapshots, and creates 15-minute reservations.
- The ownership-checked confirmation RPC exposes only the order summary, immutable
  items, deadlines, and configured WhatsApp contact needed by the customer.
- Payment reporting extends an active reservation to minute 25 and opens WhatsApp;
  it cannot set `paid`.

Phase 8 connects administrator order operations:

- Administrator list and detail RPCs expose customer contact, immutable items,
  deadlines, private evidence metadata, audit history, and late-payment overrides.
- Controlled transitions register payment notices, rejections, cancellations,
  pending refunds, and completed refunds with required reasons.
- Paid confirmation converts reserved inventory atomically. A refund reverses
  converted inventory once before releasing the reservation.
- Expired paid orders require an explicit reason and a fresh locked inventory check.
- Evidence uploads go to a separate private bucket. The database binds each object
  path to its order, records uploader and file metadata, and never deletes it
  automatically.

Phase 9 connects permanent-account tracking:

- `Mis pedidos` uses a customer-safe RPC capped at 20 orders per page.
- Order detail accepts the public order number and returns only payment/order
  states, immutable purchased items, deadlines, the help contact, and a reduced
  timeline.
- Both RPCs require a permanent profile and bind ownership to `customer_id`; phone
  matching and anonymous JWTs are never accepted.
- Raw orders, item snapshots, and audit history are no longer directly readable by
  browser identities.
- Administrators can advance only the ordered paid journey:
  `confirmed → purchased → in_transit → ready_for_delivery → delivered`.

## Order data flow

1. The browser reads a safe public product projection.
2. Client calculations are previews only.
3. Secure PostgreSQL functions derive identity from the Supabase JWT.
4. PostgreSQL validates database time, inventory, active price versions, and totals.
5. RLS limits every direct read.
6. Storage RLS separates public product media from private payment evidence.
7. The browser opens `wa.me` only after the payment-report mutation succeeds.
8. Administrator changes cross dedicated state-transition RPCs; the browser cannot
   update order or evidence metadata directly.
9. Customer tracking crosses permanent-account projections that omit internal
   reasons, actor identifiers, evidence, and administrative notes.

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
- `scripts/auth-smoke.mjs` verifies the local Auth-to-profile boundary using only a
  publishable key.
- `scripts/admin-products-smoke.mjs` verifies the administrator creation, media,
  catalogue, and bulk-pricing boundaries in the local stack.
- `scripts/orders-smoke.mjs` verifies signed guest checkout, idempotency,
  confirmation ownership, deadlines, and payment reporting.
- `scripts/admin-orders-smoke.mjs` verifies the administrator order boundary,
  private evidence, confirmed inventory, and refund audit history.
- `scripts/customer-tracking-smoke.mjs` verifies permanent-account ownership,
  guest exclusion, raw-table denial, safe timelines, and fulfillment updates.

## Static authentication flow

The static site uses Supabase Auth directly from client components. OAuth and email
links return to `/auth/callback`, where the browser exchanges the one-time PKCE code
and then follows a same-site relative destination. No Next.js server, service-role
key, or cookie middleware is introduced.

The UI gates are for navigation and user experience. PostgreSQL RLS, grants, and
secure RPC functions remain the authorization boundary.
