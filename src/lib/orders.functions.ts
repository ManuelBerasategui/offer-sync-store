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

const text = (v: unknown, max = 120) =>
  String(v ?? "")
    .trim()
    .slice(0, max);

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

function paymentErrorMessage(body: string): string {
  try {
    const response = JSON.parse(body) as {
      message?: string;
      cause?: Array<{ description?: string }>;
    };
    const detail =
      response.cause?.find((cause) => cause.description)?.description ?? response.message;
    if (detail) return `Mercado Pago informó: ${text(detail, 180)}`;
  } catch {
    // La respuesta no siempre es JSON; el detalle completo queda en el log del servidor.
  }
  return "No pudimos procesar la tarjeta. Probá con Mercado Pago.";
}

/**
 * Cobro con tarjeta usando el token generado por MercadoPago en el browser.
 * La orden se crea primero como pendiente para que cada intento de cobro quede
 * registrado, incluso cuando Mercado Pago lo rechace o lo deje en proceso.
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
    }): Promise<{
      status: "approved" | "pending" | "rejected" | "error";
      orderCode?: string;
      message?: string;
    }> => {
      const token = process.env["MERCADOPAGO_ACCESS_TOKEN"];
      if (!token) return { status: "error", message: "Falta configurar MercadoPago." };
      if (!data.items.length) return { status: "error", message: "El carrito está vacío." };

      const total = data.items.reduce((a, i) => a + i.qty * i.unitPrice, 0);
      const orderCode = makeCode();
      const identification =
        data.docType && data.docNumber
          ? { type: data.docType, number: data.docNumber }
          : { type: "DNI", number: data.shipping.dni };

      if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
        console.error("Supabase no está configurado para crear la orden pendiente.");
        return {
          status: "error",
          message: "No pudimos registrar tu pedido. Probá de nuevo en unos minutos.",
        };
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
          metodo_pago: "tarjeta",
        });
        if (error) {
          console.error("Error al registrar la orden pendiente con tarjeta:", error);
          return {
            status: "error",
            message: "No pudimos registrar tu pedido. Probá de nuevo en unos minutos.",
          };
        }
      } catch (err) {
        console.error("Error al registrar la orden pendiente con tarjeta:", err);
        return {
          status: "error",
          message: "No pudimos registrar tu pedido. Probá de nuevo en unos minutos.",
        };
      }

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
            identification,
          },
        }),
      });

      const body = await res.text();
      if (!res.ok) {
        console.error(`MercadoPago card error [${res.status}]: ${body}`);
        return {
          status: "error",
          message: paymentErrorMessage(body),
        };
      }

      const json = JSON.parse(body) as { status?: string };

      if (json.status === "in_process" || json.status === "pending") {
        return {
          status: "pending",
          orderCode,
          message: "El pago quedó pendiente de confirmación. Te avisaremos cuando se acredite.",
        };
      }

      if (json.status !== "approved") {
        return {
          status: "rejected",
          message: "La tarjeta fue rechazada. Probá con otra o con Mercado Pago.",
        };
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({ estado: "pagado" })
        .eq("order_code", orderCode);
      if (updateError) {
        console.error("Error al actualizar la orden pagada con tarjeta:", updateError);
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
 * Se ejecuta cuando el usuario vuelve de Mercado Pago.
 * Busca la orden pendiente por código, consulta el estado real en la API de MP,
 * y si está aprobado actualiza el estado a "pagado".
 * Nunca necesita reconstruir datos de envío o items desde MP.
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
      estado: "pagado" | "pendiente" | "rechazado" | "desconocido";
      total?: number;
    }> => {
      if (!data.code) return { estado: "desconocido" };

      if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
        console.error("Variables de Supabase no configuradas en el servidor.");
        return { estado: "desconocido" };
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // 1. Buscar la orden en Supabase (puede ser "pendiente" o ya "pagado")
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, order_code, estado, total")
        .eq("order_code", data.code)
        .maybeSingle();

      // Si ya está pagada (p.ej. el usuario refresca la página), la devolvemos directamente
      if (order?.estado === "pagado") {
        return { orderCode: order.order_code, estado: "pagado", total: Number(order.total) };
      }

      // 2. Consultar el estado real del pago en la API de Mercado Pago
      const mpToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
      if (!mpToken) {
        console.error("MERCADOPAGO_ACCESS_TOKEN no configurado.");
        return { estado: "desconocido" };
      }

      // Determinamos el estado final del pago
      let mpStatus: string | undefined;

      // Primero intentamos verificar con la API de MP (más confiable)
      if (data.paymentId) {
        try {
          const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.paymentId}`, {
            headers: { authorization: `Bearer ${mpToken}` },
          });
          if (mpRes.ok) {
            const mpJson = (await mpRes.json()) as { status?: string; external_reference?: string };
            mpStatus = mpJson.status;
            console.log(`MP payment ${data.paymentId} status: ${mpStatus}`);
          } else {
            console.error(`MP payment lookup failed [${mpRes.status}]: ${await mpRes.text()}`);
          }
        } catch (err) {
          console.error("Error consultando MP:", err);
        }
      }

      // Fallback 1: confiar en el status de la URL (MP lo incluye en el redirect)
      if (!mpStatus) {
        mpStatus = data.status?.toLowerCase();
        if (mpStatus) console.log(`Usando status de URL como fallback: ${mpStatus}`);
      }

      if (mpStatus === "pending" || mpStatus === "in_process" || mpStatus === "authorized") {
        console.log(`Pago aún pendiente, estado de Mercado Pago: ${mpStatus}`);
        return {
          orderCode: order?.order_code,
          estado: "pendiente",
          total: order ? Number(order.total) : undefined,
        };
      }

      if (mpStatus !== "approved") {
        console.log(`Pago no aprobado, estado final: ${mpStatus}`);
        return { estado: "rechazado" };
      }

      // 3. El pago está aprobado: actualizar la orden pendiente a "pagado"
      if (order) {
        const { error: updErr } = await supabaseAdmin
          .from("orders")
          .update({ estado: "pagado", metodo_pago: "mercadopago" })
          .eq("id", order.id);

        if (updErr) {
          console.error("Error al actualizar orden a pagado:", updErr);
        } else {
          console.log(`Orden ${order.order_code} actualizada a pagado.`);
        }

        // Actualizar perfil si corresponde
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

        return { orderCode: order.order_code, estado: "pagado", total: Number(order.total) };
      }

      // La orden no existía (ej: un pedido creado por una versión anterior)
      // Igual marcamos como pagado con datos mínimos
      console.warn(`Borrador no encontrado para code=${data.code}, registrando pago mínimo.`);
      return { orderCode: data.code, estado: "pagado" };
    },
  );
