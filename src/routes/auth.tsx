import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { storeQueryOptions } from "@/lib/store-query";
import { supabase } from "@/integrations/supabase/client";
import { EMPTY_SHIPPING, useAuth, type ShippingData } from "@/hooks/useAuth";

const authSearchSchema = z.object({
  mode: z.enum(["login", "register", "forgot"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: authSearchSchema,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(storeQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Iniciar sesión — Te importamos" },
      {
        name: "description",
        content:
          "Iniciá sesión o creá tu cuenta para comprar más rápido, guardar tus datos de envío y acceder a descuentos exclusivos.",
      },
      { property: "og:title", content: "Iniciar sesión — Te importamos" },
      {
        property: "og:description",
        content: "Tu cuenta para comprar productos importados con envío a todo el país.",
      },
    ],
  }),
  component: AuthPage,
});

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary";
const MAX_FIELD_LENGTH = 40;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 72;

type Mode = "login" | "register" | "forgot";

const BASE_FIELDS: { key: keyof ShippingData; label: string }[] = [
  { key: "nombre", label: "Nombre y apellido" },
  { key: "dni", label: "DNI" },
  { key: "telefono", label: "Teléfono" },
  { key: "provincia", label: "Provincia" },
  { key: "ciudad", label: "Ciudad" },
  { key: "codigo_postal", label: "Código postal" },
];

function validateShippingData(form: ShippingData) {
  if (Object.values(form).some((value) => value.length > MAX_FIELD_LENGTH)) {
    return `Cada dato de perfil puede tener hasta ${MAX_FIELD_LENGTH} caracteres.`;
  }
  if (BASE_FIELDS.some((field) => !form[field.key].trim()) || !form.sucursal_correo.trim()) {
    return "Completá todos los datos de envío.";
  }
  if (!/^\d{7,8}$/.test(form.dni.trim())) {
    return "El DNI debe contener entre 7 y 8 números (sin puntos ni letras).";
  }
  if (form.telefono.replace(/\D/g, "").length < 8) {
    return "Ingresá un número de teléfono válido con característica.";
  }
  return null;
}

