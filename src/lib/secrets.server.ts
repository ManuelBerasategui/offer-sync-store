/**
 * Configuración privada del servidor (claves de API, registros internos).
 *
 * Se guarda en la tabla public.app_secrets, que no tiene políticas de RLS ni permisos para
 * anon/authenticated: solo el service role la lee. Antes la clave de Resend se guardaba en
 * site_config, que es pública (la lee cualquier visitante).
 *
 * Orden de lectura de la clave de Resend: app_secrets → site_config (solo si quedó de antes y
 * todavía no se corrió la migración que la mueve; se lee del lado del servidor) → variable de
 * entorno RESEND_API_KEY.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

const DEFAULT_FROM = "Te Importamos <noreply@teimportamosarg.com>";

export async function getSecret(
  supabaseAdmin: AdminClient,
  clave: string,
): Promise<string | undefined> {
  try {
    const { data, error } = await supabaseAdmin
      .from("app_secrets")
      .select("valor")
      .eq("clave", clave)
      .maybeSingle();
    if (error || !data?.valor) return undefined;
    return String(data.valor);
  } catch {
    return undefined;
  }
}

export async function setSecret(
  supabaseAdmin: AdminClient,
  clave: string,
  valor: string,
): Promise<{ error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("app_secrets")
      .upsert({ clave, valor }, { onConflict: "clave" });
    if (error) {
      return {
        error:
          "No se pudo guardar en la configuración privada. Corré el SQL de seguridad (security_hardening_3) en Supabase.",
      };
    }
    return {};
  } catch {
    return { error: "No se pudo guardar en la configuración privada." };
  }
}

async function legacySiteConfig(
  supabaseAdmin: AdminClient,
  clave: string,
): Promise<string | undefined> {
  try {
    const { data } = await supabaseAdmin
      .from("site_config")
      .select("valor")
      .eq("clave", clave)
      .maybeSingle();
    return data?.valor ? String(data.valor) : undefined;
  } catch {
    return undefined;
  }
}

/** Clave y remitente de Resend, solo para uso en el servidor. */
export async function getResendConfig(
  supabaseAdmin: AdminClient,
): Promise<{ apiKey: string | undefined; from: string }> {
  const apiKey =
    (await getSecret(supabaseAdmin, "resend_api_key")) ||
    (await legacySiteConfig(supabaseAdmin, "resend_api_key")) ||
    process.env["RESEND_API_KEY"] ||
    undefined;
  const from =
    (await getSecret(supabaseAdmin, "resend_from")) ||
    (await legacySiteConfig(supabaseAdmin, "resend_from")) ||
    process.env["RESEND_FROM"] ||
    DEFAULT_FROM;
  return { apiKey: apiKey?.trim() || undefined, from: from.trim() };
}
