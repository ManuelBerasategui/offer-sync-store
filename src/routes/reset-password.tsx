import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { storeQueryOptions } from "@/lib/store-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(storeQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Restablecer contraseña — Te importamos" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ResetPasswordPage,
});

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary";
const MAX_PASSWORD_LENGTH = 72;

function ResetPasswordPage() {
  const { data } = useSuspenseQuery(storeQueryOptions);
  const { config } = data;
  const navigate = useNavigate();

  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let mounted = true;

    // 1. Escuchar evento de recuperación de contraseña de Supabase
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasValidSession(true);
        setCheckingSession(false);
      }
    });

    // 2. Verificar si ya hay una sesión activa o fragmento hash con token
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      const hash = window.location.hash || "";
      const search = window.location.search || "";
      const isRecovery =
        Boolean(session) ||
        hash.includes("type=recovery") ||
        hash.includes("access_token") ||
        search.includes("code=");

      setHasValidSession(isRecovery);
      setCheckingSession(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword.length > MAX_PASSWORD_LENGTH) {
      setError(`La contraseña puede tener hasta ${MAX_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPassword });
      if (err) throw err;
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos actualizar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader config={config} />

      <main className="mx-auto max-w-[460px] px-4 py-12 sm:px-6">
        <div className="card-soft p-6">
          <h1 className="font-sans text-xl font-bold normal-case tracking-tight text-foreground">
            Restablecer contraseña
          </h1>

          {checkingSession ? (
            <div className="py-10 text-center">
              <div className="inline-block h-7 w-7 animate-spin rounded-full border-3 border-primary border-t-transparent" />
              <p className="mt-3 text-xs text-muted-foreground">Verificando enlace de seguridad...</p>
            </div>
          ) : done ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-700 dark:text-emerald-400 font-semibold">
                ✓ ¡Tu contraseña se actualizó con éxito!
              </div>
              <button
                onClick={() => navigate({ to: "/" })}
                className="btn-base grad-urgente text-primary-foreground w-full shadow-md"
              >
                Ir a la tienda
              </button>
            </div>
          ) : !hasValidSession ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                El enlace de recuperación es inválido, ya fue utilizado o ha expirado.
              </p>
              <Link
                to="/auth"
                search={{ mode: "forgot" }}
                className="btn-base grad-urgente text-primary-foreground w-full inline-flex items-center justify-center text-center shadow-md"
              >
                Solicitar un nuevo enlace
              </Link>
            </div>
          ) : (
            <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit}>
              <p className="text-xs text-muted-foreground">
                Ingresá tu nueva contraseña para acceder a tu cuenta.
              </p>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                  Nueva contraseña
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  maxLength={MAX_PASSWORD_LENGTH}
                  className={inputClass}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Al menos 6 caracteres"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                  Repetir nueva contraseña
                </span>
                <input
                  type="password"
                  required
                  minLength={6}
                  maxLength={MAX_PASSWORD_LENGTH}
                  className={inputClass}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetí la contraseña"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="btn-base grad-urgente text-primary-foreground disabled:opacity-60 shadow-md"
              >
                {loading ? "Guardando..." : "Guardar nueva contraseña"}
              </button>

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs font-semibold text-destructive">
                  {error}
                </div>
              )}
            </form>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-xs font-semibold text-muted-foreground hover:text-foreground">
            ← Volver al inicio
          </Link>
        </div>
      </main>

      <SiteFooter config={config} />
    </div>
  );
}
