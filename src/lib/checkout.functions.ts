import { createServerFn } from "@tanstack/react-start";

type CheckoutItem = { nombre: string; qty: number; unitPrice: number };

type ShippingInput = {
  nombre: string;
  dni: string;
  telefono: string;
  email: string;
  provincia: string;
  ciudad: string;
  codigo_postal: string;
  transporte: string;
  sucursal_correo: string;
};

/**
 * Crea la preferencia de pago en Mercado Pago Y guarda la orden en Supabase
 * con estado "pendiente". Cuando MP confirma el pago,
 * verifyOrderPayment la actualiza a "pagado".
 */
export const createCheckout = createServerFn({ method: "POST" })
  .validator(
    (data: {
      items: CheckoutItem[];
      origin: string;
      shipping: ShippingInput;
      userId?: string | undefined;
    }) => {
      if (!data || !Array.isArray(data.items) || data.items.length === 0) {
        throw new Error("Carrito vacío");
      }
      const s = data.shipping ?? ({} as ShippingInput);
      return {
        origin: String(data.origin ?? "").slice(0, 200),
        userId: data.userId ? String(data.userId).slice(0, 60) : undefined,
        shipping: {
          nombre: String(s.nombre ?? "").slice(0, 120),
          dni: String(s.dni ?? "").slice(0, 20),
          telefono: String(s.telefono ?? "").slice(0, 30),
          email: String(s.email ?? "").slice(0, 160),
          provincia: String(s.provincia ?? "").slice(0, 60),
          ciudad: String(s.ciudad ?? "").slice(0, 80),
          codigo_postal: String(s.codigo_postal ?? "").slice(0, 12),
          transporte: String(s.transporte ?? "Correo Argentino").slice(0, 40),
          sucursal_correo: String(s.sucursal_correo ?? "").slice(0, 160),
        },
        items: data.items.slice(0, 50).map((i) => ({
          nombre: String(i.nombre ?? "Producto").slice(0, 120),
          qty: Math.max(1, Math.min(9999, Math.round(Number(i.qty) || 1))),
          unitPrice: Math.max(1, Math.round(Number(i.unitPrice) || 0)),
        })),
      };
    },
  )
  .handler(async ({ data }): Promise<{ url?: string; error?: string }> => {
    const mpToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
    if (!mpToken) {
      return {
        error: "Falta configurar MercadoPago. Escribinos por WhatsApp para completar tu compra.",
      };
    }

    // Generamos el código de orden
    const d = new Date();
    const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const orderCode = `TI-${stamp}-${rand}`;

    const total = data.items.reduce((a, i) => a + i.qty * i.unitPrice, 0);

    // La orden debe existir antes de abrir Mercado Pago. No continuamos si no se
    // pudo registrar: de ese modo no quedan cobros sin pedido asociado.
    if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      console.error("Supabase no está configurado para crear la orden pendiente.");
      return { error: "No pudimos registrar tu pedido. Probá de nuevo en unos minutos." };
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("orders").insert({
        order_code: orderCode,
        user_id: data.userId ?? null,
        ...data.shipping,
        items: data.items,
        total,
        estado: "pendiente",
        metodo_pago: "mercadopago",
      });

      if (error) {
        console.error("Error al guardar orden pendiente:", error);
        return { error: "No pudimos registrar tu pedido. Probá de nuevo en unos minutos." };
      }
    } catch (err) {
      console.error("Error al guardar orden pendiente:", err);
      return { error: "No pudimos registrar tu pedido. Probá de nuevo en unos minutos." };
    }

    const successUrl = `${data.origin}/gracias?code=${encodeURIComponent(orderCode)}`;

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        authorization: `Bearer ${mpToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        items: data.items.map((i) => ({
          title: i.nombre,
          quantity: i.qty,
          unit_price: i.unitPrice,
          currency_id: "ARS",
        })),
        external_reference: orderCode,
        back_urls: {
          success: successUrl,
          pending: successUrl,
          failure: `${data.origin}/carrito`,
        },
        auto_return: "approved",
        payer: {
          name: data.shipping.nombre,
          email: data.shipping.email,
        },
      }),
    });

    const body = await res.text();
    if (!res.ok) {
      console.error(`MercadoPago error [${res.status}]: ${body}`);
      return { error: "No pudimos iniciar el pago. Probá de nuevo o escribinos por WhatsApp." };
    }

    const json = JSON.parse(body) as { init_point?: string; sandbox_init_point?: string };
    const url = json.init_point ?? json.sandbox_init_point;
    return url ? { url } : { error: "No pudimos obtener el enlace de pago. Probá de nuevo." };
  });
