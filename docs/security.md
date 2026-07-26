# Security

## Phase 1

The current application is static and contains no secrets, accounts, private data,
database connection, or functional mutations.

## Planned authorization

- Guests receive a restricted anonymous Supabase identity.
- Permanent customers can read only their own profile and orders.
- Administrators are assigned outside browser-controlled input.
- Public catalogue reads use an explicit safe projection.
- Direct customer writes to orders, items, prices, inventory, and statuses are denied.

## Mandatory controls

- RLS on every exposed table.
- Storage policies for product images and payment evidence.
- Secure functions with fixed search paths and internal authorization.
- Database-time expiration.
- Transactional row locking for inventory.
- Idempotency for checkout.
- Immutable order snapshots.
- Generic customer errors with no SQL or internal IDs.

## Secrets

Only Supabase publishable configuration and the Turnstile site key may be present in
browser variables. Service-role, SMTP, OAuth, and Turnstile secrets belong in their
provider dashboards or protected runtime configuration.

## Phase 3 documentation gate

This file must include the final RLS matrix, policy descriptions, grants, threat
model, and executed verification results before database work is considered complete.
