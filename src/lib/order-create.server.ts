/**
 * Alta de un pedido (transferencia o Mercado Pago) con su uso de cupón.
 *
 * - El código es aleatorio criptográfico y, si llegara a repetirse, se genera otro.
 * - El uso del cupón se registra ANTES que el pedido: con el índice único de coupon_usages
 *   (security_hardening_3.sql), dos pedidos simultáneos no pueden usar el mismo cupón; el
 *   segundo falla y no se crea con descuento. Si después falla el pedido, se libera el cupón.
 */
import { normalizeEmail } from "./coupon-usage";
import { isDuplicateError, makeOrderCode } from "./order-code";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

export async function createOrderRecord(
  supabaseAdmin: AdminClient,
  row: Record<string, unknown>,
  coupon: { code: string; userId: string | null; email: string; discount: number } | null,
): Promise<{ orderCode?: string; error?: string }> {
  let orderCode = makeOrderCode();

  if (coupon) {
    const { error: cErr } = await supabaseAdmin.from("coupon_usages").insert({
      user_id: coupon.userId,
      user_email: normalizeEmail(coupon.email),
      coupon_code: coupon.code,
      order_code: orderCode,
      discount_amount: coupon.discount,
    });
    if (cErr) {
      return {
        error: isDuplicateError(cErr)
          ? "Este cupón ya fue usado con tu cuenta. Volvé al carrito y comprá sin el cupón."
          : "No pudimos aplicar el cupón. Probá de nuevo en unos minutos.",
      };
    }
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const { error } = await supabaseAdmin.from("orders").insert({ ...row, order_code: orderCode });
    if (!error) return { orderCode };
    if (!isDuplicateError(error)) {
      console.error("[orders] error al registrar el pedido:", error.message);
      break;
    }
    // Código repetido (muy raro): otro código, y el cupón reservado pasa al nuevo
    const next = makeOrderCode();
    if (coupon) {
      await supabaseAdmin
        .from("coupon_usages")
        .update({ order_code: next })
        .eq("order_code", orderCode);
    }
    orderCode = next;
  }

  // No se pudo crear el pedido: liberar el cupón reservado
  if (coupon) {
    await supabaseAdmin.from("coupon_usages").delete().eq("order_code", orderCode);
  }
  return { error: "No pudimos registrar tu pedido. Probá de nuevo en unos minutos." };
}
