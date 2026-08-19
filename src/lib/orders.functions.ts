import { createServerFn } from "@tanstack/react-start";

export type OrderItem = { nombre: string; qty: number; unitPrice: number };

export type ShippingInput = {
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

const text = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);

export function makeCode() {
  const d = new Date();
  const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TI-${stamp}-${rand}`;
}

function cleanShipping(s: ShippingInput): ShippingInput {
  return {
    nombre: text(s?.nombre),
    dni: text(s?.dni, 20),
    telefono: text(s?.telefono, 30),
    email: text(s?.email, 160),
    provincia: text(s?.provincia, 60),
    ciudad: text(s?.ciudad, 80),
    codigo_postal: text(s?.codigo_postal, 12),
    transporte: text(s?.transporte, 40) || "Correo Argentino",
    sucursal_correo: text(s?.sucursal_correo, 160),
  };
}

function cleanItems(items: OrderItem[]): OrderItem[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  return items.slice(0, 50).map((i) => ({
    nombre: text(i.nombre),
    qty: Math.max(1, Math.min(9999, Math.round(Number(i.qty) || 1))),
    unitPrice: Math.max(1, Math.round(Number(i.unitPrice) || 0)),
  }));
}

/**
 * Cobro con tarjeta. La orden en Supabase se crea ÚNICAMENTE si MP devuelve "approved".
 * Los datos de envío e items vienen del cliente en el mismo request.
 */
export const payOrderWithCard = createServerFn({ method: "POST" })
  .validator(
    (data: {
      token: string;
      paymentMethodId: string;
      installments: number;
      issuerId?: string | undefined;
      email: string;
      docType?: string | undefined;
      docNumber?: string | undefined;
      shipping: ShippingInput;
      items: OrderItem[];
      userId?: string | undefined;
    }) => ({
      token: text(data.token, 200),
      paymentMethodId: text(data.paymentMethodId, 40),
      installments: Math.max(1, Math.min(24, Math.round(Number(data.installments) || 1))),
      issuerId: data.issuerId ? text(data.issuerId, 40) : undefined,
      email: text(data.email, 160) || "comprador@teimportamos.com",
      docType: data.docType ? text(data.docType, 10) : undefined,
      docNumber: data.docNumber ? text(data.docNumber, 20) : undefined,
      shipping: cleanShipping(data.shipping),
      items: cleanItems(data.items),
      userId: data.userId ? text(data.userId, 60) : undefined,
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<{ status: "approved" | "rejected" | "error"; orderCode?: string; message?: string }> => {
      const token = process.env["MERCADOPAGO_ACCESS_TOKEN"];
      if (!token) return { status: "error", message: "Falta configurar MercadoPago." };

      if (!data.items.length) {
        return { status: "error", message: "El carrito está vacío." };
      }

      const total = data.items.reduce((a, i) => a + i.qty * i.unitPrice, 0);
      const orderCode = makeCode();

      const res = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "x-idempotency-key": `${orderCode}-card`,
        },
        body: JSON.stringify({
          transaction_amount: total,
          token: data.token,
          description: `Pedido ${orderCode} — Te importamos`,
          installments: data.installments,
          payment_method_id: data.paymentMethodId,
          ...(data.issuerId ? { issuer_id: data.issuerId } : {}),
          external_reference: orderCode,
          payer: {
            email: data.email,
            ...(data.docType && data.docNumber
              ? { identification: { type: data.docType, number: data.docNumber } }
              : {}),
          },
        }),
      });

      const body = await res.text();
      if (!res.ok) {
        console.error(`MercadoPago card error [${res.status}]: ${body}`);
        return { status: "error", message: "No pudimos procesar la tarjeta. Probá con Mercado Pago." };
      }

      const json = JSON.parse(body) as { status?: string };

      // Solo registramos la orden si el pago fue APROBADO
      if (json.status !== "approved") {
        return { status: "rejected", message: "La tarjeta fue rechazada. Probá con otra o con Mercado Pago." };
      }

      if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
        return { status: "approved", orderCode };
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { error: insertError } = await supabaseAdmin.from("orders").insert({
        order_code: orderCode,
        user_id: data.userId ?? null,
        ...data.shipping,
        items: data.items,
        total,
        estado: "pagado",
        metodo_pago: "tarjeta",
      });

      if (insertError) {
        console.error("Error al registrar la orden pagada con tarjeta:", insertError);
      }

      if (data.userId) {
        await supabaseAdmin.from("profiles").upsert(
          {
            id: data.userId,
            nombre: data.shipping.nombre,
            dni: data.shipping.dni,
            telefono: data.shipping.telefono,
            provincia: data.shipping.provincia,
            ciudad: data.shipping.ciudad,
            codigo_postal: data.shipping.codigo_postal,
            transporte: data.shipping.transporte,
            sucursal_correo: data.shipping.sucursal_correo,
          },
          { onConflict: "id" },
        );
      }

      return { status: "approved", orderCode };
    },
  );

/**
 * Verificación al volver de Mercado Pago.
 * Consulta la API de MP con el payment_id para confirmar el estado real.
 * Solo crea la orden en Supabase si el pago está efectivamente APROBADO.
 */
export const verifyOrderPayment = createServerFn({ method: "POST" })
  .validator(
    (data: {
      code?: string | undefined;
      status?: string | undefined;
      collectionStatus?: string | undefined;
      paymentId?: string | undefined;
    }) => ({
      code: data.code ? text(data.code, 60) : undefined,
      status: text(data.status || data.collectionStatus, 40),
      paymentId: data.paymentId ? text(data.paymentId, 60) : undefined,
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<{
      orderCode?: string;
      estado: "pagado" | "rechazado" | "desconocido";
      total?: number;
    }> => {
      if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
        console.error("Supabase no configurado.");
        return { estado: "desconocido" };
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Si ya existe la orden pagada en la BD (pago con tarjeta previo), la devolvemos
      if (data.code) {
        const { data: existing } = await supabaseAdmin
          .from("orders")
          .select("order_code, estado, total")
          .eq("order_code", data.code)
          .maybeSingle();

        if (existing && existing.estado === "pagado") {
          return {
            orderCode: existing.order_code,
            estado: "pagado",
            total: Number(existing.total),
          };
        }
      }

      // Consultamos la API de MP con el payment_id para saber el estado real
      const mpToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
      if (!data.paymentId || !mpToken) {
        return { estado: "desconocido" };
      }

      let mpJson: {
        status?: string;
        external_reference?: string;
        transaction_amount?: number;
        metadata?: Record<string, unknown>;
        payer?: {
          first_name?: string;
          last_name?: string;
          email?: string;
          identification?: { number?: string };
          phone?: { number?: string };
        };
        additional_info?: {
          items?: Array<{ title?: string; quantity?: number; unit_price?: number }>;
        };
      };

      try {
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.paymentId}`, {
          headers: { authorization: `Bearer ${mpToken}` },
        });
        if (!mpRes.ok) {
          console.error(`MP payment lookup error [${mpRes.status}]: ${await mpRes.text()}`);
          return { estado: "desconocido" };
        }
        mpJson = await mpRes.json();
      } catch (err) {
        console.error("Error consultando MP:", err);
        return { estado: "desconocido" };
      }

      // Si el pago NO está aprobado, no creamos nada
      if (mpJson.status !== "approved") {
        return { estado: "rechazado" };
      }

      // El pago está aprobado: extraemos datos del metadata y creamos la orden
      const meta = (mpJson.metadata || {}) as Record<string, string>;
      const orderCode = mpJson.external_reference || meta["order_code"] || data.code || makeCode();

      // Verificamos si ya existe (idempotencia: evita duplicados si el usuario recarga la página)
      const { data: alreadyExists } = await supabaseAdmin
        .from("orders")
        .select("order_code, total")
        .eq("order_code", orderCode)
        .maybeSingle();

      if (alreadyExists) {
        return {
          orderCode: alreadyExists.order_code,
          estado: "pagado",
          total: Number(alreadyExists.total),
        };
      }

      // Reconstruimos items desde metadata
      let items: OrderItem[] = [];
      if (meta["items_json"]) {
        try {
          items = JSON.parse(meta["items_json"]) as OrderItem[];
        } catch {
          /* ignoramos */
        }
      }
      if (!items.length && Array.isArray(mpJson.additional_info?.items)) {
        items = mpJson.additional_info.items.map((i) => ({
          nombre: String(i.title || "Producto"),
          qty: Number(i.quantity || 1),
          unitPrice: Number(i.unit_price || 0),
        }));
      }

      // Reconstruimos datos de envío desde metadata
      const shipping: ShippingInput = {
        nombre: meta["shipping_nombre"] || [mpJson.payer?.first_name, mpJson.payer?.last_name].filter(Boolean).join(" ") || "Cliente",
        dni: meta["shipping_dni"] || mpJson.payer?.identification?.number || "",
        telefono: meta["shipping_telefono"] || mpJson.payer?.phone?.number || "",
        email: meta["shipping_email"] || mpJson.payer?.email || "",
        provincia: meta["shipping_provincia"] || "",
        ciudad: meta["shipping_ciudad"] || "",
        codigo_postal: meta["shipping_codigo_postal"] || "",
        transporte: meta["shipping_transporte"] || "Correo Argentino",
        sucursal_correo: meta["shipping_sucursal_correo"] || "",
      };

      const total = Number(mpJson.transaction_amount || items.reduce((a, i) => a + i.qty * i.unitPrice, 0));
      const userId = meta["user_id"] || null;

      // Insertamos la orden SOLO si el pago fue aprobado
      const { error: insErr } = await supabaseAdmin.from("orders").insert({
        order_code: orderCode,
        user_id: userId,
        ...shipping,
        items,
        total,
        estado: "pagado",
        metodo_pago: "mercadopago",
      });

      if (insErr) {
        console.error("Error al insertar la orden confirmada por MP:", insErr);
      }

      // Actualizamos el perfil del usuario logueado
      if (userId) {
        await supabaseAdmin.from("profiles").upsert(
          {
            id: userId,
            nombre: shipping.nombre,
            dni: shipping.dni,
            telefono: shipping.telefono,
            provincia: shipping.provincia,
            ciudad: shipping.ciudad,
            codigo_postal: shipping.codigo_postal,
            transporte: shipping.transporte,
            sucursal_correo: shipping.sucursal_correo,
          },
          { onConflict: "id" },
        );
      }

      return { orderCode, estado: "pagado", total };
    },
  );
