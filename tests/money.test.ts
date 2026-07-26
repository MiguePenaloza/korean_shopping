import { describe, expect, it } from "vitest";

import { formatBob, formatKrw } from "@/lib/money/format";

describe("money formatting", () => {
  it("formats bolivianos with two decimals", () => {
    expect(formatBob(167)).toBe("Bs 167,00");
  });

  it("formats Korean won without decimals", () => {
    expect(formatKrw(25000)).toBe("₩25.000");
  });
});
