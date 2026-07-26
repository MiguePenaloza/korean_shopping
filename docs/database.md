# Database

## Status

No database is connected in Phase 1. SQL migrations begin in Phase 3 and must be
reviewed before any UI connection.

## Planned entities

- `profiles`
- `categories`
- `exchange_rates`
- `rate_observations`
- `products`
- `product_price_versions`
- `product_images`
- `orders`
- `order_items`
- `inventory_reservations`
- `payment_evidence`
- `order_status_history`
- `campaign_settings`

## Monetary representation

- KRW values: integer.
- BOB values: fixed decimal or integer centavos.
- Exchange rates: fixed decimal with explicit precision.
- JavaScript floating-point results are never authoritative.

## Migration process

1. Add a timestamped SQL migration under `supabase/migrations/`.
2. Apply it to the local Supabase project.
3. Run database and RLS tests.
4. Update this document with entities, relationships, constraints, and indexes.
5. Promote the same reviewed migration to production.

Manual dashboard schema changes are not an accepted source of truth.
