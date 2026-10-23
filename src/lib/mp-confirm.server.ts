/**
 * Confirmación de pagos de Mercado Pago, compartida por la página de "gracias"
 * (verifyOrderPayment) y por el webhook de MP (/api/mp-webhook).
 *
 * El estado SOLO sale de la API de Mercado Pago, consultada con el token del comercio: nunca de
 * lo que diga la URL ni el cuerpo de una notificación (cualquiera puede mandar una falsa).
 */
import type { NotifyOrderInput } from "./email.functions";
import { decideMpPayment, type MpDecision, type MpPayment } from "./mp-verify";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

export const ORDER_FIELDS =
  "id, order_code, estado, total, metodo_pago, nombre, email, telefono, dni, provincia, ciudad, codigo_postal, transporte, sucursal_correo, items";

export type MpOrder = {
  id: string;
  order_code: string;
  estado: string | null;
  total: number | string;
  metodo_pago: string | null;
  nombre?: string | null;
  email?: string | null;
  telefono?: string | null;
  dni?: string | null;
  provincia?: string | null;
  ciudad?: string | null;
  codigo_postal?: string | null;
  transporte?: string | null;
  sucursal_correo?: string | null;
  items?: unknown;
};

/** Solo los pedidos de Mercado Pago (o tarjeta) se confirman con un pago de MP. */
export function isMpOrder(order: Pick<MpOrder, "metodo_pago">): boolean {
  return (
    !order.metodo_pago || order.metodo_pago === "mercadopago" || order.metodo_pago === "tarjeta"
  );
}

/** Consulta un pago en la API de Mercado Pago. null si no se pudo. */
export async function fetchMpPayment(paymentId: string): Promise<MpPayment | null> {
  const mpToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (!mpToken || !/^\d{1,20}$/.test(paymentId)) return null;
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { authorization: `Bearer ${mpToken}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[mp] consulta de pago ${paymentId} falló (HTTP ${res.status})`);
      return null;
    }
    return (await res.json()) as MpPayment;
  } catch (err) {
    console.error("[mp] error consultando el pago:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Aplica la decisión sobre un pedido pendiente. El paso a "pagado" es condicional
 * (solo si sigue "pendiente"), así dos avisos simultáneos no mandan los emails dos veces.
 */
export async function confirmMpOrder(
  supabaseAdmin: AdminClient,
  order: MpOrder,
  payment: MpPayment | null,
): Promise<MpDecision> {
  const decision = decideMpPayment(order, payment);
  if (decision !== "pagado") {
    if (payment && payment.external_reference !== order.order_code) {
      console.error(`[mp] el pago no corresponde al pedido ${order.order_code}`);
    }
    return decision;
  }
  if (order.estado === "pagado") return "pagado";

  const finalMetodo = order.metodo_pago === "tarjeta" ? "tarjeta" : "mercadopago";
  const { data: updated, error: updErr } = await supabaseAdmin
    .from("orders")
    .update({ estado: "pagado", metodo_pago: finalMetodo })
    .eq("id", order.id)
    .eq("estado", "pendiente")
    .select("id");
  if (updErr) {
    console.error("[mp] error al marcar el pedido como pagado:", updErr.message);
    return "pendiente";
  }
  // Si no se actualizó ninguna fila, otro aviso ya lo confirmó (o el admin cambió el estado)
  if (!Array.isArray(updated) || updated.length === 0) return "pagado";

  // Guardar los datos de envío en el perfil de la cuenta, si la hay
  const { data: fullOrder } = await supabaseAdmin
    .from("orders")
    .select(
      "user_id, nombre, dni, telefono, provincia, ciudad, codigo_postal, transporte, sucursal_correo",
    )
    .eq("id", order.id)
    .maybeSingle();
  if (fullOrder?.user_id) {
    await supabaseAdmin.from("profiles").upsert(
      {
        id: fullOrder.user_id,
        nombre: fullOrder.nombre,
        dni: fullOrder.dni,
        telefono: fullOrder.telefono,
        provincia: fullOrder.provincia,
        ciudad: fullOrder.ciudad,
        codigo_postal: fullOrder.codigo_postal,
        transporte: fullOrder.transporte,
        sucursal_correo: fullOrder.sucursal_correo,
      },
      { onConflict: "id" },
    );
  }

  // Emails al admin y al comprador (si falla, el pedido igual queda pagado)
  try {
    let couponCode: string | undefined;
    let couponDiscount: number | undefined;
    try {
      const { data: usage } = await supabaseAdmin
        .from("coupon_usages")
        .select("coupon_code, discount_amount")
        .eq("order_code", order.order_code)
        .maybeSingle();
      if (usage) {
        couponCode = usage.coupon_code;
        couponDiscount = Number(usage.discount_amount) || undefined;
      }
    } catch {
      // ignore
    }
    const { notifyNewOrder } = await import("./email.functions");
    const items: NotifyOrderInput["items"] = Array.isArray(order.items)
      ? (order.items as { nombre: string; qty: number; unitPrice: number }[]).map((i) => ({
          nombre: i.nombre ?? "",
          qty: Number(i.qty) || 1,
          unitPrice: Number(i.unitPrice) || 0,
        }))
      : [];
    await notifyNewOrder({
      orderCode: order.order_code,
      total: Number(order.total),
      metodoPago: finalMetodo,
      shipping: {
        nombre: order.nombre ?? "",
        email: order.email ?? "",
        telefono: order.telefono ?? "",
        dni: order.dni ?? undefined,
        provincia: order.provincia ?? undefined,
        ciudad: order.ciudad ?? undefined,
        codigo_postal: order.codigo_postal ?? undefined,
        transporte: order.transporte ?? undefined,
        sucursal_correo: order.sucursal_correo ?? undefined,
      },
      items,
      couponCode,
      couponDiscountAmount: couponDiscount,
    } satisfies NotifyOrderInput);
  } catch (e) {
    console.error("[mp] error enviando los emails del pedido:", e instanceof Error ? e.message : e);
  }
  return "pagado";
}
