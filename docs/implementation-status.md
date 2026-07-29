# Implementation status

Last updated: 28 July 2026 (`America/La_Paz`)

## Status values

- `pending`: not started.
- `in_progress`: current authorized phase.
- `blocked`: cannot continue without an external decision or change.
- `completed`: acceptance checks passed and the phase was closed.

## Roadmap

| Phase | Name                   | Status    | Validation or gate              |
| ----: | ---------------------- | --------- | ------------------------------- |
|     0 | Planning               | completed | Approved implementation plan    |
|     1 | Local foundation       | completed | All automated checks passed     |
|     2 | UI prototype           | completed | All automated checks passed     |
|     3 | Supabase database      | completed | Structural validation passed    |
|     4 | Identity and access    | completed | All automated checks passed     |
|     5 | Public catalogue       | completed | All automated checks passed     |
|     6 | Administrator products | completed | All automated checks passed     |
|     7 | Cart and orders        | completed | All automated checks passed     |
|     8 | Order administration   | completed | All automated checks passed     |
|     9 | Customer tracking      | completed | All automated checks passed     |
|    10 | Hardening              | completed | All automated checks passed     |
|    11 | Deployment             | pending   | Requires explicit authorization |
|    12 | Launch                 | pending   | Requires explicit authorization |

## Phase 1 scope

Created or planned in this phase:

- Next.js static-export foundation.
- Strict TypeScript, Tailwind, ESLint, Prettier, and Vitest.
- Spanish metadata and Belle Perle foundation screen.
- Reusable UI components and mock products.
- Environment template and module structure.
- Project documentation and persistent agent rules.

Excluded until later:

- Supabase, SQL, RLS, authentication, functional checkout, uploads, payments,
  WhatsApp actions, and administration.

## Phase 1 validation record

Completed on 26 July 2026:

- `npm run format`: completed successfully.
- `npm run lint`: passed with exit code 0.
- `npm run typecheck`: passed with exit code 0.
- `npm run test`: 1 test file and 2 tests passed.
- `npm run build`: compiled successfully and generated the static application.
- Static artifact: `out/index.html` exists.
- Development server: ready in 1062 ms at `http://127.0.0.1:3000`.
- HTTP smoke test: status 200 and expected `Belle Perle` content found.

## Phase 2 scope

Completed on 27 July 2026:

- Customer home, search, filtering, and the four product states.
- Product detail, cart, guest checkout, and order confirmation.
- Simulated WhatsApp QR and payment-reported messages.
- Optional account entry and simulated customer order history.
- Administrator dashboard, product list, and quick product creation.
- Automatic KRW-to-BOB price preview with fixed profit.
- Administrator order review, late-payment exception, and private evidence input.
- Rate configuration and bulk-price preview.
- Draft purchase conditions and privacy policy.
- Responsive, mobile-first layouts with semantic labels and visible focus styles.

## Phase 2 validation record

Completed on 27 July 2026:

- `npm run format:check`: passed with exit code 0.
- `npm run lint -- --max-warnings=0`: passed with exit code 0.
- `npm run typecheck`: passed with exit code 0.
- `npm run test`: 2 test files and 3 tests passed.
- `npm run build`: compiled 19 application routes as static content.
- `npm run smoke:static`: 11 representative routes returned HTTP 200.
- The smoke server applies strict timeouts and confirmed its own shutdown.
- No `next dev` process remains running after validation.

## Open items

- Git was installed and a local repository was initialized on branch `main`. No remote
  or author identity was configured, and no commit was created.
- Seed product photography remains placeholder artwork; newly created products can
  use up to three real photographs.
- Physical-phone, keyboard-only, and screen-reader checks remain listed in
  `docs/manual-test-checklist.md`; these require human review.
- The local Supabase stack is available through Docker. Production Supabase is not
  configured yet and remains part of Phase 11.
- Google OAuth, production SMTP, production Turnstile, and the real administrator
  account require provider configuration in Phase 11. Local email links are
  inspectable through Mailpit.
- `npm audit --omit=dev` now reports zero known production vulnerabilities.
  The full development audit retains the current ESLint 9 advisory chain because
  ESLint 10 is not yet accepted by the installed React/import/accessibility
  plugins; these build-only tools are excluded from `out/`.

## Phase 3 scope

Completed on 27 July 2026:

