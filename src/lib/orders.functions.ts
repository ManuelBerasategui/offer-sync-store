import { createServerFn } from "@tanstack/react-start";
import type { NotifyOrderInput } from "@/lib/email.functions";
import { decideMpPayment, type MpPayment } from "./mp-verify";
import { checkAdmin } from "./admin-auth";
import { hasUsedCoupon, verifiedUserFromToken } from "./coupon-usage";
import { priceOrderItems } from "./order-pricing";
import { createRateLimiter, currentClientIp, RATE_LIMIT_MSG } from "./rate-limit";

// Pedidos por transferencia por IP (generoso: varias personas pueden compartir IP en el celular)
const transferOrderLimited = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 30 });

export type OrderItem = {
  nombre: string;
  qty: number;
  unitPrice: number;
  productId?: string | undefined;
  variantId?: string | undefined;
};

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
    // Solo informativo: el precio que se cobra lo calcula el servidor (priceOrderItems)
    unitPrice: Math.max(1, Math.round(Number(i.unitPrice) || 0)),
    ...(i.productId ? { productId: text(i.productId, 100) } : {}),
    ...(i.variantId ? { variantId: text(i.variantId, 100) } : {}),
  }));
}




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
      metodoPago?: string;
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
        .select("id, order_code, estado, total, metodo_pago, nombre, email, telefono, dni, provincia, ciudad, codigo_postal, transporte, sucursal_correo, items")
        .eq("order_code", data.code)
        .maybeSingle();

      // Si ya está pagada (p.ej. el usuario refresca la página), la devolvemos directamente
      if (order?.estado === "pagado") {
        return {
          orderCode: order.order_code,
          estado: "pagado",
          total: Number(order.total),
          metodoPago: order.metodo_pago ?? undefined,
        };
      }

      // 2. Consultar el estado real del pago en la API de Mercado Pago
      const mpToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
      if (!mpToken) {
        console.error("MERCADOPAGO_ACCESS_TOKEN no configurado.");
        return { estado: "desconocido" };
      }

      // Solo los pedidos de Mercado Pago se confirman acá (los de transferencia los confirma el admin)
      const pendingResult = {
        ...(order?.order_code ? { orderCode: order.order_code } : {}),
        estado: "pendiente" as const,
        ...(order?.total ? { total: Number(order.total) } : {}),
        ...(order?.metodo_pago ? { metodoPago: order.metodo_pago } : {}),
      };
      if (!order || (order.metodo_pago && order.metodo_pago !== "mercadopago" && order.metodo_pago !== "tarjeta")) {
        return order ? pendingResult : { estado: "desconocido" };
      }

      // El estado del pago SOLO se toma de la API de Mercado Pago. Nunca del status de la URL:
      // cualquiera puede escribir ?status=approved a mano. Sin confirmación de MP, queda pendiente.
      if (!data.paymentId || !/^\d+$/.test(data.paymentId)) {
        return pendingResult;
      }

      let payment: MpPayment | null = null;
      try {
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.paymentId}`, {
          headers: { authorization: `Bearer ${mpToken}` },
          signal: AbortSignal.timeout(10_000),
        });
        if (mpRes.ok) {
          payment = (await mpRes.json()) as MpPayment;
        } else {
          console.error(`MP payment lookup failed [${mpRes.status}]: ${await mpRes.text()}`);
        }
      } catch (err) {
        console.error("Error consultando MP:", err);
      }

      const decision = decideMpPayment(order, payment);
      if (decision === "pendiente") {
        if (payment && payment.external_reference !== order.order_code) {
          console.error(`MP payment ${data.paymentId} no corresponde al pedido ${order.order_code}`);
        }
        return pendingResult;
      }
      if (decision === "rechazado") {
        return { estado: "rechazado", ...(order.metodo_pago ? { metodoPago: order.metodo_pago } : {}) };
      }

      // 3. El pago está aprobado: actualizar la orden pendiente a "pagado"
      if (order) {
        const finalMetodo = order.metodo_pago === "tarjeta" ? "tarjeta" : "mercadopago";
        const { error: updErr } = await supabaseAdmin
          .from("orders")
          .update({ estado: "pagado", metodo_pago: finalMetodo })
          .eq("id", order.id);

        if (updErr) {
          console.error("Error al actualizar orden a pagado:", updErr);
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

        // Notificar a los admins (fire-and-forget)
        try {
          let mpCouponCode: string | undefined;
          let mpCouponDiscount: number | undefined;
          try {
            const { data: usage } = await supabaseAdmin
              .from("coupon_usages")
              .select("coupon_code, discount_amount")
              .eq("order_code", order.order_code)
              .maybeSingle();
            if (usage) {
              mpCouponCode = usage.coupon_code;
              mpCouponDiscount = Number(usage.discount_amount) || undefined;
            }
          } catch {
            // ignore
          }

          const { notifyNewOrder } = await import("@/lib/email.functions");
          const mpItems: NotifyOrderInput["items"] = Array.isArray(order.items)
            ? (order.items as { nombre: string; qty: number; unitPrice: number }[]).map((i) => ({
                nombre: i.nombre ?? "",
                qty: Number(i.qty) || 1,
                unitPrice: Number(i.unitPrice) || 0,
              }))
            : [];
          await notifyNewOrder({
            orderCode: order.order_code,
            total: Number(order.total),
            metodoPago: finalMetodo === "tarjeta" ? "tarjeta" : "mercadopago",
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
            items: mpItems,
            couponCode: mpCouponCode,
            couponDiscountAmount: mpCouponDiscount,
          } satisfies NotifyOrderInput);
        } catch (e) {
          console.error("[email] Error enviando notificación de MP:", e);
        }

        return {
          orderCode: order.order_code,
          estado: "pagado",
          total: Number(order.total),
          metodoPago: finalMetodo,
        };
      }

      // La orden no existía (ej: un pedido creado por una versión anterior)
      // Igual marcamos como pagado con datos mínimos
      console.warn(`Borrador no encontrado para code=${data.code}, registrando pago mínimo.`);
      return { orderCode: data.code, estado: "pagado" };
    },
  );

export type AdminOrder = {
  id: string;
  order_code: string;
  created_at: string;
  estado: string;
  metodo_pago: string | null;
  total: number;
  nombre: string;
  dni: string;
  telefono: string;
  email: string;
  provincia: string;
  ciudad: string;
  codigo_postal: string;
  transporte: string;
  sucursal_correo: string;
  items: OrderItem[];
};

export const getAdminPaidOrders = createServerFn({ method: "POST" })
  .validator((data: { email?: string; token?: string }) => ({
    email: text(data?.email, 160).toLowerCase(),
    token: text(data?.token, 2000),
  }))
  .handler(async ({ data }): Promise<{ orders: AdminOrder[]; error?: string }> => {
    if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      return { orders: [], error: "Variables de Supabase no configuradas en el servidor." };
    }

    // Identidad solo desde el token verificado (ver src/lib/admin-auth.ts)
    const auth = await checkAdmin(data.token);
    if (!auth.ok) {
      return { orders: [], error: auth.error };
    }
    const supabaseAdmin = auth.supabaseAdmin;

    const { data: rows, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("estado", "pagado")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al consultar órdenes:", error);
      return { orders: [], error: "No se pudieron obtener las órdenes de la base de datos." };
    }


    const orders: AdminOrder[] = (rows ?? []).map((row) => ({
      id: String(row.id),
      order_code: String(row.order_code ?? ""),
      created_at: String(row.created_at ?? ""),
      estado: String(row.estado ?? "pagado"),
      metodo_pago: row.metodo_pago ? String(row.metodo_pago) : null,
      total: Number(row.total) || 0,
      nombre: String(row.nombre ?? ""),
      dni: String(row.dni ?? ""),
      telefono: String(row.telefono ?? ""),
      email: String(row.email ?? ""),
      provincia: String(row.provincia ?? ""),
      ciudad: String(row.ciudad ?? ""),
      codigo_postal: String(row.codigo_postal ?? ""),
      transporte: String(row.transporte ?? "Correo Argentino"),
      sucursal_correo: String(row.sucursal_correo ?? ""),
      items: Array.isArray(row.items) ? (row.items as OrderItem[]) : [],
    }));

    return { orders };
  });

/**
 * Retorna las órdenes reservadas: pendientes de pago por transferencia bancaria.
 * Solo incluye estado="pendiente" con metodo_pago="transferencia".
 */
export const getAdminReservedOrders = createServerFn({ method: "POST" })
  .validator((data: { email?: string; token?: string }) => ({
    email: text(data?.email, 160).toLowerCase(),
    token: text(data?.token, 2000),
  }))
  .handler(async ({ data }): Promise<{ orders: AdminOrder[]; error?: string }> => {
    if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      return { orders: [], error: "Variables de Supabase no configuradas en el servidor." };
    }

    // Identidad solo desde el token verificado (ver src/lib/admin-auth.ts)
    const auth = await checkAdmin(data.token);
    if (!auth.ok) {
      return { orders: [], error: auth.error };
    }
    const supabaseAdmin = auth.supabaseAdmin;

    const { data: rows, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("estado", "pendiente")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al consultar órdenes reservadas:", error);
      return { orders: [], error: "No se pudieron obtener las órdenes reservadas." };
    }


    const orders: AdminOrder[] = (rows ?? []).map((row) => ({
      id: String(row.id),
      order_code: String(row.order_code ?? ""),
      created_at: String(row.created_at ?? ""),
      estado: String(row.estado ?? "pendiente"),
      metodo_pago: row.metodo_pago ? String(row.metodo_pago) : null,
      total: Number(row.total) || 0,
      nombre: String(row.nombre ?? ""),
      dni: String(row.dni ?? ""),
      telefono: String(row.telefono ?? ""),
      email: String(row.email ?? ""),
      provincia: String(row.provincia ?? ""),
      ciudad: String(row.ciudad ?? ""),
      codigo_postal: String(row.codigo_postal ?? ""),
      transporte: String(row.transporte ?? "Correo Argentino"),
      sucursal_correo: String(row.sucursal_correo ?? ""),
      items: Array.isArray(row.items) ? (row.items as OrderItem[]) : [],
    }));

    return { orders };
  });

/**
 * Actualiza el estado de una orden (ej: de 'pendiente' a 'pagado') desde el panel de administración.
 */
export const updateOrderStatus = createServerFn({ method: "POST" })
  .validator(
    (data: {
      orderCode: string;
      estado: string;
      token?: string | undefined;
      email?: string | undefined;
    }) => ({
      orderCode: text(data.orderCode, 40),
      estado: text(data.estado, 40),
      token: data.token ? text(data.token, 4000) : undefined,
      email: data.email ? text(data.email, 254) : undefined,
    }),
  )
  .handler(async ({ data }) => {
    // Identidad solo desde el token verificado (ver src/lib/admin-auth.ts)
    const auth = await checkAdmin(data.token);
    if (!auth.ok) {
      return { status: "error", message: auth.error };
    }
    const supabaseAdmin = auth.supabaseAdmin;

    const { error } = await supabaseAdmin
      .from("orders")
      .update({ estado: data.estado })
      .eq("order_code", data.orderCode);

    if (error) {
      console.error("Error al actualizar estado de orden:", error);
      return { status: "error", message: "No se pudo actualizar el estado de la orden." };
    }

    return { status: "success" };
  });

/**
 * Elimina una orden de la base de datos (por ejemplo, pedidos por transferencia no completados o cancelados).
 */
export const deleteAdminOrder = createServerFn({ method: "POST" })
  .validator(
    (data: {
      orderId?: string | undefined;
      orderCode: string;
      token?: string | undefined;
      email?: string | undefined;
    }) => ({
      orderId: data.orderId ? text(data.orderId, 60) : undefined,
      orderCode: text(data.orderCode, 60),
      token: data.token ? text(data.token, 4000) : undefined,
      email: data.email ? text(data.email, 254) : undefined,
    }),
  )
  .handler(async ({ data }) => {
    // Identidad solo desde el token verificado (ver src/lib/admin-auth.ts)
    const auth = await checkAdmin(data.token);
    if (!auth.ok) {
      return { status: "error", message: auth.error };
    }
    const supabaseAdmin = auth.supabaseAdmin;

    const query = supabaseAdmin.from("orders").delete();
    const { error } = data.orderId
      ? await query.eq("id", data.orderId)
      : await query.eq("order_code", data.orderCode);

    if (error) {
      console.error("Error al eliminar orden de la DB:", error);
      return { status: "error", message: "No se pudo eliminar la orden de la base de datos." };
    }

    return { status: "success" };
  });

/**
 * Registra una orden de pago por Transferencia Bancaria con el descuento aplicado.
 */
export const createTransferOrder = createServerFn({ method: "POST" })
  .validator(
    (data: {
      shipping: ShippingInput;
      items: OrderItem[];
      userId?: string | undefined;
      couponCode?: string | undefined;
      token?: string | undefined;
    }) => ({
      shipping: cleanShipping(data.shipping),
      items: cleanItems(data.items),
      userId: data.userId ? text(data.userId, 64) : undefined,
      couponCode: data.couponCode ? text(data.couponCode, 40).toUpperCase().trim() : undefined,
      token: data.token ? text(data.token, 4000) : undefined,
    }),
  )
  .handler(async ({ data }) => {
    if (transferOrderLimited(await currentClientIp())) {
      return { status: "error", message: RATE_LIMIT_MSG };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // La cuenta sale SOLO del token verificado: el userId que manda el navegador no se usa, porque
    // con él se podría aplicar el cupón a nombre de otro o sobrescribir el perfil de otra persona.
    const verified = await verifiedUserFromToken(supabaseAdmin, data.token);
    data.userId = verified?.id;

    // Garantizar que data.shipping tenga el email de la cuenta si el usuario está logueado
    if (verified?.email && (!data.shipping.email || !data.shipping.email.includes("@"))) {
      data.shipping.email = verified.email;
    }

    // 1. Revalidar precios y mínimos de categoría
    let total = 0;
    let items: OrderItem[] = [];
    let couponDiscountAmount = 0;
    let validCouponApplied: string | null = null;

    try {
      // Precios calculados en el servidor (nunca los del navegador): ver src/lib/order-pricing.ts
      const pricing = await priceOrderItems(supabaseAdmin, data.items);
      if (pricing.error) {
        return { status: "error", message: pricing.error };
      }
      const configMap = pricing.config;
      items = pricing.validatedItems;
      const listTotal = items.reduce((a, i) => a + i.qty * i.unitPrice, 0);
      const { transferPrice, transferDiscountPct } = await import("./store");
      total = transferPrice(listTotal, transferDiscountPct(configMap));

      // Revalidación segura del cupón en el servidor
      if (data.couponCode && data.userId) {
        const isCouponActive = (configMap["promo_cupon_activo"] ?? "SI").toUpperCase() === "SI";
        const promoCode = (configMap["promo_cupon_codigo"] ?? "TEIMPORTAMOS").toUpperCase().trim();

        if (isCouponActive && data.couponCode === promoCode && verified) {
          const shippingEmail = (data.shipping.email ?? "").trim().toLowerCase();
          // Usos viejos registrados en site_config (antes de coupon_usages)
          const alreadyUsedInConfig = Boolean(
            configMap[`coupon_usage_${promoCode}_${verified.id}`] ||
              (verified.email && configMap[`coupon_usage_${promoCode}_${verified.email}`]) ||
              (shippingEmail && configMap[`coupon_usage_${promoCode}_${shippingEmail}`]),
          );
          // Ante cualquier error de verificación, hasUsedCoupon devuelve true: no se aplica el descuento
          const used =
            alreadyUsedInConfig ||
            (await hasUsedCoupon(supabaseAdmin, promoCode, verified.id, verified.email)) ||
            (shippingEmail && shippingEmail !== verified.email
              ? await hasUsedCoupon(supabaseAdmin, promoCode, null, shippingEmail)
              : false);

          if (!used) {
            const couponPct = Number(configMap["promo_cupon_descuento_pct"]) || 5;
            couponDiscountAmount = Math.round(total * (couponPct / 100));
            total = Math.max(1, total - couponDiscountAmount);
            validCouponApplied = promoCode;
          }
        }
      }
    } catch (err) {
      console.error("Error revalidando items en transferencia:", err);
      return {
        status: "error",
        message: "No pudimos validar los precios de tu pedido. Por favor recargá la página e intentalo nuevamente.",
      };
    }

    if (items.length === 0 || total <= 0) {
      return {
        status: "error",
        message: "No se pudieron calcular los totales del pedido. Por favor recargá la página.",
      };
    }

    const orderCode = makeCode();

    try {
      const { error } = await supabaseAdmin.from("orders").insert({
        order_code: orderCode,
        user_id: data.userId ?? null,
        ...data.shipping,
        items,
        total,
        estado: "pendiente",
        metodo_pago: "transferencia",
      });

      if (error) {
        console.error("Error al registrar la orden por transferencia:", error);
        return {
          status: "error",
          message: "No pudimos registrar tu pedido. Probá de nuevo en unos minutos.",
        };
      }

      // Registrar uso del cupón si se aplicó
      if (validCouponApplied) {
        try {
          await supabaseAdmin.from("coupon_usages").insert({
            user_id: data.userId ?? null,
            user_email: (data.shipping.email ?? "").trim().toLowerCase(),
            coupon_code: validCouponApplied,
            order_code: orderCode,
            discount_amount: couponDiscountAmount,
          });
        } catch (couponErr) {
          console.error("Error registrando uso de cupón en coupon_usages:", couponErr);
        }

        // Los usos se registran solo en coupon_usages (privada). Antes también se escribían en
        // site_config, que es pública: eso exponía los emails de los clientes.
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

      // Notificar a los admins (fire-and-forget)
      try {
        const { notifyNewOrder } = await import("@/lib/email.functions");
        await notifyNewOrder({
          orderCode,
          total,
          metodoPago: "transferencia",
          shipping: data.shipping,
          items,
          couponCode: validCouponApplied || undefined,
          couponDiscountAmount: couponDiscountAmount || undefined,
        } satisfies NotifyOrderInput);
      } catch (e) {
        console.error("[email] Error enviando notificación de transferencia:", e);
      }

      return {
        status: "success",
        orderCode,
        total,
      };
    } catch (err) {
      console.error("Error al registrar orden por transferencia:", err);
      return {
        status: "error",
        message: "No pudimos registrar tu pedido. Probá de nuevo.",
      };
    }
  });

