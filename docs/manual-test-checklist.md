# Manual test checklist

## Phase 1

- [ ] Home page loads at the local URL.
- [ ] Header shows `Belle Perle` and `Korean Shopping`.
- [ ] Spanish accents display correctly.
- [ ] Content remains usable at 320 px width.
- [ ] Buttons are at least 44 px high.
- [ ] Keyboard focus is visible.
- [ ] Search field has a persistent label.
- [ ] Product cards show available, reserved, and expired examples.
- [ ] Expired product action is disabled.
- [ ] Bottom navigation remains readable above the mobile safe area.
- [ ] Reduced-motion preference is respected.
- [ ] No real purchase, account, payment, or sharing action is presented as functional.

## Phase 2

Automated:

- [x] Static export generates all public and administrator routes.
- [x] Main exported routes respond with HTTP 200.
- [x] The static smoke server closes itself and enforces per-request and global timeouts.
- [x] Lint completes without warnings.
- [x] Strict TypeScript completes without errors.
- [x] Unit tests cover BOB formatting and the KRW-to-BOB preview formula.

Manual review before Phase 3:

- [ ] Review the customer flow at 320 px without horizontal scrolling.
- [ ] Review the administrator flow at an Android-sized viewport.
- [ ] Complete the guest checkout using only the keyboard.
- [ ] Confirm visible focus on links, fields, quantity controls, and filters.
- [ ] Confirm Spanish accents render correctly on the target phone.
- [ ] Confirm file inputs announce their labels with a screen reader.
- [ ] Review the draft purchase conditions and privacy copy.

## Phase 3

Repository validation:

- [x] Three ordered migrations define schema, secure functions, RLS, Storage, and Cron.
- [x] Every exposed public table has RLS enabled.
- [x] Public catalogue omits exact inventory, costs, margins, and administrative data.
- [x] Browser roles cannot directly mutate orders, items, reservations, or price history.
- [x] Checkout uses database prices, idempotency, deterministic row locks, and snapshots.
- [x] Payment evidence uses a private administrator-only bucket.
- [x] Four pgTAP suites cover schema, security, business rules, and the final unit.
- [x] `npm run db:check` completes with strict structural assertions.

Local Supabase runtime:

- [x] Install Docker and Supabase CLI.
- [x] Run `supabase start`.
- [x] Run `supabase db reset` from a clean database.
- [x] Run `supabase test db`: 4 files and 62 assertions passed.
- [x] Run `supabase db lint --local --level warning`: no schema errors.
- [ ] Run a real two-connection race against the final unit.
- [ ] Inspect Supabase database and security-advisor warnings.

## Future launch paths

- [ ] Create and share a product from a phone.
- [ ] Complete guest checkout.
- [ ] Complete authenticated checkout.
- [ ] Verify 15- and 25-minute expiration.
- [ ] Prevent ordering expired or depleted products.
- [ ] Mark paid and attach private evidence.
- [ ] Handle late payment and refund.
- [ ] Confirm customer/admin data isolation.
- [ ] Close ordering without deleting history.

## Phase 5

Automated:

- [x] Public catalogue and active categories are readable with the publishable key.
- [x] Raw product inventory remains inaccessible to anonymous visitors.
- [x] Search matches name, brand, and code on the database side.
- [x] Category filtering and page-size cap of 20 are enforced in PostgreSQL.
- [x] Available products sort before expired products.
- [x] Six pgTAP files pass with 89 assertions.
- [x] Database lint reports no schema errors.

Manual review before Phase 6:

- [ ] Search using the target Android phone and slow mobile data.
- [ ] Confirm 20-product pagination with a larger realistic catalogue.
- [ ] Review available, reserved, sold-out, and expired cards.
- [ ] Open a valid product link and a removed/invalid product link.
- [ ] Confirm a customer never sees exact unit quantities.
- [ ] Review real thumbnail cropping once product images exist in Phase 6.

## Phase 4

Automated:

- [x] Permanent signup creates a normalized customer profile.
- [x] Anonymous Auth creates no permanent profile.
- [x] Direct browser profile updates are denied.
- [x] Validated own-profile RPC succeeds.
- [x] Browser roles cannot execute administrator bootstrap.
- [x] All five pgTAP files pass with 74 assertions.
- [x] Database lint reports no schema errors.

Manual review before Phase 5:

- [ ] Configure Google OAuth and complete a real Google round trip.
- [ ] Open the local confirmation email in Mailpit.
- [ ] Complete password recovery from Mailpit.
- [ ] Complete Turnstile in a non-local test environment.
- [ ] Confirm an anonymous visitor cannot open `Mis pedidos`.
- [ ] Confirm a customer cannot open `/admin`.
- [ ] Confirm the promoted administrator can open `/admin`.

## Phase 6

Automated:

- [x] Administrator functions reject non-administrator identities.
- [x] Product creation generates a unique public code and authoritative price.
- [x] Product media metadata is limited to three images.
- [x] Direct browser writes to products, rates, and image metadata remain denied.
- [x] Exact stock is returned only by the administrator listing RPC.
- [x] Bulk repricing creates immutable price versions with the next 08:15 deadline.

Manual review before Phase 7:

- [ ] Create a draft with no photograph and publish it later.
- [ ] Create a published product with three phone photographs.
- [ ] Confirm large photographs are resized and retain their orientation.
- [ ] Confirm the last selected category is remembered on the same device.
- [ ] Share a product through Android and through clipboard fallback.
- [ ] Review exact total, confirmed, reserved, and remaining units as administrator.
- [ ] Save a reviewed rate, compare every previewed price, and confirm the update.
- [ ] Check product creation and bulk repricing at 320 px with keyboard navigation.

