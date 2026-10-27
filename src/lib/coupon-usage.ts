/**
 * Verificación del cupón de "un uso por cuenta" en el servidor.
 *
 * - La cuenta sale del token de sesión verificado, nunca del userId/email que manda el navegador.
 * - Las consultas usan .eq() (valores parametrizados), no filtros .or() armados con texto del cliente.
 * - Si la verificación falla por cualquier motivo, se considera usado: no se aplica el descuento.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

/** Usuario de la sesión, verificado con Supabase. null si no hay token o no es válido. */
export async function verifiedUserFromToken(
  supabaseAdmin: AdminClient,
  token?: string,
): Promise<{ id: string; email: string } | null> {
  if (!token) return null;
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user?.id) return null;
    return {
      id: String(data.user.id),
      email: String(data.user.email ?? "")
        .trim()
        .toLowerCase(),
    };
  } catch {
    return null;
  }
}

/**
 * Email normalizado para el control del cupón: minúsculas y, en Gmail, sin puntos ni "+alias"
 * (a.b+1@gmail.com y ab@gmail.com son la misma casilla).
 */
export function normalizeEmail(email: string | null | undefined): string {
  const clean = String(email ?? "").trim().toLowerCase();
  const at = clean.lastIndexOf("@");
  if (at <= 0) return clean;
  let user = clean.slice(0, at);
  let domain = clean.slice(at + 1);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") user = user.split("+")[0]!.replace(/\./g, "");
  else user = user.split("+")[0]!;
  return `${user}@${domain}`;
}

/** true si la cuenta (por id o por email) ya usó el cupón, o si no se pudo verificar. */
export async function hasUsedCoupon(
  supabaseAdmin: AdminClient,
  couponCode: string,
  userId: string | null,
  email: string | null,
): Promise<boolean> {
  try {
    const checks: Array<["user_id" | "user_email", string]> = [];
    if (userId) checks.push(["user_id", userId]);
    const cleanEmail = (email ?? "").trim().toLowerCase();
    if (cleanEmail) checks.push(["user_email", cleanEmail]);
    // También la versión normalizada (alias de Gmail), que es como se guardan los usos nuevos
    const normalized = normalizeEmail(email);
    if (normalized && normalized !== cleanEmail) checks.push(["user_email", normalized]);
    if (checks.length === 0) return true;

    for (const [column, value] of checks) {
      const { data, error } = await supabaseAdmin
        .from("coupon_usages")
        .select("id")
        .eq("coupon_code", couponCode)
        .eq(column, value)
        .limit(1);
      if (error) return true;
      if (Array.isArray(data) && data.length > 0) return true;
    }
    return false;
  } catch {
    return true;
  }
}

/**
 * true si ya hay un pedido con ese DNI que usó el cupón (o si no se pudo verificar).
 * Como crear cuentas es gratis e inmediato, el "un uso por cuenta" se completa con un uso por DNI
 * de envío, así no alcanza con registrar otra cuenta para repetir el descuento.
 */
export async function couponUsedByDni(
  supabaseAdmin: AdminClient,
  couponCode: string,
  dni: string | null | undefined,
): Promise<boolean> {
  const digits = String(dni ?? "").replace(/\D/g, "");
  if (digits.length < 6) return false;
  try {
    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("order_code")
      .eq("dni", digits)
      .limit(200);
    if (error) return true;
    const codes = (orders ?? []).map((o: { order_code: string }) => o.order_code).filter(Boolean);
    if (codes.length === 0) return false;
    const { data: usages, error: uErr } = await supabaseAdmin
      .from("coupon_usages")
      .select("id")
      .eq("coupon_code", couponCode)
      .in("order_code", codes)
      .limit(1);
    if (uErr) return true;
    return Array.isArray(usages) && usages.length > 0;
  } catch {
    return true;
  }
}