- Relational entities, enums, constraints, indexes, and fixed-precision money.
- Historical price snapshots with the approved 3% contingency formula.
- Safe public catalogue without exact inventory or administrative cost fields.
- Idempotent checkout with database prices and deterministic inventory locks.
- 15-minute reservations and minute-25 payment-report extension.
- Database-time price and reservation expiration.
- Administrative price publishing, mass refresh, and paid confirmation.
- Explicit late-payment override with reason and audit row.
- RLS and grants for customer ownership and administrator isolation.
- Public product-image and private payment-evidence Storage policies.
- Minute-level `pg_cron` expiration schedule.
- Development seed and four pgTAP suites.

## Phase 3 validation record

Completed on 27 July 2026:

- `npm run format:check`: passed with exit code 0, including from the workspace
  junction.
- `npm run lint -- --max-warnings=0`: passed with exit code 0.
- `npm run typecheck`: passed with exit code 0.
- `npm run test`: 2 frontend test files and 3 tests passed.
- `npm run db:check`: 3 migrations, 14 RLS tables, 9 required secure functions,
  4 pgTAP suites, Storage, Cron, locks, idempotency, and immutability passed
  structural validation.
- `npm run build`: 19 application routes compiled as static content.
- `npm run smoke:static`: 11 representative routes returned HTTP 200 and the
  temporary server closed itself.
- Docker Engine 29.6.2 and Supabase CLI 2.110.0 were detected.
- `supabase db reset --local`: completed; all 3 migrations and the seed applied.
- `supabase migration list --local`: all 3 migration versions matched locally.
- `supabase test db`: 4 files and 62 assertions passed.
- `supabase db lint --local --level warning`: no schema errors found.

## Phase 4 scope

Completed on 27 July 2026:

- Browser-safe Supabase client for the static Next.js export.
- Protected anonymous Auth identity for guest checkout with Turnstile token support.
- Google OAuth and email/password account entry.
- Email signup confirmation, PKCE callback, and password recovery.
- Permanent PostgreSQL profiles for non-anonymous users only.
- Validated own-profile RPC with database phone normalization.
- Explicit service-role/SQL procedure for the first administrator.
- Account-aware header, customer-history gate, and administrator gate.
- Safe Spanish Auth error messages without raw database or provider details.
- Local Auth smoke test and identity pgTAP suite.
- Identity, security, deployment, and manual-test documentation.

Excluded until later:

- Catalogue persistence and search integration (Phase 5).
- Real checkout reservations, orders, and WhatsApp actions (Phase 7).
- Production OAuth, SMTP, Turnstile, Supabase, and Cloudflare setup (Phase 11).

## Phase 4 validation record

Completed on 27 July 2026:

- `npm run format:check`: passed with exit code 0.
- `npm run lint -- --max-warnings=0`: passed with exit code 0.
- `npm run typecheck`: passed with exit code 0.
- `npm run test`: 3 frontend test files and 6 tests passed.
- `npm run db:check`: 4 migrations, 14 RLS tables, 12 required secure functions,
  and 5 pgTAP suites passed structural validation.
- `supabase db reset --local`: all 4 migrations and seed applied cleanly.
- `supabase test db`: 5 files and 74 assertions passed.
- `supabase db lint --local --level warning`: no schema errors found.
- `npm run smoke:auth`: anonymous isolation, permanent profile creation, direct
  update denial, and validated RPC update passed through the browser SDK.
- `npm run build`: 25 static pages generated across 24 application routes.
- `npm run smoke:static`: 17 representative URLs returned HTTP 200 and the
  temporary server closed itself.
- The local Supabase stack was stopped after validation with data preserved.

## Phase 5 scope

Completed on 27 July 2026:

- Live customer home selection from the safe Supabase catalogue.
- Database search by product name, brand, or code.
- Active public categories and category filtering.
- Database pagination capped at 20 products per page.
- Authoritative availability ordering: available, reserved, sold out, then expired.
- Live product detail through the static `/producto?id=...` route.
- Clear loading, empty, unavailable, and invalid-link states in Spanish.
- Product thumbnails from the public bucket with accessible placeholders.
- Expired products visible, labelled, explained, and disabled.
- Exact inventory quantities excluded from every public result.
- Anonymous browser-client catalogue smoke test and dedicated pgTAP suite.

Excluded until later:

- Product creation, image uploads, price updates, and administrator catalogue
  persistence (Phase 6).
- Real cart mutation, inventory reservations, checkout, and WhatsApp actions
  (Phase 7).
- Production Supabase and Cloudflare deployment (Phase 11).

## Phase 5 validation record

