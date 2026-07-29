# Product requirements

## Product

Belle Perle, Korean Shopping is a temporary mobile-first personal-shopping
application for skincare and K-pop products sourced during a trip to Korea.

## Users

- Guests can order with name and phone without an account.
- Permanent customers can use Google or email/password and view their own history.
- Administrators manage products, rates, inventory, orders, payments, and evidence.

## Core rules

- Customer UI is Spanish and optimized for low-technology users.
- Currency is BOB; source prices are KRW.
- Business time zone is `America/La_Paz`.
- Public prices expire and cannot be trusted from browser state.
- Checkout recalculates price and inventory transactionally in PostgreSQL.
- Orders require full payment before purchase in Korea.
- Payments occur externally through a QR coordinated over WhatsApp.
- The initial reservation is 15 minutes; a payment report extends review to minute 25.
- Customers cannot mark orders as paid.
- Product, rate, and monetary snapshots in orders are immutable.
- Payment evidence is optional, private, and administrative.

## Approved pricing model

The active rate contains KRW/USD, BCB BOB/USD, bank spread, and a 3% contingency.
Each product adds a fixed BOB profit. PostgreSQL rounds the final result upward to
the next whole boliviano.

## Approved public price window

- Administrator confirms a bulk price refresh after 20:00 Bolivia time.
- Prices expire at 08:15 Bolivia time.
- Weekend refreshes reuse the Friday rate after administrative confirmation.
- Expired products remain visible but disabled.

## Current implementation boundary

Through Phase 9, identity, catalogue, products, pricing, cart, checkout, WhatsApp,
payment administration, refunds, audit history, private evidence, and
permanent-account customer tracking use Supabase. Hardening remains for Phase 10;
production providers and deployment remain for Phase 11.
