/**
 * Decide si un pago consultado a la API de Mercado Pago confirma un pedido.
 * El estado SOLO puede venir de la API de MP: nunca del status de la URL de regreso,
 * que cualquiera puede escribir a mano (?status=approved).
 */
export type MpPayment = {
  status?: string;
  external_reference?: string;
  transaction_amount?: number;
  currency_id?: string;
  transaction_amount_refunded?: number;
};

export type MpDecision = "pagado" | "pendiente" | "rechazado";

export function decideMpPayment(
  order: { order_code: string; total: number | string },
  payment: MpPayment | null,
): MpDecision {
  if (!payment) return "pendiente";
  // El pago tiene que ser de ESTE pedido (external_reference = order_code al crear la preferencia)
  if (payment.external_reference !== order.order_code) return "pendiente";
  // ...y por el monto completo (tolerancia de $1 por redondeos)
  const paid = Number(payment.transaction_amount) || 0;
  if (paid + 1 < Number(order.total)) return "pendiente";
  // ...en pesos (un pago en otra moneda no confirma un total en ARS)
  if (payment.currency_id && payment.currency_id !== "ARS") return "pendiente";
  // Un pago aprobado pero (parcial o totalmente) devuelto no confirma el pedido
  if ((Number(payment.transaction_amount_refunded) || 0) > 0) return "rechazado";
  if (payment.status === "approved") return "pagado";
  if (
    payment.status === "pending" ||
    payment.status === "in_process" ||
    payment.status === "authorized"
  ) {
    return "pendiente";
  }
  return "rechazado";
}
