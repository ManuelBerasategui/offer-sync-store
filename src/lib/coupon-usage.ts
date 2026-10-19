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
