import { describe, expect, it } from "vitest";

import { calculatePricingPreview } from "../lib/money/pricing-preview";

describe("calculatePricingPreview", () => {
  it("applies exchange rates, spread, contingency and fixed profit", () => {
    expect(
      calculatePricingPreview({
        priceKrw: 21_000,
        krwPerUsd: 1_380,
        bcbBobPerUsd: 6.96,
        bankSpreadBobPerUsd: 0.28,
        contingencyRate: 0.03,
        profitBob: 42,
      }),
    ).toEqual({
      protectedCostBob: 114,
      sellingPriceBob: 156,
    });
  });
});