function AuthPage() {
  const { data } = useSuspenseQuery(storeQueryOptions);
  const { config } = data;
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile, isAdmin } = useAuth();

  // The URL is now the single source of truth for `mode` instead of a
  // useState that only read `search.mode` on first mount. That's what made
  // /auth?mode=forgot show the login screen: a client-side search-param
  // change doesn't remount this component, so a plain useState never
  // noticed the URL had changed.
  const mode: Mode = search.mode ?? "login";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [form, setForm] = useState<ShippingData>(EMPTY_SHIPPING);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<ShippingData>(EMPTY_SHIPPING);
  const [profileError, setProfileError] = useState("");
  const [profileMsg, setProfileMsg] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // --- Password recovery ---------------------------------------------
  // When someone clicks the "reset password" link from their email,
  // Supabase redirects them back here with a valid session already
  // attached and fires a PASSWORD_RECOVERY event. Previously that meant
  // `user` became truthy and they'd land straight on the "Mi cuenta"
  // panel below, without ever being asked to set a new password — so the
  // reset flow never actually completed. This listener catches that case
  // and shows a dedicated "set new password" screen instead.
  const [recovering, setRecovering] = useState(false);
  const [recoveryDone, setRecoveryDone] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecovering(true);
      }
    });

    // En el flujo implícito, Supabase agrega `type=recovery` al fragmento
    // de la URL. Lo detectamos también por si el evento ocurre antes de que
    // el listener termine de inicializarse.
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    if (hashParams.get("type") === "recovery") {
      setRecovering(true);
    }

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!editingProfile) setProfileForm({ ...EMPTY_SHIPPING, ...profile });
  }, [profile, editingProfile]);

  const goToMode = (next: Mode) => {
    setError("");
    setMsg("");
    navigate({ to: "/auth", search: { mode: next }, replace: true });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMsg("");
    setLoading(true);
    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) {
          if (err.message.includes("Email not confirmed")) {
            throw new Error("Debés confirmar tu casilla de correo electrónico antes de iniciar sesión. Revisá tu email (y la carpeta de Spam).");
          }
          if (err.message.includes("Invalid login credentials")) {
            throw new Error("Email o contraseña incorrectos.");
          }
          throw err;
        }
        navigate({ to: "/" });
        return;
      }
      if (mode === "register") {
        if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
        if (password.length > MAX_PASSWORD_LENGTH) {
          throw new Error(`La contraseña puede tener hasta ${MAX_PASSWORD_LENGTH} caracteres.`);
        }
        const shippingError = validateShippingData(form);
        if (shippingError) throw new Error(shippingError);
        // Validación de Email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
          throw new Error("Ingresá un correo electrónico válido (ej: nombre@gmail.com).");
        }
        if (email.length > MAX_EMAIL_LENGTH) throw new Error("El email es demasiado largo.");
        const { data: signupData, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth`, data: { ...form } },
        });
        if (err) throw err;

        if (signupData.session) {
          navigate({ to: "/" });
          return;
        }

        navigate({ to: "/auth", search: { mode: "login" }, replace: true });
        setMsg("¡Cuenta creada con éxito! Ya podés iniciar sesión con tu email y contraseña.");
        return;
      }
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw err;
      setMsg("Te enviamos un mail para restablecer tu contraseña.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos completar la operación.");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileMsg("");
    const validationError = validateShippingData(profileForm);
    if (validationError) {
      setProfileError(validationError);
      return;
    }
    if (!user) return;

    setSavingProfile(true);
    try {
      const { error: err } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...profileForm });
      if (err) throw err;
      await refreshProfile();
      setProfileMsg("Tus datos se guardaron correctamente.");
      setEditingProfile(false);
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "No pudimos guardar tus datos. Probá de nuevo.",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const submitNewPassword = async (e: React.FormEvent) => {
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
      setRecoveryDone(true);
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
        {recovering ? (
          <div className="card-soft p-6">
            <h1 className="font-sans text-xl font-bold normal-case tracking-tight">
              Elegí tu nueva contraseña
            </h1>

            {recoveryDone ? (
              <>
                <p className="mt-4 text-sm text-whatsapp">¡Contraseña actualizada!</p>
                <button
                  onClick={() => {
                    setRecovering(false);
                    navigate({ to: "/" });
                  }}
                  className="btn-base grad-urgente text-primary-foreground mt-4"
                >
                  Continuar
                </button>
              </>
            ) : (
              <form className="mt-5 flex flex-col gap-4" onSubmit={submitNewPassword}>
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
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                    Repetir contraseña
                  </span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    maxLength={MAX_PASSWORD_LENGTH}
                    className={inputClass}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-base grad-urgente text-primary-foreground disabled:opacity-60"
                >
                  {loading ? "Guardando..." : "Guardar nueva contraseña"}
                </button>

                {error && <p className="text-sm text-destructive">{error}</p>}
              </form>
            )}
          </div>
        ) : user ? (
          <div className="card-soft p-6">
            <h1 className="font-sans text-xl font-bold normal-case tracking-tight">Mi cuenta</h1>
            <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
            {editingProfile ? (
              <form className="mt-5 flex flex-col gap-4" onSubmit={saveProfile}>
                {BASE_FIELDS.map((field) => (
                  <label key={field.key} className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                      {field.label}
                    </span>
                    <input
                      required
                      className={inputClass}
                      value={profileForm[field.key]}
                      type={field.key === "telefono" ? "tel" : "text"}
                      inputMode={
                        field.key === "dni"
                          ? "numeric"
                          : field.key === "telefono"
                            ? "tel"
                            : undefined
                      }
                      maxLength={field.key === "dni" ? 8 : MAX_FIELD_LENGTH}
                      onChange={(e) => {
                        let value = e.target.value;
                        if (field.key === "dni") value = value.replace(/\D/g, "").slice(0, 8);
                        if (field.key === "telefono") value = value.replace(/[^\d+()\-\s]/g, "");
                        setProfileForm({ ...profileForm, [field.key]: value });
                      }}
                    />
                  </label>
                ))}
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                    Transporte
                  </span>
                  <select
                    required
                    className={inputClass}
                    value={profileForm.transporte}
                    onChange={(e) => setProfileForm({ ...profileForm, transporte: e.target.value })}
                  >
                    <option value="Correo Argentino">Correo Argentino</option>
                    <option value="Vía Cargo">Vía Cargo</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                    {profileForm.transporte === "Vía Cargo"
                      ? "Suc. Vía Cargo más cercana"
                      : "Suc. Correo Argentino más cercana"}
                  </span>
                  <input
                    required
                    className={inputClass}
                    maxLength={MAX_FIELD_LENGTH}
                    value={profileForm.sucursal_correo}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, sucursal_correo: e.target.value })
                    }
                  />
                </label>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="btn-base grad-urgente flex-1 text-primary-foreground disabled:opacity-60"
                  >
                    {savingProfile ? "Guardando..." : "Guardar cambios"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProfile(false);
                      setProfileError("");
                    }}
                    className="btn-base border border-border text-foreground"
                  >
                    Cancelar
                  </button>
                </div>
                {profileError && <p className="text-sm text-destructive">{profileError}</p>}
              </form>
            ) : (
              <>
                {profile && (
                  <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                    {BASE_FIELDS.map((field) => (
                      <li key={field.key}>
                        <span className="font-semibold text-foreground">{field.label}:</span>{" "}
                        {profile[field.key] || "—"}
                      </li>
                    ))}
                    <li>
                      <span className="font-semibold text-foreground">Transporte:</span>{" "}
                      {profile.transporte || "—"}
                    </li>
                    <li>
                      <span className="font-semibold text-foreground">Sucursal:</span>{" "}
                      {profile.sucursal_correo || "—"}
                    </li>
                  </ul>
                )}
                {profileMsg && <p className="mt-4 text-sm text-whatsapp">{profileMsg}</p>}
                <button
                  type="button"
                  onClick={() => {
                    setProfileForm({ ...EMPTY_SHIPPING, ...profile });
                    setProfileMsg("");
                    setEditingProfile(true);
                  }}
                  className="btn-base mt-5 w-full border border-border text-foreground"
                >
                  Editar perfil
                </button>
              </>
            )}
            <div className="mt-6 flex flex-col gap-3">
              {isAdmin && (
                <Link
                  to="/admin/ordenes"
                  className="btn-base bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-center"
                >
                  📦 Panel de Órdenes Pagadas
                </Link>
              )}
              <Link to="/catalogo" className="btn-base grad-urgente text-primary-foreground">
                Seguir comprando
              </Link>
              <button
                onClick={() => void signOut()}
                className="btn-base border border-border text-foreground"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        ) : (
          <div className="card-soft p-6">
            <h1 className="font-sans text-xl font-bold normal-case tracking-tight">
              {mode === "login"
                ? "Iniciar sesión"
                : mode === "register"
                  ? "Crear cuenta"
                  : "Recuperar contraseña"}
            </h1>

            <form className="mt-5 flex flex-col gap-4" onSubmit={submit}>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                  Usuario (email)
                </span>
                <input
                  type="email"
                  required
                  className={inputClass}
                  maxLength={MAX_EMAIL_LENGTH}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              {mode !== "forgot" && (
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                    Contraseña
                  </span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className={inputClass}
                    maxLength={MAX_PASSWORD_LENGTH}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
              )}

              {mode === "register" && (
                <>
                  {BASE_FIELDS.map((f) => (
                    <label key={f.key} className="flex flex-col gap-1.5">
                      {f.key === "dni" && (
                        <p className="text-xs text-muted-foreground">
                          Ahora te pedimos unos datos para hacer el envío directo a domicilio.
                        </p>
                      )}
                      <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                        {f.label}
                      </span>
                      <input
                        required
                        className={inputClass}
                        value={form[f.key]}
                        type={f.key === "telefono" ? "tel" : "text"}
                        inputMode={
                          f.key === "dni" ? "numeric" : f.key === "telefono" ? "tel" : undefined
                        }
                        maxLength={f.key === "dni" ? 8 : MAX_FIELD_LENGTH}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (f.key === "dni") {
                            val = val.replace(/\D/g, "").slice(0, 8);
                          }
                          if (f.key === "telefono") {
                            val = val.replace(/[^\d+()\-\s]/g, "");
                          }
                          setForm({ ...form, [f.key]: val });
                        }}
                      />
                    </label>
                  ))}

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                      Transporte
                    </span>
                    <select
                      required
                      className={inputClass}
                      value={form.transporte}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          transporte: e.target.value as ShippingData["transporte"],
                        })
                      }
                    >
                      <option value="Correo Argentino">Correo Argentino</option>
                      <option value="Vía Cargo">Vía Cargo</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                      {form.transporte === "Vía Cargo"
                        ? "Suc. Vía Cargo más cercana"
                        : "Suc. Correo Argentino más cercana"}
                    </span>
                    <input
                      required
                      className={inputClass}
                      maxLength={MAX_FIELD_LENGTH}
                      value={form.sucursal_correo}
                      onChange={(e) => setForm({ ...form, sucursal_correo: e.target.value })}
                    />
                  </label>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-base grad-urgente text-primary-foreground disabled:opacity-60"
              >
                {loading
                  ? "Enviando..."
                  : mode === "login"
                    ? "Iniciar sesión"
                    : mode === "register"
                      ? "Crear mi cuenta"
                      : "Enviar mail de recuperación"}
              </button>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {msg && <p className="text-sm text-whatsapp">{msg}</p>}
            </form>

            <div className="mt-5 flex flex-col items-start gap-2 text-xs">
              {mode === "login" && (
                <>
                  <button
                    onClick={() => goToMode("register")}
                    className="underline text-muted-foreground hover:text-primary"
                  >
                    ¿No tenés cuenta? Registrarse
                  </button>
                  <button
                    onClick={() => goToMode("forgot")}
                    className="underline text-muted-foreground hover:text-primary"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </>
              )}

              {mode !== "login" && (
                <button
                  onClick={() => goToMode("login")}
                  className="underline text-muted-foreground hover:text-primary"
                >
                  Ya tengo cuenta: iniciar sesión
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      <SiteFooter config={config} />
    </div>
  );
}
