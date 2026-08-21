import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { User } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary";

/** Botón de "Iniciar sesión" en el header con mini formulario desplegable. */
export function HeaderAuth() {
  const { user, profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      setOpen(false);
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-bold text-foreground hover:border-primary hover:text-primary"
            aria-label="Mi cuenta"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">
              {profile?.nombre?.split(" ")[0] || "Mi cuenta"}
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64">
          <p className="truncate text-sm font-semibold">{profile?.nombre || user.email}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          <div className="mt-3 flex flex-col gap-2">
            <Link
              to="/admin/ordenes"
              onClick={() => setOpen(false)}
              className="rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 text-center"
            >
              📦 Panel Órdenes Pagadas
            </Link>
            <Link
              to="/auth"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Ver mis datos
            </Link>
            <button
              onClick={() => {
                void signOut();
                setOpen(false);
              }}
              className="btn-base border border-border py-2 text-xs text-foreground"
            >
              Cerrar sesión
            </button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-bold text-foreground hover:border-primary hover:text-primary"
          aria-label="Iniciar sesión"
        >
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Iniciar sesión</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <form className="flex flex-col gap-2.5" onSubmit={submit}>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[1px] text-muted-foreground">
              Usuario (email)
            </span>
            <input
              type="email"
              required
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[1px] text-muted-foreground">
              Contraseña
            </span>
            <input
              type="password"
              required
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="btn-base grad-urgente mt-1 py-2 text-xs text-primary-foreground disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </button>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </form>
        <div className="mt-3 flex flex-col items-start gap-1.5 text-[11px]">
          <Link
            to="/auth"
            search={{ mode: "register" }}
            onClick={() => setOpen(false)}
            className="text-muted-foreground underline hover:text-primary"
          >
            ¿No tenés cuenta? Registrarse
          </Link>
          <Link
            to="/auth"
            search={{ mode: "forgot" }}
            onClick={() => setOpen(false)}
            className="text-muted-foreground underline hover:text-primary"
          >
            Olvidé mi contraseña
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