Completed on 27 July 2026:

- `npm run format:check`: passed with exit code 0.
- `npm run lint -- --max-warnings=0`: passed with exit code 0.
- `npm run typecheck`: passed with exit code 0.
- `npm run test`: 4 frontend test files and 8 tests passed.
- `npm run db:check`: 5 migrations, 14 RLS tables, 13 required secure functions,
  and 6 pgTAP suites passed structural validation.
- `supabase db reset --local`: all 5 migrations and seed applied cleanly.
- `supabase test db`: 6 files and 89 assertions passed.
- `supabase db lint --local --level warning`: no schema errors found.
- `npm run smoke:catalogue`: public categories, filtering, inventory privacy, raw
  product denial, and page-size enforcement passed through the browser SDK.
- `npm run build`: 25 static pages generated across 24 application routes.
- `npm run smoke:static`: 17 representative URLs returned HTTP 200 and the
  temporary server closed itself.
- The local Supabase stack was stopped after validation with data preserved.

## Phase 6 scope

Completed on 28 July 2026:

- Quick administrator product creation with remembered category, KRW cost, exact
  inventory, fixed BOB margin, draft, and immediate publication.
- Informational browser preview and authoritative PostgreSQL price calculation with
  the fixed 3% contingency.
- Browser-side JPEG/PNG/WebP validation, orientation-aware resizing, maximum 1200 px
  full images, maximum 480 px thumbnails, and a three-image limit.
- Administrator-only Storage uploads and safe public product-image projections.
- Exact total, confirmed, reserved, and remaining stock in the administrator list.
- Draft publication and native sharing with clipboard fallback.
- Reviewed exchange-rate creation with source and Bolivia observation date.
- Bulk price preview and explicit confirmation using the current or Friday rate.
- Database-derived next 08:15 `America/La_Paz` expiration; no automatic
  reactivation.
- Full image gallery on the live public product detail.

Excluded until later:

- Real cart persistence, inventory reservations, checkout, and WhatsApp actions
  (Phase 7).
- Payment administration and private evidence uploads (Phase 8).
- Production provider configuration and deployment (Phase 11).

## Phase 6 validation record

Completed on 28 July 2026:

- `npm run format:check`: passed with exit code 0.
- `npm run lint -- --max-warnings=0`: passed with exit code 0.
- `npm run typecheck`: passed with exit code 0.
- `npm run test`: 5 frontend test files and 11 tests passed.
- `npm run db:check`: 6 migrations, 14 RLS tables, 20 secure functions, and
  7 pgTAP suites passed structural validation.
- `supabase db reset --local`: all 6 migrations and the seed applied cleanly.
- `supabase test db`: 7 files and 113 assertions passed.
- `supabase db lint --local --schema public --level warning --fail-on warning`: no
  schema warnings or errors found.
- `npm run smoke:admin-products`: administrator creation, image upload, safe public
  media, exact private inventory, reviewed rate, preview, and bulk refresh passed
  through the Supabase SDK.
- `npm run build`: 25 static pages generated across 24 application routes.
- `npm run smoke:static`: 17 representative URLs returned HTTP 200 and the
  temporary server closed itself.
- The local database was reset after the smoke test so disposable users, products,
  images, and rates were removed.
- The local Supabase stack was stopped after validation with the clean seed data
  preserved.

## Phase 7 scope

Completed on 28 July 2026:

- Device-local cart storing only product identifiers and quantities.
- Real add, increase, decrease, remove, count, reload, and empty-cart behavior.
- Safe catalogue revalidation on cart entry, checkout entry, and immediately before
  submission.
- Guest checkout using only name, Bolivian phone, accepted conditions, anonymous
  Supabase Auth, and Turnstile support.
- Account checkout using the existing permanent identity and profile defaults.
- Acceptance timestamps stored in the same transaction as the order.
- One session idempotency key per unchanged cart attempt.
- Authoritative PostgreSQL totals, price snapshots, row locks, stock validation,
  and 15-minute inventory reservations.
- Ownership-checked confirmation with immutable items and the configured WhatsApp
  number.
- Real QR-request and payment-reported `wa.me` messages using the order number,
  total, and customer name.
- Payment reporting that extends the reservation to minute 25 but cannot mark an
  order paid.
- Removal of raw browser access to campaign configuration and the lower-level
  checkout RPC.

Excluded until later:

- Administrative payment confirmation, private evidence, late-payment overrides,
  and refunds (Phase 8).
