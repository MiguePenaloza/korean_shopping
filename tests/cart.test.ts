import { describe, expect, it } from "vitest";

import {
  cartFingerprint,
  parseCart,
  resolveCheckoutAttempt,
  setCartQuantity,
} from "@/lib/cart/cart";

const productOne = "40000000-0000-4000-8000-000000000001";
const productTwo = "40000000-0000-4000-8000-000000000002";

describe("device-local cart", () => {
  it("rejects malformed values and merges duplicate product lines", () => {
    const parsed = parseCart(
      JSON.stringify([
        { productId: productOne, quantity: 2 },
        { productId: productOne, quantity: 3 },
        { productId: "not-a-product", quantity: 1 },
      ]),
    );
    expect(parsed).toEqual([{ productId: productOne, quantity: 5 }]);
  });

  it("caps quantities and removes zero-quantity lines", () => {
    const added = setCartQuantity([], productOne, 30);
    expect(added[0]?.quantity).toBe(20);
    expect(setCartQuantity(added, productOne, 0)).toEqual([]);
  });

  it("uses one idempotency key for retries of the same cart", () => {
    const fingerprint = cartFingerprint([
      { productId: productTwo, quantity: 1 },
      { productId: productOne, quantity: 2 },
    ]);
    const first = resolveCheckoutAttempt(
      null,
      fingerprint,
      () => "50000000-0000-4000-8000-000000000001",
    );
    const retry = resolveCheckoutAttempt(JSON.stringify(first), fingerprint, () => {
      throw new Error("should not create a second key");
    });
    expect(retry).toEqual(first);
  });

  it("creates a new attempt when the cart changes", () => {
    const previous = {
      fingerprint: `${productOne}:1`,
      idempotencyKey: "50000000-0000-4000-8000-000000000001",
    };
    const next = resolveCheckoutAttempt(
      JSON.stringify(previous),
      `${productOne}:2`,
      () => "50000000-0000-4000-8000-000000000002",
    );
    expect(next.idempotencyKey).not.toBe(previous.idempotencyKey);
  });
});
