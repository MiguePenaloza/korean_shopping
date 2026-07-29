# Security

## Trust model

The browser is untrusted for identity, role, time, price, total, inventory,
payment status, and state transitions. PostgreSQL constraints, RLS, database time,
and `SECURITY DEFINER` functions are authoritative.

Every security-definer function fixes `search_path` to the empty string and uses
schema-qualified identifiers. Function execution is revoked by default and granted
only to the roles that need each RPC.

## RLS matrix

| Resource                 | Anonymous/public       | Customer identity              | Administrator                       |
| ------------------------ | ---------------------- | ------------------------------ | ----------------------------------- |
| `public_catalogue`       | Safe projection/search | Safe projection/search         | Safe projection/search              |
| `public_categories`      | Active names and slugs | Active names and slugs         | Active names and slugs              |
| `campaign_settings`      | No raw access          | No raw access                  | Secure RPC only                     |
| `profiles`               | None                   | Own read; validated update RPC | All rows; role bootstrap is trusted |
| Categories/products      | No raw access          | No raw access                  | Secure RPC                          |
| Rates and observations   | None                   | None                           | Secure RPC                          |
| Price versions           | No raw access          | No raw access                  | Read; writes through secure RPC     |
| Orders                   | Confirmation RPC only  | Safe own tracking RPC          | Secure list/detail RPC              |
| Order items              | Confirmation RPC only  | Safe own tracking RPC          | Secure detail RPC                   |
| Reservations             | None                   | None                           | Read; writes through secure RPC     |
| Status history           | None                   | Reduced own timeline RPC       | Secure detail RPC                   |
| Admin overrides          | None                   | None                           | Read; writes through secure RPC     |
| Evidence metadata        | None                   | None                           | Secure RPC and private read         |
| Product-image objects    | Public read            | Public read                    | Write                               |
| Payment-evidence objects | None                   | None                           | Read/write                          |

An anonymous checkout still requires Supabase anonymous sign-in and therefore uses
the `authenticated` database role with an anonymous JWT. The plain `anon` role
cannot execute checkout. Anonymous identities receive no row in `profiles`, cannot
open account history, and are never matched to later accounts by phone.

## Direct mutation restrictions

Customers do not receive `INSERT`, `UPDATE`, or `DELETE` privileges on orders,
items, reservations, price versions, history, or overrides. RLS is an additional
barrier, not the only barrier.

Phase 9 also revokes direct `SELECT` on orders, order items, and status history from
browser identities. Customers receive only purpose-built projections; this avoids
exposing actor IDs, administrative notes, internal reasons, or audit metadata.

Administrative catalogue maintenance uses RLS backed by `is_admin()`. Sensitive
mutations still require functions:

- Price publication calculates and snapshots values in PostgreSQL.
- Checkout calculates totals and reserves stock under row locks.
- Payment reporting is owner-bound and time-bound.
- Paid confirmation converts reservations and confirmed inventory atomically.
- Late-payment acceptance records an immutable reason.
- Rejection and cancellation release reservations through an allowed transition.
- Refund initiation reverses converted inventory once and records its reason.
- Evidence metadata requires an existing private object in the order directory.
- Cron expiration cannot be called by browser roles.

The browser-facing `submit_order` requires purchase-condition and privacy
acceptance. The lower-level checkout function is revoked from browser roles.
Acceptance timestamps are written in the same database transaction as the order.
Raw campaign settings are hidden; the configured WhatsApp contact is returned only
inside an ownership-checked order confirmation.

A product trigger prevents direct changes to `confirmed_stock` outside trusted
database execution.

Public catalogue search runs through `search_public_catalogue`. It caps each page
at 20, validates input lengths, and returns only the reviewed public projection.
Exact total, confirmed, reserved, and remaining inventory quantities never cross
the public boundary. Availability is derived from database time, price versions,
confirmed stock, and unexpired reservations.

Permanent profile updates use `upsert_own_profile`, which derives the user ID from
the JWT, rejects anonymous identities, normalizes the phone in PostgreSQL, and never
accepts a role argument. Direct browser `UPDATE` privilege on `profiles` is revoked.

The first administrator is promoted only by `promote_admin_by_email` from the SQL
editor or a service-role context. The RPC is not executable by `anon` or
`authenticated`, requires a reason, and cannot target anonymous users. A
service-role key must never be copied into this static application.

## Threat model and mitigations