- Permanent-account order history and timeline integration (Phase 9).
- Production Turnstile, OAuth, SMTP, Supabase, and hosting configuration (Phase 11).

## Phase 7 validation record

Completed on 28 July 2026:

- `npm run format:check`: passed with exit code 0.
- `npm run lint -- --max-warnings=0`: passed with exit code 0.
- `npm run typecheck`: passed with exit code 0.
- `npm run test`: 7 frontend test files and 17 tests passed.
- `npm run db:check`: 7 migrations, 14 RLS tables, 23 secure functions, and
  8 pgTAP suites passed structural validation.
- `supabase db reset --local`: all 7 migrations and the seed applied cleanly.
- `supabase test db`: 8 files and 135 assertions passed.
- `supabase db lint --local --schema public --level warning --fail-on warning`: no
  schema warnings or errors found.
- `npm run smoke:orders`: signed guest checkout, database totals, 15/25-minute
  limits, retry idempotency, internal-RPC denial, confirmation ownership, WhatsApp
  contact, and payment reporting passed through the Supabase SDK.
- `npm run build`: 25 static pages generated across 24 application routes.
- `npm run smoke:static`: 17 representative URLs returned HTTP 200 and the
  temporary server closed itself.
- The local database was reset after the smoke test, then Supabase was stopped with
  clean seed data preserved.

## Phase 8 scope

Completed on 28 July 2026:

- Live administrator dashboard, order list, filters, and detailed order view.
- Customer contact, immutable item snapshots, Bolivia deadlines, legal acceptance,
  payment state, order state, and full administrative timeline.
- Authoritative actions to register payment notices, reject payments, cancel unpaid
  orders, start refunds, and complete refunds.
- Required reasons persisted in the audit history for financial or destructive
  actions.
- Safe paid confirmation with idempotent conversion into confirmed inventory.
- Correct release of active reservations and one-time reversal of converted
  inventory when a refund begins.
- Exceptional late-payment acceptance with locked stock revalidation, required
  reason, and an administrator override record.
- Optional evidence during paid confirmation or afterwards.
- Private JPEG/PNG/WebP evidence limited to 10 MB, bound to its order path, and
  opened through short-lived signed links.
- Direct browser evidence-metadata inserts and the lower-level paid-confirmation RPC
  revoked.

Excluded until later:

- Permanent-account customer order history and timeline integration (Phase 9).
- Extended security, accessibility, dependency, and concurrency review (Phase 10).
- Production Supabase, providers, and hosting configuration (Phase 11).

## Phase 8 validation record

Completed on 28 July 2026:

- `npm run format:check`: passed with exit code 0.
- `npm run lint -- --max-warnings=0`: passed with exit code 0.
- `npm run typecheck`: passed with exit code 0.
- `npm run test`: 8 frontend test files and 20 tests passed.
- `npm run db:check`: 8 migrations, 14 RLS tables, 28 secure functions, and
  9 pgTAP suites passed structural validation.
- `supabase db reset --local`: all 8 migrations and the seed applied cleanly.
- `supabase test db`: 9 files and 170 assertions passed.
- `supabase db lint --local --schema public --level warning --fail-on warning`: no
  schema warnings or errors found.
- `npm run smoke:admin-orders`: administrator list/detail isolation, paid
  confirmation, private evidence, signed access, customer denial, inventory
  conversion, refunds, and audit reasons passed through the Supabase SDK.
- `npm run build`: 25 static pages generated across 24 application routes.
- `npm run smoke:static`: 17 representative URLs returned HTTP 200 and the
  temporary server closed itself.
- The local database was reset after the smoke test and Supabase was stopped with
  clean seed data preserved.

## Phase 9 scope

Completed on 28 July 2026:

- Real `Mis pedidos` history for permanent Google or email accounts, paginated at
  20 orders and isolated strictly by the authenticated account identifier.
- Customer-safe order detail using the public order number, immutable item
  snapshots, payment and fulfillment status, Bolivia timestamps, contextual help,
  and a reduced chronological timeline.
- Explicit rejection of anonymous sessions and no recovery or association of guest
  orders by matching a telephone number.
- Revocation of direct browser reads from orders, order items, and status history;
  customer access is limited to dedicated security-definer RPC functions.
- Administrator fulfillment progression from confirmed through purchased, in
  transit, ready for delivery, and delivered, reflected in the customer timeline.
