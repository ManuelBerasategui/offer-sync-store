/**
 * Verificación de administrador para las server functions del panel.
 *
 * La identidad sale SOLO del token de sesión verificado con Supabase. Nunca de un email que manda
 * el navegador: cualquiera puede escribir el email de un admin en una llamada.
 */

/**
 * Emails con permiso de admin: ADMIN_EMAILS (servidor). Si no está configurada, NADIE es admin.
 * Antes había una lista por defecto con emails que cualquiera podía registrar (el registro no pide
 * confirmar el email) y así entrar al panel.
 */
export function adminEmailList(): string[] {
  const raw = process.env["ADMIN_EMAILS"] || process.env["VITE_ADMIN_EMAILS"] || "";
  const list = raw
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return list;
}

/**
 * Lanza un Error si el token no es de un administrador; si lo es, devuelve el cliente con service role.
 * El parámetro email se ignora a propósito (se mantiene por compatibilidad con las llamadas existentes).
 */
export async function assertAdmin(_email?: string, token?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (!token) throw new Error("Acceso denegado: no autenticado.");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  const email = data?.user?.email?.toLowerCase().trim();
  if (error || !email) throw new Error("Acceso denegado: sesión inválida o vencida.");

  if (!adminEmailList().includes(email)) {
    throw new Error("Acceso denegado: sin permisos de administrador.");
  }
  return supabaseAdmin;
}

/** Igual que assertAdmin pero devuelve el error como texto, para funciones que responden { error }. */
export async function checkAdmin(
  token?: string,
): Promise<
  | { ok: true; supabaseAdmin: Awaited<ReturnType<typeof assertAdmin>> }
  | { ok: false; error: string }
> {
  try {
    return { ok: true, supabaseAdmin: await assertAdmin(undefined, token) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Acceso denegado." };
  }
}
