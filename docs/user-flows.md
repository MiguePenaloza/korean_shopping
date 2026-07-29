# User flows

## Public catalogue

1. The home page requests the first three safe catalogue results.
2. `Buscar` loads active categories and one page of up to 20 products.
3. The customer can search by name, brand, or code and filter by category.
4. PostgreSQL returns available products first and expired products last.
5. The detail route uses `/producto?id=...` and reloads the current public state.
6. Reserved, sold-out, and expired products cannot be added.
7. Exact quantities remain visible only in administrator interfaces.

An expired product stays visible with `Precio vencido` and the message explaining
that it awaits the official exchange-rate update.

## Guest order

1. Browse products.
2. Add valid items to the local cart.
3. Revalidate the cart.
4. Enter name, phone, and accept conditions; no email is required.
5. Supabase creates a protected anonymous identity when needed.
6. PostgreSQL revalidates price and stock, then creates a 15-minute reservation.
7. The confirmation uses the immutable database total.
8. `Solicitar QR por WhatsApp` opens the configured administrator conversation.
9. `Avisar pago realizado` records `payment_reported`, extends the reservation to
   minute 25, and opens WhatsApp.
10. Continue communication through WhatsApp; no web history is provided.

## Permanent customer order

The customer signs in with Google or email/password before confirmation. The cart is
preserved, and the resulting order appears in `Mis pedidos`.

Guest orders are not attached to a later account based only on matching phone numbers.

## Identity and account

### Guest

1. Enter name and Bolivian mobile number at checkout.
2. Accept conditions and privacy.
3. Complete Turnstile when no session exists.
4. Supabase creates a protected anonymous Auth user.
5. No permanent profile or web history is created.
6. Continue coordination through WhatsApp.

### Optional account

1. Choose Google or email/password.
2. Supabase verifies the provider or confirmation link.
3. PostgreSQL creates a customer profile from safe metadata.
4. The customer can update name and phone through a validated RPC.
5. `Mis pedidos` is available only for orders created while using that account.

### Password recovery

1. Enter the account email.
2. Receive a one-time recovery link.
3. Return through the PKCE callback.
4. Set a new password of at least 8 characters.

The interface always shows a neutral response for recovery requests, so it does not
reveal whether an email is registered.

## Administrator product flow

1. Confirm the current exchange-rate inputs.
2. Photograph a product.
3. Enter name, category, KRW, quantity, and fixed BOB profit.
4. Review converted cost and final BOB price.
5. Publish, save, or save and create another.
6. Open the native share sheet or copy the direct URL.

## Bulk repricing

1. After 20:00 Bolivia time, enter or reuse an exchange rate.
2. Preview affected products and final prices.
3. Confirm one bulk operation.
4. Products with stock receive a new price version ending at 08:15.
5. Existing order snapshots remain unchanged.

## Payment verification

1. Customer requests the QR.
2. Customer pays externally.
3. `Avisar pago realizado` records a report and opens WhatsApp.
4. Administrator verifies the payment.
5. Administrator optionally uploads private evidence and marks the order paid.
6. The order becomes confirmed for purchasing in Korea.

The administrator may also attach evidence after confirming payment. Each file is
private, records uploader and date, and is opened through a short-lived signed link.

## Rejected payment or cancellation

1. Administrator opens the live order detail.
2. For a rejected payment, records a reason and confirms rejection.
3. For an unpaid cancellation, records a reason and confirms cancellation.
4. PostgreSQL releases any active reservation.
5. The reason and resulting states remain in the order timeline.

## Refund

1. A reported or confirmed payment is marked `refund_pending` with a reason.
2. PostgreSQL releases active inventory or reverses converted confirmed inventory.
3. Administrator returns the money personally through the customer's QR.
4. Administrator marks the order `refunded` with the return reason.

The normal late-payment flow is `expired → refund_pending → refunded`. If there is
still time to buy, the administrator may exceptionally accept the expired payment
only after entering a reason; PostgreSQL revalidates stock under locks and stores
an administrative override.
