# Database

## Current result

The Supabase schema is defined by ten ordered migrations:

1. `20260727010000_initial_schema.sql` — types, tables, constraints, indexes, and
   RLS activation.
2. `20260727011000_secure_functions.sql` — immutable snapshots, authoritative
   pricing, inventory locks, checkout, payment reporting, administration, audit
   triggers, and the safe catalogue view.
3. `20260727012000_rls_storage_cron.sql` — grants, policies, Storage buckets, and
   the expiration Cron job.
4. `20260727013000_identity_and_access.sql` — permanent-profile creation,
   anonymous isolation, validated own-profile updates, and trusted administrator
   bootstrap.
5. `20260727014000_public_catalogue.sql` — safe categories, live catalogue
   projection, server-side search, state ordering, and pagination capped at 20.
6. `20260728010000_administrator_products.sql` — thumbnail metadata, safe product
   media view, administrator product/rate RPCs, exact-inventory listing, and
   database-derived price expiration.
7. `20260728020000_cart_orders_whatsapp.sql` — acceptance timestamps, public
   checkout wrapper, ownership-checked confirmation, reduced campaign visibility,
   and explicit payment-report privileges.
8. `20260728030000_order_administration.sql` — administrator order projections,
   controlled state transitions, audited reasons, safe paid confirmation, inventory
   reversal for refunds, and private evidence registration.
9. `20260728040000_customer_tracking.sql` — permanent-account guard, paginated own
   history, customer-safe detail and timeline, raw-order read revocation, and
   ordered administrator fulfillment updates.
10. `20260728050000_hardening.sql` — generated Storage-path enforcement, evidence
    object metadata verification, bounded audit reasons and filenames, and reduced
    anonymous function privileges.

`supabase/seed.sql` contains development-only categories, rates, products, and
price versions. It contains no real customer or payment data.

## Entity groups

### Identity and configuration

- `profiles`: permanent customer/admin profile keyed to `auth.users`.
- `campaign_settings`: singleton with ordering status, `America/La_Paz`, 08:15
  expiration, 15/25-minute limits, WhatsApp number, and current rate.

### Catalogue and pricing

- `categories`
- `products`
- `product_images`
- `rate_observations`: source observation, including BCB date and value.
- `exchange_rates`: applied KRW/USD, BCB BOB/USD, spread, and contingency.
- `product_price_versions`: immutable pricing inputs and results.
- `public_catalogue`: safe projection without exact inventory quantities, margins,
  costs, or administrative fields.
- `public_categories`: active category names and slugs without administrative
  mutation access.
- `public_product_images`: published image paths and alt text without exposing raw
  product or administrative fields.

Administrator browsers cannot write these tables directly. Product creation,
draft publication, exchange-rate registration, price previews, and bulk refreshes
cross dedicated `SECURITY DEFINER` RPCs that validate the JWT administrator role.

`search_public_catalogue` searches name, brand, or code, filters by safe category
slug, counts the complete filtered result, and returns one page. PostgreSQL orders
`available`, `reserved`, `sold_out`, then `expired`, with newest products first
inside each state. The function rejects pages below 1, queries over 120 characters,
and page sizes outside 1–20.

Only one price version per product can be `active`. Old versions remain for order
evidence. A trigger permits only `active → expired|superseded`; all price inputs
and calculated amounts are immutable.

### Orders and inventory

- `orders`: customer/guest data, public number, payment/order states, totals,
  idempotency, deadlines, and purchase/privacy acceptance timestamps.
- `order_items`: immutable product and price snapshots.
- `inventory_reservations`: active, converted, released, or expired units.
- `order_status_history`: automatic status/payment audit.
- `order_admin_overrides`: required reason for exceptional late-payment acceptance.
- `payment_evidence`: private Storage metadata.

## Monetary representation

- KRW product values: integer.
- BOB product, order, and line totals: `numeric(12,2)`.
- Calculated intermediate costs: `numeric(14,4)`.
- Exchange rates: fixed-precision numeric values.
- JavaScript calculations remain previews only.

The authoritative function applies:

```text
effective_bob_per_usd =
  bcb_bob_per_usd + bank_spread_bob_per_usd

converted_cost_bob =
  (price_krw / krw_per_usd) * effective_bob_per_usd

protected_cost_bob =
  converted_cost_bob * (1 + contingency_rate)

selling_price_bob =
  ceil(protected_cost_bob + product_margin_bob)
```

Every `order_item` stores the price-version identifier and a JSON snapshot of all
inputs and results.

## Transaction and concurrency rules

`submit_order` verifies both acceptance flags and then calls the internal
`create_order` transaction:

1. Requires a Supabase identity, including an anonymous signed-in identity.
2. Checks the campaign switch using database time.
3. Returns the existing order for the same `(actor_id, idempotency_key)`.
4. Aggregates duplicate product lines.
5. Locks products in UUID order.
6. Expires stale reservations for the locked product.
7. Checks an active, non-expired price version.
8. Calculates available units from total, confirmed, and active reservations.
9. Inserts immutable items and 15-minute reservations.
10. Derives totals from database prices.

