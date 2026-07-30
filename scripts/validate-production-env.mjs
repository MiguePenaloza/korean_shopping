const failures = [];

function required(name) {
  const value = process.env[name]?.trim() ?? "";
  if (!value) failures.push(`${name} is required.`);
  return value;
}

function requireHttpsUrl(name, value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      failures.push(`${name} must use HTTPS.`);
    }
    return url;
  } catch {
    failures.push(`${name} must be a valid URL.`);
    return null;
  }
}

const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const siteUrl = required("NEXT_PUBLIC_SITE_URL");
const turnstileSiteKey = required("NEXT_PUBLIC_TURNSTILE_SITE_KEY");

const parsedSupabaseUrl = requireHttpsUrl("NEXT_PUBLIC_SUPABASE_URL", supabaseUrl);
const parsedSiteUrl = requireHttpsUrl("NEXT_PUBLIC_SITE_URL", siteUrl);

if (
  parsedSupabaseUrl &&
  !(
    parsedSupabaseUrl.hostname.endsWith(".supabase.co") ||
    parsedSupabaseUrl.hostname.endsWith(".supabase.net")
  )
) {
  failures.push(
    "NEXT_PUBLIC_SUPABASE_URL must use the hosted Supabase domain for this release.",
  );
}

if (
  publishableKey &&
  !(publishableKey.startsWith("sb_publishable_") || publishableKey.startsWith("eyJ"))
) {
  failures.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY has an unexpected format.");
}

if (parsedSiteUrl && parsedSiteUrl.pathname !== "/") {
  failures.push("NEXT_PUBLIC_SITE_URL must be the site origin without a path.");
}

if (turnstileSiteKey && turnstileSiteKey.length < 10) {
  failures.push("NEXT_PUBLIC_TURNSTILE_SITE_KEY has an unexpected format.");
}

const forbiddenPublicNames = Object.keys(process.env).filter(
  (name) =>
    name.startsWith("NEXT_PUBLIC_") && /(SERVICE|SECRET|PASSWORD|PRIVATE)/i.test(name),
);
if (forbiddenPublicNames.length) {
  failures.push(
    `Forbidden public secret-like variables found: ${forbiddenPublicNames.join(", ")}.`,
  );
}

if (failures.length) {
  console.error("Production environment validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("PASS production public environment is complete and uses HTTPS");
console.log("PASS no secret-like NEXT_PUBLIC variable names were found");
