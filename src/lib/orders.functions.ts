import { createServerFn } from "@tanstack/react-start";

type OrderItem = { nombre: string; qty: number; unitPrice: number };

type OrderInput = {
  shipping: {
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
  items: OrderItem[];
  userId?: string | undefined;
};

const text = (v: unknown, max = 120) => String(v ?? "").trim().slice(0, max);

function cleanOrder(data: OrderInput): OrderInput {
  if (!data || !Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("Carrito vacío");
  }
  const s = data.shipping ?? ({} as OrderInput["shipping"]);
  if (!text(s.nombre) || !text(s.dni) || !text(s.telefono)) {
    throw new Error("Faltan datos de contacto");
  }
  return {
    userId: data.userId ? text(data.userId, 60) : undefined,
    shipping: {
      nombre: text(s.nombre),
      dni: text(s.dni, 20),
      telefono: text(s.telefono, 30),
      email: text(s.email, 160),
      provincia: text(s.provincia, 60),
      ciudad: text(s.ciudad, 80),
      codigo_postal: text(s.codigo_postal, 12),
      transporte: text(s.transporte, 40) || "Correo Argentino",
      sucursal_correo: text(s.sucursal_correo, 160),
    },
    items: data.items.slice(0, 50).map((i) => ({
      nombre: text(i.nombre),
      qty: Math.max(1, Math.min(9999, Math.round(Number(i.qty) || 1))),
      unitPrice: Math.max(1, Math.round(Number(i.unitPrice) || 0)),
    })),
  };
}

function makeCode() {
  const d = new Date();
  const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TI-${stamp}-${rand}`;
}

/** Crea el pedido en la base y devuelve el número de pedido. */
export const createOrder = createServerFn({ method: "POST" })
  .validator(cleanOrder)
  .handler(async ({ data }): Promise<{ orderId: string; orderCode: string; total: number }> => {
    if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      console.error("Falta configurar SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el servidor");
      throw new Error(
        "El servidor no tiene configurada la base de datos (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).",
      );
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const total = data.items.reduce((a, i) => a + i.qty * i.unitPrice, 0);
    const orderCode = makeCode();

    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .insert({
        order_code: orderCode,
        user_id: data.userId ?? null,
        ...data.shipping,
        items: data.items,
        total,
      })
      .select("id, order_code")
      .single();

    if (error || !row) {
      console.error("No se pudo crear el pedido", error);
      throw new Error(
        error?.message
          ? `No pudimos registrar el pedido: ${error.message}`
          : "No pudimos registrar el pedido. Probá de nuevo.",
      );
    }

    // Guardamos/actualizamos el perfil del usuario logueado con los datos de envío.
    if (data.userId) {
      const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
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
      if (profileError) console.error("No se pudo guardar el perfil", profileError);
    }

    return { orderId: row.id, orderCode: row.order_code, total };
  });

/** Cobro con tarjeta usando el token generado en el navegador por MercadoPago. */
export const payOrderWithCard = createServerFn({ method: "POST" })
  .validator(
    (data: {
      orderId: string;
      token: string;
      paymentMethodId: string;
      installments: number;
      issuerId?: string | undefined;
      email: string;
      docType?: string | undefined;
      docNumber?: string | undefined;
    }) => ({
      orderId: text(data.orderId, 60),
      token: text(data.token, 200),
      paymentMethodId: text(data.paymentMethodId, 40),
      installments: Math.max(1, Math.min(24, Math.round(Number(data.installments) || 1))),
      issuerId: data.issuerId ? text(data.issuerId, 40) : undefined,
      email: text(data.email, 160) || "comprador@teimportamos.com",
      docType: data.docType ? text(data.docType, 10) : undefined,
      docNumber: data.docNumber ? text(data.docNumber, 20) : undefined,
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<{ status: "approved" | "pending" | "rejected" | "error"; orderCode?: string; message?: string }> => {
      const token = process.env["MERCADOPAGO_ACCESS_TOKEN"];
      if (!token) return { status: "error", message: "Falta configurar MercadoPago." };

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, order_code, total, nombre")
        .eq("id", data.orderId)
        .maybeSingle();

      if (!order) return { status: "error", message: "Pedido no encontrado." };

      const res = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
          "x-idempotency-key": `${order.id}-card`,
        },
        body: JSON.stringify({
          transaction_amount: Number(order.total),
          token: data.token,
          description: `Pedido ${order.order_code} — Te importamos`,
          installments: data.installments,
          payment_method_id: data.paymentMethodId,
          ...(data.issuerId ? { issuer_id: data.issuerId } : {}),
          external_reference: order.order_code,
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

      const json = JSON.parse(body) as { status?: string; status_detail?: string };
      const status = json.status === "approved" ? "approved" : json.status === "in_process" || json.status === "pending" ? "pending" : "rejected";

      await supabaseAdmin
        .from("orders")
        .update({ estado: status === "approved" ? "pagado" : status, metodo_pago: "tarjeta" })
        .eq("id", order.id);

      return status === "rejected"
        ? { status, message: "La tarjeta fue rechazada. Probá con otra o con Mercado Pago." }
        : { status, orderCode: order.order_code };
    },
  );

/** Verifica y sincroniza el estado del pedido cuando el usuario vuelve de Mercado Pago. */
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
        return { estado: "desconocido" };
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("id, order_code, estado, total")
        .eq("order_code", data.code)
        .maybeSingle();

      if (!order) return { estado: "desconocido" };

      const mpStatus = data.status.toLowerCase();
      let newStatus = order.estado;

      if (mpStatus === "approved") {
        newStatus = "pagado";
      } else if (mpStatus === "pending" || mpStatus === "in_process") {
        newStatus = "pendiente";
      } else if (mpStatus === "rejected" || mpStatus === "cancelled") {
        newStatus = "rechazado";
      }

      if (newStatus !== order.estado) {
        await supabaseAdmin
          .from("orders")
          .update({ estado: newStatus, metodo_pago: "mercadopago" })
          .eq("id", order.id);
      }

      return {
        orderCode: order.order_code,
        estado: newStatus as "pagado" | "pendiente" | "rechazado",
        total: Number(order.total),
      };
    },
  );

