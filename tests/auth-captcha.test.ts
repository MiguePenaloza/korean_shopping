import { describe, expect, it } from "vitest";

import { getCaptchaConfiguration } from "@/lib/auth/captcha";

describe("Auth CAPTCHA configuration", () => {
  it("requires a real site key in production", () => {
    expect(getCaptchaConfiguration("", "production")).toEqual({
      siteKey: "",
      providerConfigured: false,
      localBypass: false,
    });
  });

  it("allows the documented local-only bypass", () => {
    expect(getCaptchaConfiguration(undefined, "development").localBypass).toBe(true);
  });

  it("normalizes the public Turnstile site key", () => {
    expect(getCaptchaConfiguration("  site-key  ", "production")).toEqual({
      siteKey: "site-key",
      providerConfigured: true,
      localBypass: false,
    });
  });
});
