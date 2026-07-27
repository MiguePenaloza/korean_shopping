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
|     4 | Identity and access    | pending   | Requires explicit authorization |
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
- Real authentication, UI persistence, live Storage uploads, and WhatsApp behavior
  remain intentionally disconnected.

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

## Next phase

Phase 4 — Identity and access. It requires explicit user authorization and should
not begin automatically. A local Supabase runtime is now available.
