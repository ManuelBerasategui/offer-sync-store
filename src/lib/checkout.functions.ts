import { createServerFn } from "@tanstack/react-start";

type CheckoutItem = { nombre: string; qty: number; unitPrice: number };

export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator((data: { items: CheckoutItem[]; origin: string }) => {
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      throw new Error("Carrito vacío");
    }
    return {
      origin: String(data.origin ?? "").slice(0, 200),
      items: data.items.slice(0, 50).map((i) => ({
        nombre: String(i.nombre ?? "Producto").slice(0, 120),
        qty: Math.max(1, Math.min(9999, Math.round(Number(i.qty) || 1))),
        unitPrice: Math.max(1, Math.round(Number(i.unitPrice) || 0)),
      })),
    };
  })
  .handler(async ({ data }): Promise<{ url?: string | undefined; error?: string | undefined }> => {
    const token = process.env['MERCADOPAGO_ACCESS_TOKEN'];
    if (!token) {
      return { error: "Falta configurar MercadoPago. Escribinos por WhatsApp para completar tu compra." };
    }

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        items: data.items.map((i) => ({
          title: i.nombre,
          quantity: i.qty,
          unit_price: i.unitPrice,
          currency_id: "ARS",
        })),
        back_urls: {
          success: `${data.origin}/gracias`,
          pending: `${data.origin}/gracias`,
          failure: `${data.origin}/carrito`,
        },
        auto_return: "approved",
      }),
    });

    const body = await res.text();
    if (!res.ok) {
      console.error(`MercadoPago error [${res.status}]: ${body}`);
      return { error: "No pudimos iniciar el pago. Probá de nuevo o escribinos por WhatsApp." };
    }

    const json = JSON.parse(body) as { init_point?: string; sandbox_init_point?: string };
    return { url: json.init_point ?? json.sandbox_init_point ?? undefined };
  });
