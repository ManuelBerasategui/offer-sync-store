import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

export type ShippingData = {
  nombre: string;
  dni: string;
  telefono: string;
  provincia: string;
  ciudad: string;
  codigo_postal: string;
  transporte: string;
  sucursal_correo: string;
};

export const EMPTY_SHIPPING: ShippingData = {
  nombre: "",
  dni: "",
  telefono: "",
  provincia: "",
  ciudad: "",
  codigo_postal: "",
  transporte: "Correo Argentino",
  sucursal_correo: "",
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: ShippingData | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ShippingData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("nombre, dni, telefono, provincia, ciudad, codigo_postal, transporte, sucursal_correo")
      .eq("id", userId)
      .maybeSingle();
    setProfile(data ? { ...EMPTY_SHIPPING, ...data } : null);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
      void loadProfile(next?.user?.id);
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      void loadProfile(data.session?.user?.id);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const rawAdminEmails =
    (import.meta.env["VITE_ADMIN_EMAILS"] as string | undefined) ||
    (import.meta.env["ADMIN_EMAILS"] as string | undefined) ||
    "";
  const adminEmails = rawAdminEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const defaultAdmins = ["admin@config.com", "admin@teimportamos.com"];

  const userEmail = session?.user?.email?.toLowerCase().trim();
  const isAdmin = Boolean(
    userEmail &&
      (adminEmails.length > 0
        ? adminEmails.includes(userEmail)
        : defaultAdmins.includes(userEmail)),
  );

  const value = useMemo<AuthCtx>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      loading,
      isAdmin,
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshProfile: async () => loadProfile(session?.user?.id),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, profile, loading, loadProfile, isAdmin],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
