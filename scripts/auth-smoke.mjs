import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const url = process.env.BP_SUPABASE_URL;
const publishableKey = process.env.BP_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  console.error("BP_SUPABASE_URL and BP_SUPABASE_PUBLISHABLE_KEY are required.");
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const { data: anonymousData, error: anonymousError } =
  await supabase.auth.signInAnonymously();
assert(!anonymousError, "Anonymous sign-in failed.");
assert(anonymousData.user?.is_anonymous, "Anonymous JWT was not identified.");

const { data: anonymousProfile, error: anonymousProfileError } = await supabase
  .from("profiles")
  .select("id")
  .eq("id", anonymousData.user.id)
  .maybeSingle();
assert(!anonymousProfileError, "Anonymous profile isolation query failed.");
assert(!anonymousProfile, "Anonymous user unexpectedly received a permanent profile.");
await supabase.auth.signOut();

const email = `phase4-${randomUUID()}@example.test`;
const { data: signupData, error: signupError } = await supabase.auth.signUp({
  email,
  password: `Bp-${randomUUID()}`,
  options: {
    data: {
      full_name: "Prueba Fase Cuatro",
      phone: "71234567",
    },
  },
});
assert(!signupError, "Permanent account signup failed.");
assert(
  signupData.user && !signupData.user.is_anonymous,
  "Permanent user was not created.",
);
assert(signupData.session, "Local email signup did not create a session.");

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("full_name, phone_e164, role")
  .eq("id", signupData.user.id)
  .single();
assert(!profileError, "Permanent profile could not be read.");
assert(
  profile.full_name === "Prueba Fase Cuatro",
  "Profile name metadata was not applied.",
);
assert(profile.phone_e164 === "+59171234567", "Profile phone was not normalized.");
assert(profile.role === "customer", "New account did not receive the customer role.");

const { error: directUpdateError } = await supabase
  .from("profiles")
  .update({ full_name: "Cambio directo" })
  .eq("id", signupData.user.id);
assert(directUpdateError, "Direct profile update was unexpectedly allowed.");

const { error: rpcError } = await supabase.rpc("upsert_own_profile", {
  p_full_name: "Prueba Actualizada",
  p_phone: "70000001",
});
assert(!rpcError, "Validated profile RPC failed.");

const { data: updatedProfile, error: updatedProfileError } = await supabase
  .from("profiles")
  .select("full_name, phone_e164")
  .eq("id", signupData.user.id)
  .single();
assert(!updatedProfileError, "Updated profile could not be read.");
assert(updatedProfile.full_name === "Prueba Actualizada", "RPC did not update the name.");
assert(updatedProfile.phone_e164 === "+59170000001", "RPC did not normalize the phone.");

await supabase.auth.signOut();

console.log("PASS anonymous Auth user has no permanent profile");
console.log("PASS email account receives a normalized customer profile");
console.log("PASS direct profile mutation is denied");
console.log("PASS validated profile RPC succeeds");
