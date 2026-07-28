# Security

## Trust model

The browser is untrusted for identity, role, time, price, total, inventory,
payment status, and state transitions. PostgreSQL constraints, RLS, database time,
and `SECURITY DEFINER` functions are authoritative.

Every security-definer function fixes `search_path` to the empty string and uses
schema-qualified identifiers. Function execution is revoked by default and granted
only to the roles that need each RPC.

## RLS matrix

| Resource                 | Anonymous/public               | Customer identity              | Administrator                        |
| ------------------------ | ------------------------------ | ------------------------------ | ------------------------------------ |
| `public_catalogue`       | Safe projection/search         | Safe projection/search         | Safe projection/search               |
| `public_categories`      | Active names and slugs         | Active names and slugs         | Active names and slugs               |
| `campaign_settings`      | Read                           | Read                           | Read/write                           |
| `profiles`               | None                           | Own read; validated update RPC | All rows; role bootstrap is trusted  |
| Categories/products      | No raw access                  | No raw access                  | Read/write                           |
| Rates and observations   | None                           | None                           | Read/write                           |
| Price versions           | No raw access                  | No raw access                  | Read; writes through secure RPC      |
| Orders                   | None without anonymous sign-in | Own read                       | Read; transitions through secure RPC |
| Order items              | None                           | Own read, immutable            | Read, immutable                      |
| Reservations             | None                           | None                           | Read; writes through secure RPC      |
| Status history           | None                           | Own read                       | Read                                 |
| Admin overrides          | None                           | None                           | Read; writes through secure RPC      |
| Evidence metadata        | None                           | None                           | Read/write with uploader check       |
| Product-image objects    | Public read                    | Public read                    | Write                                |
| Payment-evidence objects | None                           | None                           | Read/write                           |

An anonymous checkout still requires Supabase anonymous sign-in and therefore uses
the `authenticated` database role with an anonymous JWT. The plain `anon` role
cannot execute checkout. Anonymous identities receive no row in `profiles`, cannot
open account history, and are never matched to later accounts by phone.

## Direct mutation restrictions

Customers do not receive `INSERT`, `UPDATE`, or `DELETE` privileges on orders,
items, reservations, price versions, history, or overrides. RLS is an additional
barrier, not the only barrier.

Administrative catalogue maintenance uses RLS backed by `is_admin()`. Sensitive
mutations still require functions:

- Price publication calculates and snapshots values in PostgreSQL.
- Checkout calculates totals and reserves stock under row locks.
- Payment reporting is owner-bound and time-bound.
- Paid confirmation converts reservations and confirmed inventory atomically.
- Late-payment acceptance records an immutable reason.
- Cron expiration cannot be called by browser roles.

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
| Customer marks own order paid       | No direct update grant; report RPC can set only `payment_reported`    |
| Expired browser clock               | `clock_timestamp()` controls prices and reservations                  |
| Claiming guest orders by phone      | Ownership uses JWT actor/customer ID, never phone matching            |
| Reading exact stock                 | Public view returns a state label, not inventory counts               |
| Reading payment evidence            | Private bucket and admin-only Storage/table policies                  |
| Replacing historical price          | Immutable price-version and order-item triggers                       |
| Admin accepts late payment silently | Required reason and `order_admin_overrides` audit row                 |
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
- pgTAP tests for schema, privilege matrix, business rules, final-unit flow, and
  identity isolation.

Executed against the local Supabase PostgreSQL stack:

- Clean database reset with all migrations and seed.
- Five pgTAP files with 74 successful assertions.
- Supabase database lint at warning level with no schema errors.
- Browser-client Auth smoke test for anonymous isolation, account profile creation,
  direct-mutation denial, and validated profile updates.
- Anonymous-client catalogue smoke test for safe categories, filtering, page-size
  enforcement, exact-inventory isolation, and denial of raw-product reads.

A sustained two-connection concurrency stress test remains part of Phase 10. The
Phase 3 reservation suite already verifies final-unit exclusion through the secure
checkout function.

## Secrets

Only the Supabase URL, publishable key, site URL, and Turnstile site key may be
public browser variables. Service-role, OAuth, SMTP, and Turnstile secrets remain
in provider-managed secret storage and are never committed.
