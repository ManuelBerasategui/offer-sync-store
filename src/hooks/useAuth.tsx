import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { getIsAdmin } from "@/lib/admin.functions";

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
      .select(
        "nombre, dni, telefono, provincia, ciudad, codigo_postal, transporte, sucursal_correo",
      )
      .eq("id", userId)
      .maybeSingle();
    setProfile(data ? { ...EMPTY_SHIPPING, ...data } : null);
  }, []);

  useEffect(() => {
    let initialLoaded = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "INITIAL_SESSION" && initialLoaded) return;
      initialLoaded = true;
      setSession(next);
      setLoading(false);
      void loadProfile(next?.user?.id);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (initialLoaded) return;
      initialLoaded = true;
      setSession(data.session);
      setLoading(false);
      void loadProfile(data.session?.user?.id);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  // Si la cuenta es admin lo decide el servidor (misma lista ADMIN_EMAILS que protege el panel).
  // Solo sirve para mostrar el link al admin: cada acción del panel se vuelve a verificar en el servidor.
  const [isAdmin, setIsAdmin] = useState(false);
  const accessToken = session?.access_token;
  useEffect(() => {
    if (!accessToken) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    getIsAdmin({ data: { token: accessToken } })
      .then((res) => {
        if (!cancelled) setIsAdmin(Boolean(res?.isAdmin));
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

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