## Phase 7

Automated:

- [x] Malformed local-cart data is rejected and quantities are capped at 20.
- [x] One idempotency key is reused for retries of an unchanged cart.
- [x] Checkout requires a signed identity and both acceptance flags.
- [x] The internal checkout RPC is unavailable to browser identities.
- [x] Database totals and reservation deadlines are authoritative.
- [x] Another identity cannot read an order confirmation.
- [x] Payment reporting changes only `payment_reported` and extends to minute 25.
- [x] WhatsApp messages contain the real order number, total, and customer name.

Manual review before Phase 8:

- [ ] Add, increase, decrease, and remove products using a target Android phone.
- [ ] Reload the browser and confirm the local cart remains.
- [ ] Confirm an expired, removed, or fully reserved product blocks checkout.
- [ ] Complete a guest checkout using only name and phone.
- [ ] Complete checkout while signed in and confirm the cart survives sign-in.
- [ ] Double-tap `Confirmar pedido` on slow mobile data and confirm one order.
- [ ] Open both WhatsApp buttons on a physical phone and review the messages.
- [ ] Wait past minutes 15 and 25 and confirm the correct actions are disabled.
- [ ] Review the full cart and confirmation flow at 320 px and with keyboard only.

## Phase 8

Automated:

- [x] Customers cannot call administrator order list or detail RPCs.
- [x] Browser identities cannot execute the lower-level paid-confirmation function.
- [x] Payment notices, rejection, cancellation, and refunds use validated transitions.
- [x] Rejection and cancellation release active reservations.
- [x] Paid confirmation converts inventory without double counting.
- [x] Refund initiation reverses converted inventory once.
- [x] Late payment requires a reason and stores an administrator override.
- [x] Evidence metadata requires an existing private object in the order directory.
- [x] Customers cannot download evidence or insert its metadata directly.
- [x] Nine pgTAP files pass with 170 assertions.

Manual review before Phase 9:

- [ ] Review the real order list and every filter from an administrator phone.
- [ ] Open a customer's WhatsApp conversation from the order detail.
- [ ] Mark an active order paid with and without a selected screenshot.
- [ ] Attach a second screenshot after payment and open both private links.
- [ ] Reject a payment and confirm the unit returns to available inventory.
- [ ] Cancel an unpaid order and review its audit timeline.
- [ ] Complete `refund_pending → refunded` after a real test QR return.
- [ ] Accept an expired payment exceptionally and review the recorded reason.
- [ ] Confirm a customer account cannot open any administrator order or evidence.
- [ ] Review the detail at 320 px and complete every action using only the keyboard.

## Phase 9

Automated:

- [x] Customer history requires a permanent, non-anonymous account.
- [x] Orders are selected by permanent `customer_id`, never by phone matching.
- [x] Another account cannot read the list or detail.
- [x] Guest checkout identities cannot use web history, including their own order.
- [x] Raw order, item, and status-history tables are closed to browser identities.
- [x] Customer detail omits administrative reasons, metadata, actor IDs, and evidence.
- [x] History pagination is limited to 20 orders per page.
- [x] Administrator fulfillment follows the exact paid order progression.
- [x] Ten pgTAP files pass with 196 assertions.

Manual review before Phase 10:

- [ ] Place an order while signed in and confirm it appears in `Mis pedidos`.
- [ ] Place an order as guest with the same phone and confirm it never appears.
- [ ] Open another account with the same phone and confirm its history is empty.
- [ ] Review payment, product, purchase, transit, delivery, refund, and expired copy.
- [ ] Advance a paid order through all four fulfillment actions as administrator.
- [ ] Confirm every update appears chronologically in the customer timeline.
- [ ] Open the contextual WhatsApp help message from a physical phone.
- [ ] Sign out from a detail URL, sign in again, and confirm the full URL is restored.
- [ ] Review list, detail, pagination, and timeline at 320 px and by keyboard.

## Phase 10

Automated:

- [x] Two simultaneous authenticated checkouts allow exactly one winner for the
      final unit.
- [x] Retry idempotency returns the same order after the concurrency race.
- [x] Database and SDK checks cover the 15-minute reservation and minute-25
      payment-report windows.
- [x] Bulk repricing leaves existing order item prices and totals unchanged.
- [x] Product and payment-evidence uploads require generated UUID-based paths.
- [x] Evidence MIME type and size must match private Storage metadata.
- [x] Disguised JPEG/PNG/WebP files are rejected by browser signature checks.
- [x] Eleven pgTAP files pass with 209 assertions.
- [x] Production dependency audit reports zero known vulnerabilities.
- [x] Every exported application route has `es-BO`, viewport metadata, a unique
      title, and keyboard skip navigation.
- [x] Static checks confirm AA text contrast, visible focus, reduced motion,
      44/48 px touch targets, image alternatives, safe new tabs, and Cloudflare
      security headers.
- [x] The largest route references 259,584 gzip bytes of initial JavaScript, below
      the 300 KiB hardening budget.

Manual review before Phase 11:

- [ ] Review all customer and administrator routes at 320 px without horizontal
      scrolling.
- [ ] Complete guest checkout, account checkout, and administration using only the
      keyboard.
- [ ] Review focus order and route announcements with a screen reader.
- [ ] Check every status and warning in high-contrast or forced-colors mode.
- [ ] Test catalogue loading and checkout on a throttled mid-range Android phone.
- [ ] Review the purchase conditions and privacy policy with a Bolivian legal
      professional.
- [ ] Confirm the business identity, delivery responsibility, retention periods,
      tax disclosures, and a non-WhatsApp privacy contact if required.
