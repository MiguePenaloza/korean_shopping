import { describe, expect, it } from "vitest";

import { mapCatalogueRow } from "@/lib/catalogue/catalogue";

const row = {
  id: "40000000-0000-4000-8000-000000000001",
  code: "BP-001",
  name: "Relief Sun",
  brand: "Beauty of Joseon",
  description: "Protector solar.",
  variant: "50 ml",
  category_name: "Skincare",
  price_bob: "168.00",
  price_expires_at: "2026-07-28T12:15:00.000Z",
  availability: "available",
  thumbnail_path: null,
  thumbnail_alt: null,
};

describe("catalogue mapping", () => {
  it("maps fixed-precision database values for customer display", () => {
    const product = mapCatalogueRow(row);

    expect(product.priceBob).toBe(168);
    expect(product.priceValidUntil).toContain("08:15");
    expect(product.availability).toBe("available");
  });

  it("rejects an unknown public availability state", () => {
    expect(() => mapCatalogueRow({ ...row, availability: "hidden" })).toThrow(
      "INVALID_CATALOGUE_AVAILABILITY",
    );
  });
});