| Threat                              | Mitigation                                                            |
| ----------------------------------- | --------------------------------------------------------------------- |
| Browser changes price or total      | Secure checkout ignores browser totals and uses active price versions |
| Two customers order the final unit  | Deterministic product row locks and active-reservation subtraction    |
| Double click or network retry       | Unique `(actor_id, idempotency_key)` and existing-order return        |
| Checkout bypasses legal acceptance  | Public wrapper requires both flags; internal RPC is browser-revoked   |
| Customer marks own order paid       | No direct update grant; report RPC can set only `payment_reported`    |
| Expired browser clock               | `clock_timestamp()` controls prices and reservations                  |
| Claiming guest orders by phone      | Ownership uses JWT actor/customer ID, never phone matching            |
| Guest opens account history         | Permanent-profile guard rejects anonymous JWTs                        |
| Account reads another order         | Tracking filters by `customer_id` and public order number             |
| Customer reads internal audit notes | Raw reads revoked; reduced timeline omits reasons and metadata        |
| Reading exact stock                 | Public view returns a state label, not inventory counts               |
| Reading payment evidence            | Private bucket and admin-only Storage/table policies                  |
| Forging evidence metadata           | Direct inserts revoked; RPC validates object, type, size, and path    |
| Disguised or mismatched image       | Browser magic-byte check plus stored MIME/size comparison             |
| Uploading outside generated folders | Storage policies require UUID-based product or order paths            |
| Replacing historical price          | Immutable price-version and order-item triggers                       |
| Admin accepts late payment silently | Required reason and `order_admin_overrides` audit row                 |
| Invalid order-state jump            | One locked RPC validates each allowed transition and required reason  |
| Refund leaves inventory confirmed   | Converted reservations are reversed once when refund starts           |
| Forged admin role                   | Role stored in protected profile row; browser input cannot change it  |
| Anonymous user opens history        | No profile row, account gate, owner RLS, and no phone-based reclaim   |
| Open redirect after OAuth           | Callback accepts only same-site relative paths                        |
| Raw Auth/database error disclosure  | UI maps failures to stable Spanish customer messages                  |
| Automated anonymous registrations   | Turnstile token passed to Supabase Auth; provider verifies it         |
| Function search-path injection      | Empty fixed search path and schema-qualified objects                  |
| SQL errors leak internals           | RPCs raise stable generic business codes for UI mapping               |

## Storage controls

Product images and payment evidence use separate buckets and policy sets. Public
access to product images does not imply access to evidence. MIME types and object
sizes are constrained at bucket and relational metadata levels.

## Verification

Implemented:

- RLS enabled on all 14 exposed public tables.
- Raw catalogue inventory denied to public roles.
- Safe catalogue projection granted to public roles.
- Four administrator-only policies for the private evidence bucket.
- Structural validation for fixed search paths, grants, policies, locks,
  idempotency, Cron, and immutability.
- pgTAP tests for schema, privilege matrix, business rules, final-unit flow,
  identity isolation, administrative transitions, and refunds.

Executed against the local Supabase PostgreSQL stack:

- Clean database reset with all migrations and seed.
- Eleven pgTAP files with 209 successful assertions.
- Supabase database lint at warning level with no schema errors.
- Browser-client Auth smoke test for anonymous isolation, account profile creation,
  direct-mutation denial, and validated profile updates.
- Anonymous-client catalogue smoke test for safe categories, filtering, page-size
  enforcement, exact-inventory isolation, and denial of raw-product reads.
- Signed guest-order smoke test for database totals, 15/25-minute limits,
  idempotency, ownership isolation, and payment reporting.
- Administrator-order smoke test for list/detail isolation, paid confirmation,
  private evidence, signed access, inventory conversion, and refund audit reasons.
- Customer-tracking smoke test for permanent ownership, phone non-claim, guest and
  cross-account denial, raw-table denial, safe timelines, and fulfillment updates.
- Hardening smoke test with two simultaneous authenticated checkouts: exactly one
  acquired the final unit, the loser received `INSUFFICIENT_STOCK`, and retry
  idempotency remained intact.
- Product and order regression smoke tests after the Storage policies were
  restricted.
- `npm audit --omit=dev`: zero known production vulnerabilities after updating
  Next.js and pinning patched PostCSS and Sharp releases.

The full development audit still reports the current `minimatch`/`brace-expansion`
advisory chain inherited through ESLint 9 and `eslint-config-next`. ESLint 10 removes
the affected chain but is not yet accepted by the installed React accessibility and
import plugins. These packages are build-time tools, are not shipped in `out/`, and
are run only against trusted repository patterns. The project therefore keeps the
compatible linter instead of applying npm's breaking downgrade suggestions.

## Secrets

Only the Supabase URL, publishable key, site URL, and Turnstile site key may be
public browser variables. Service-role, OAuth, SMTP, and Turnstile secrets remain
in provider-managed secret storage and are never committed.