The lock order is consistent across checkout, administrative payment confirmation,
and expiration work. This prevents overselling and reduces deadlock risk.

Browser identities cannot execute `create_order` directly. This prevents bypassing
the acceptance check. `get_own_order_confirmation` checks JWT ownership and returns
only the fields, item snapshots, deadlines, and WhatsApp contact needed on the
confirmation screen. Raw campaign configuration is not browser-readable.

The browser-facing `report_own_order_payment` verifies ownership and delegates to
the internal payment-report function during the initial window. It records
`payment_reported` and extends reservations to the minute-25 deadline; it cannot
mark an order paid.

The lower-level `admin_confirm_order_paid` is no longer browser-executable.
`admin_mark_order_paid` wraps it with a reduced result and optional evidence
metadata. It locks the order and each product. Late payment requires an explicit
flag and a reason of at least ten characters, revalidates inventory after expiring
stale reservations, and creates an override audit record.

`admin_change_order_state` is the authoritative state machine for administrative
payment notices, rejections, cancellations, pending refunds, and completed refunds.
Reasons are required for destructive or financial actions and are copied into
`order_status_history`. Starting a refund releases active inventory or reverses
previously converted inventory exactly once.

`list_own_account_orders` and `get_own_account_order_detail` require a
non-anonymous JWT with a permanent profile. They filter strictly by `customer_id`,
never by phone or only by `actor_id`. The detail uses the public order number and
omits internal audit reasons, metadata, actor IDs, evidence, and administrative
notes.

`admin_advance_order_fulfillment` requires a paid order and locks it before
enforcing the exact progression from confirmed through purchased, transit,
ready-for-delivery, and delivered. Each transition enters the customer-safe
timeline through the existing audit trigger.

## Expiration

`expire_due_records`:

- Marks active price versions expired when `expires_at <= clock_timestamp()`.
- Expires inventory reservations using database time.
- Marks unpaid orders expired after their active reservations end.

`pg_cron` invokes it every minute. The daily 08:15 Bolivia deadline is stored on
each generated price version; Cron enforces, rather than calculates, that deadline.
Prices never reactivate automatically. An administrator must publish refreshed
versions using a selected exchange rate.

## Storage

- `product-images`: public reads, administrator-only writes, 6 MiB, JPEG/PNG/WebP.
- `payment-evidence`: private reads/writes for administrators only, 10 MiB,
  JPEG/PNG/WebP.

The relational evidence row stores uploader, original filename, MIME type, size,
path, and creation time. Metadata inserts use a secure RPC that requires the object
to exist in the private bucket, binds its path to the order UUID, and compares the
declared type and size with Storage metadata. Storage policies accept only generated
UUID-based product/order paths. No automatic evidence deletion is configured.

## Tests

`supabase/tests/database/` contains pgTAP suites for:

- Required schema and functions.
- RLS, grants, public projection, and private Storage.
- Phone normalization, approved price formula, timezone, and 3% contingency.
- Final-unit reservation, idempotency, oversell prevention, payment reporting,
  and expiration.
- Permanent signup profiles, anonymous isolation, profile privileges, and
  administrator bootstrap.
- Public catalogue projection, filtering, availability ordering, inventory
  privacy, and pagination.
- Administrator product creation and publication, image limits, exact inventory,
  reviewed-rate creation, fixed 3% contingency, and bulk repricing.
- Checkout acceptance, signed guest identity, ownership isolation, idempotent
  confirmation, 15/25-minute deadlines, and WhatsApp contact projection.
- Administrator list/detail isolation, safe transitions, rejection and cancellation
  release, refund completion, late-payment override, evidence-path validation, and
  auditable reasons.
- Permanent-account-only history, public-number detail, pagination, guest and
  cross-account denial, no phone reclaim, reduced timeline fields, and fulfillment
  progression.
- Hardened upload paths, evidence metadata matching, bounded audit fields, reduced
  anonymous privileges, and private evidence attachment.

Local execution requires Docker and the Supabase CLI:

```text
supabase start
supabase db reset
supabase test db
```

The repository-level `npm run db:check` is a finite structural check. It does not
replace applying the migrations to PostgreSQL or executing pgTAP.

Verified locally on 28 July 2026 with Docker and Supabase CLI:

- A clean `supabase db reset` applied all ten migrations and the seed.
- `supabase test db` passed 11 files and 209 assertions.
- `supabase db lint --local --schema public --level warning --fail-on warning`
  reported no schema warnings or errors.
- A live two-client SDK race allowed exactly one order for the final unit and
  preserved idempotent retries, 15/25-minute deadlines, and immutable order prices
  during bulk repricing.

## Migration discipline

- The SQL files are the source of truth; manual Dashboard schema changes are not.
- Production must receive the same reviewed migrations.
- Destructive rollback is not provided for order snapshots, payment history, or
  evidence. Corrective migrations must use a forward fix.
- Administrator bootstrap remains executable only from a trusted SQL or
  service-role context and is never exposed to browser roles.