- Spanish loading, empty, invalid-link, unavailable, and access-denied states.
- Account-gate redirects that preserve the requested order-detail query string.
- Browser-client tracking smoke test and dedicated pgTAP coverage.

Excluded until later:

- Extended security, accessibility, performance, dependency, and concurrency
  review (Phase 10).
- Production Supabase, OAuth, SMTP, Turnstile, and hosting configuration
  (Phase 11).
- Physical-device launch validation (Phase 12).

## Phase 9 validation record

Completed on 28 July 2026:

- `npm run format:check`: passed with exit code 0.
- `npm run lint -- --max-warnings=0`: passed with exit code 0.
- `npm run typecheck`: passed with exit code 0.
- `npm run test`: 9 frontend test files and 24 tests passed.
- `npm run db:check`: 9 migrations, 14 RLS tables, 32 secure functions, and
  10 pgTAP suites passed structural validation.
- `supabase db reset --local`: all 9 migrations and the seed applied cleanly.
- `supabase test db`: 10 files and 196 assertions passed.
- `supabase db lint --local --schema public --level warning --fail-on warning`:
  no schema warnings or errors found.
- `npm run smoke:tracking`: account ownership, phone non-claim, guest and
  cross-account denial, raw-table isolation, safe timeline, and administrator
  fulfillment propagation passed through the Supabase SDK.
- `npm run build`: 25 static pages generated across 24 application routes.
- `npm run smoke:static`: 18 representative URLs returned HTTP 200 and the
  temporary server closed itself.
- The local database was reset after the smoke test and Supabase was stopped with
  clean seed data preserved.

## Phase 10 scope

Completed on 28 July 2026:

- Live two-client checkout race over the last unit, retry idempotency, and
  authoritative 15/25-minute deadline verification.
- Bulk repricing regression with an existing order snapshot.
- Generated UUID-based Storage paths for product images and private payment
  evidence.
- Browser image-signature validation plus database comparison of declared
  evidence MIME type and size with Storage metadata.
- Reduced anonymous privileges and bounded evidence filenames and audit reasons.
- Static Cloudflare CSP, frame, MIME, referrer, and permissions headers.
- `es-BO`, unique route titles, skip navigation, stronger visible focus,
  reduced-motion support, AA text contrast, touch-target, image-alt, and safe
  new-tab validation.
- A 300 KiB gzip initial-JavaScript budget for every exported route.
- Next.js patch update and patched PostCSS/Sharp overrides, producing zero known
  production dependency vulnerabilities.
- Expanded Spanish purchase conditions and privacy disclosure, clearly marked for
  professional legal review before launch.

Excluded until later:

- Production Supabase, Google OAuth, SMTP, Turnstile, Cloudflare configuration,
  and deployment (Phase 11).
- Physical-phone, screen-reader, real-network, and launch acceptance tests
  (Phase 12).

## Phase 10 validation record

Completed on 28 July 2026:

- `npm run format:check`: passed with exit code 0.
- `npm run lint -- --max-warnings=0`: passed with exit code 0.
- `npm run typecheck`: passed with exit code 0.
- `npm run test`: 9 frontend test files and 25 tests passed.
- `npm run db:check`: 10 migrations, 14 RLS tables, 32 secure functions, and
  11 pgTAP suites passed structural validation.
- `supabase db reset --local`: all 10 migrations and the seed applied cleanly.
- `supabase test db`: 11 files and 209 assertions passed.
- `supabase db lint --local --schema public --level warning --fail-on warning`:
  no schema warnings or errors found.
- `npm run smoke:hardening`: simultaneous final-unit checkout, retry idempotency,
  15/25-minute windows, immutable bulk repricing, strict evidence metadata, and
  customer download denial passed.
- `npm run smoke:admin-products` and `npm run smoke:admin-orders`: product images,
  private payment evidence, payment confirmation, and refunds passed after the
  Storage restrictions.
- `npm audit --omit=dev`: zero known production vulnerabilities.
- `npm run build`: 25 static pages generated across 24 application routes with
  Next.js 16.2.12.
- `npm run quality:static`: 25 exported pages, 24 unique route titles, AA static
  checks, security headers, and a maximum 259,584 gzip bytes of initial JavaScript
  passed.
- `npm run smoke:static`: 18 representative URLs returned HTTP 200 and the
  temporary server closed itself.
- The local database was reset after smoke tests and Supabase was stopped with
  clean seed data preserved.

## Next phase

Phase 11 — Deployment. It requires explicit user authorization and must not begin
automatically.
