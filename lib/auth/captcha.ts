export type CaptchaConfiguration = {
  siteKey: string;
  localBypass: boolean;
  providerConfigured: boolean;
};

export function getCaptchaConfiguration(
  siteKey: string | undefined,
  nodeEnvironment: string | undefined,
): CaptchaConfiguration {
  const normalizedSiteKey = siteKey?.trim() ?? "";
  const providerConfigured = normalizedSiteKey.length > 0;

  return {
    siteKey: normalizedSiteKey,
    providerConfigured,
    localBypass: nodeEnvironment !== "production" && !providerConfigured,
  };
}
