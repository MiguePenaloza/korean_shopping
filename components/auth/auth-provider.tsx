"use client";

import type { User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/browser";

export type CustomerProfile = {
  id: string;
  fullName: string;
  phoneE164: string | null;
  role: "customer" | "admin";
};

type AuthContextValue = {
  user: User | null;
  profile: CustomerProfile | null;
  loading: boolean;
  configured: boolean;
  isAnonymous: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);

  const refreshProfile = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase || !user || user.is_anonymous) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone_e164, role")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !data) {
      setProfile(null);
      return;
    }

    setProfile({
      id: String(data.id),
      fullName: String(data.full_name),
      phoneE164: data.phone_e164 ? String(data.phone_e164) : null,
      role: data.role === "admin" ? "admin" : "customer",
    });
  }, [user]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setUser(data.session?.user ?? null);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshProfile();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      configured,
      isAnonymous: Boolean(user?.is_anonymous),
      isAdmin: profile?.role === "admin",
      refreshProfile,
      signOut,
    }),
    [configured, loading, profile, refreshProfile, signOut, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
