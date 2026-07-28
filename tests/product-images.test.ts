import { describe, expect, it } from "vitest";

import { fitWithin } from "@/lib/images/product-images";

describe("product image dimensions", () => {
  it("keeps small images unchanged", () => {
    expect(fitWithin(400, 300, 480)).toEqual({ width: 400, height: 300 });
  });

  it("scales landscape and portrait images proportionally", () => {
    expect(fitWithin(2400, 1200, 1200)).toEqual({ width: 1200, height: 600 });
    expect(fitWithin(1000, 2000, 480)).toEqual({ width: 240, height: 480 });
  });

  it("rejects invalid dimensions", () => {
    expect(() => fitWithin(0, 200, 480)).toThrow("INVALID_IMAGE_DIMENSIONS");
  });
});
