"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export async function ensureGuestSession(captchaToken?: string) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  if (currentUser) {
    return currentUser;
  }

  const { data, error } = await supabase.auth.signInAnonymously({
    options: captchaToken ? { captchaToken } : undefined,
  });

  if (error || !data.user) {
    throw error ?? new Error("ANONYMOUS_SIGN_IN_FAILED");
  }

  return data.user;
}
