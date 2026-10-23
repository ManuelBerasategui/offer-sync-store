/**
 * Webhook de Mercado Pago (POST /api/mp-webhook).
 *
 * Sin el webhook, un pedido pagado solo se confirmaba si el comprador volvía a la página de
 * "gracias". Si cerraba la pestaña antes, el pedido quedaba "pendiente" aunque MP lo cobró.
 *
 * El aviso de MP NO se toma como prueba de nada: solo se usa el número de pago para consultarlo
 * en la API de MP con el token del comercio (fetchMpPayment). Cualquiera puede mandar un aviso
 * falso a esta URL, pero no puede inventar un pago aprobado en la cuenta de MP.
 *
 * Siempre responde 200 (salvo método o tamaño inválidos) para que MP no reintente sin fin.
 */
import { isMpOrder } from "./mp-confirm.server";
import { clientIpFrom, createRateLimiter } from "./rate-limit";

const webhookLimited = createRateLimiter({ windowMs: 60 * 1000, max: 60 });

const MAX_BODY = 16_000;

/** Número de pago del aviso (cuerpo JSON o query), solo si es un aviso de pago y numérico. */
export function paymentIdFromNotification(url: URL, bodyText: string): string | null {
  let body: { type?: unknown; topic?: unknown; action?: unknown; data?: { id?: unknown } } = {};
  if (bodyText) {
    try {
      const parsed: unknown = JSON.parse(bodyText);
      if (parsed && typeof parsed === "object") body = parsed as typeof body;
    } catch {
      // cuerpo inválido: se usa solo la query
    }
  }
  const type = String(
    body.type ?? body.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "",
  );
  if (type !== "payment") return null;
  const raw = body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "";
  const id = String(raw).trim();
  return /^\d{1,20}$/.test(id) ? id : null;
}

export type WebhookDeps = {
  fetchPayment: (id: string) => Promise<{ external_reference?: string | null } | null>;
  findOrder: (
    orderCode: string,
  ) => Promise<{ estado: string | null; metodo_pago: string | null } | null>;
  confirm: (order: never, payment: never) => Promise<unknown>;
};

const ok = () => new Response("ok", { status: 200, headers: { "content-type": "text/plain" } });

export async function handleMpWebhook(request: Request, deps?: WebhookDeps): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: { allow: "POST" } });
  }
  if (webhookLimited(clientIpFrom(request.headers)))
    return new Response("Too Many Requests", { status: 429 });

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY) return new Response("Payload Too Large", { status: 413 });
  const bodyText = (await request.text()).slice(0, MAX_BODY);

  const paymentId = paymentIdFromNotification(new URL(request.url), bodyText);
  if (!paymentId) return ok();

  try {
    const d = deps ?? (await defaultDeps());
    if (!d) return ok();
    const payment = await d.fetchPayment(paymentId);
    const ref = payment?.external_reference;
    if (!payment || typeof ref !== "string" || !/^[A-Z0-9-]{1,60}$/.test(ref)) return ok();
    const order = await d.findOrder(ref);
    if (!order || order.estado !== "pendiente") return ok();
    if (!isMpOrder(order)) return ok();
    await d.confirm(order as never, payment as never);
  } catch (err) {
    console.error("[mp-webhook] error:", err instanceof Error ? err.message : err);
  }
  return ok();
}

async function defaultDeps(): Promise<WebhookDeps | null> {
  if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { ORDER_FIELDS, confirmMpOrder, fetchMpPayment } = await import("./mp-confirm.server");
  return {
    fetchPayment: fetchMpPayment,
    findOrder: async (orderCode) => {
      const { data } = await supabaseAdmin
        .from("orders")
        .select(ORDER_FIELDS)
        .eq("order_code", orderCode)
        .maybeSingle();
      return data ?? null;
    },
    confirm: (order, payment) => confirmMpOrder(supabaseAdmin, order, payment),
  };
}
