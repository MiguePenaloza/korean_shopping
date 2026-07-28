import { describe, expect, it } from "vitest";

import {
  getSafeNextPath,
  isValidFullName,
  isValidPassword,
  normalizeBolivianPhoneInput,
} from "@/lib/auth/validation";

describe("identity validation", () => {
  it("normalizes supported Bolivian mobile numbers", () => {
    expect(normalizeBolivianPhoneInput("7123 4567")).toBe("+59171234567");
    expect(normalizeBolivianPhoneInput("+591 61234567")).toBe("+59161234567");
    expect(normalizeBolivianPhoneInput("123")).toBeNull();
  });

  it("validates account fields", () => {
    expect(isValidFullName("Ana")).toBe(true);
    expect(isValidFullName(" ")).toBe(false);
    expect(isValidPassword("12345678")).toBe(true);
    expect(isValidPassword("1234567")).toBe(false);
  });

  it("accepts only same-site relative redirects", () => {
    expect(getSafeNextPath("/mis-pedidos")).toBe("/mis-pedidos");
    expect(getSafeNextPath("//evil.test")).toBe("/mi-cuenta");
    expect(getSafeNextPath("https://evil.test")).toBe("/mi-cuenta");
  });
});
