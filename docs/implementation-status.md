# Implementation status

Last updated: 27 July 2026 (`America/La_Paz`)

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
|     5 | Public catalogue       | pending   | Requires explicit authorization |
|     6 | Administrator products | pending   | Requires explicit authorization |
|     7 | Cart and orders        | pending   | Requires explicit authorization |
|     8 | Order administration   | pending   | Requires explicit authorization |
|     9 | Customer tracking      | pending   | Requires explicit authorization |
|    10 | Hardening              | pending   | Requires explicit authorization |
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
- Product photography remains placeholder artwork until real product images are
  available.
- Physical-phone, keyboard-only, and screen-reader checks remain listed in
  `docs/manual-test-checklist.md`; these require human review.
- The local Supabase stack is available through Docker. Production Supabase is not
  configured yet and remains part of Phase 11.
- Catalogue persistence, real order creation, live Storage uploads, and WhatsApp
  behavior remain intentionally disconnected until their approved phases.
- Google OAuth, production SMTP, production Turnstile, and the real administrator
  account require provider configuration in Phase 11. Local email links are
  inspectable through Mailpit.
- `npm audit --omit=dev` reports three high advisories inherited through Next.js
  (`postcss` and `sharp`). npm proposes a breaking downgrade to Next.js 9, so no
  unsafe automatic fix was applied. Recheck during Phase 10 hardening.

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

## Next phase

Phase 5 — Public catalogue. It requires explicit user authorization and must not
begin automatically.
