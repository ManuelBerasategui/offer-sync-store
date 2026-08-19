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
  .handler(async ({ data }): Promise<{ url?: string | undefined; error?: string | undefined }> => {
    const token = process.env["MERCADOPAGO_ACCESS_TOKEN"];
    if (!token) {
      return {
        error: "Falta configurar MercadoPago. Escribinos por WhatsApp para completar tu compra.",
      };
    }

    // Generamos el código de pedido acá para usarlo en la URL de retorno y en el external_reference
    const d = new Date();
    const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const orderCode = `TI-${stamp}-${rand}`;

    const successUrl = `${data.origin}/gracias?code=${encodeURIComponent(orderCode)}`;

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
        // Guardamos todo lo necesario en metadata para crear la orden cuando MP confirme el pago
        metadata: {
          order_code: orderCode,
          user_id: data.userId ?? null,
          items_json: JSON.stringify(data.items),
          shipping_nombre: data.shipping.nombre,
          shipping_dni: data.shipping.dni,
          shipping_telefono: data.shipping.telefono,
          shipping_email: data.shipping.email,
          shipping_provincia: data.shipping.provincia,
          shipping_ciudad: data.shipping.ciudad,
          shipping_codigo_postal: data.shipping.codigo_postal,
          shipping_transporte: data.shipping.transporte,
          shipping_sucursal_correo: data.shipping.sucursal_correo,
        },
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
    return { url: json.init_point ?? json.sandbox_init_point ?? undefined };
  });
