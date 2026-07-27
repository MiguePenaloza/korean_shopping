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
