import { createServerFn } from "@tanstack/react-start";
import type { NotifyOrderInput } from "@/lib/email.functions";

export type OrderItem = { nombre: string; qty: number; unitPrice: number; productId?: string | undefined };

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
    ...(i.productId ? { productId: text(i.productId, 100) } : {}),
  }));
}

function getStatusDetailMessage(statusDetail?: string): string | null {
  if (!statusDetail) return null;
  switch (statusDetail) {
    case "cc_rejected_bad_filled_card_number":
      return "Número de tarjeta incorrecto. Verificá los números tipeados.";
    case "cc_rejected_bad_filled_date":
      return "Fecha de vencimiento incorrecta.";
    case "cc_rejected_bad_filled_security_code":
      return "Código de seguridad (CVV) incorrecto.";
    case "cc_rejected_bad_filled_other":
      return "Revisá los datos de la tarjeta. Si estás usando una tarjeta de prueba, asegurate de no usar credenciales de producción.";
    case "cc_rejected_insufficient_amount":
      return "Tarjeta rechazada por fondos insuficientes.";
    case "cc_rejected_high_risk":
      return "Rechazado por prevención de fraude de Mercado Pago. Si estás probando con tu propia cuenta de MP o tarjeta propia, usá el botón azul de Mercado Pago.";
    case "cc_rejected_call_for_authorize":
      return "Debés llamar al emisor de tu tarjeta para autorizar el pago.";
    case "cc_rejected_max_attempts":
      return "Superaste el límite de intentos permitidos con esta tarjeta.";
    case "cc_rejected_duplicated_payment":
      return "Ya procesaste un pago por el mismo monto recientemente.";
    case "cc_rejected_card_disabled":
      return "Tarjeta deshabilitada. Contactate con tu banco.";
    case "cc_rejected_other":
      return "Tarjeta rechazada por el banco emisor. Probá con otra tarjeta o con el botón de Mercado Pago.";
    default:
      return null;
  }
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

      if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
        console.error("Supabase no está configurado para crear la orden pendiente.");
        return {
          status: "error",
          message: "No pudimos registrar tu pedido. Probá de nuevo en unos minutos.",
        };
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Re-validar precios y mínimos en el servidor
      let items = data.items;
      let total = data.items.reduce((a, i) => a + i.qty * i.unitPrice, 0);

      try {
        const [{ data: dbProducts }, { data: dbConfigRows }] = await Promise.all([
          (supabaseAdmin as any).from("products").select("*"),
          (supabaseAdmin as any).from("site_config").select("*"),
        ]);

        if (dbProducts && dbProducts.length > 0) {
          const {
            findProduct,
            priceOf,
            unitPriceFor,
            parseCategoryRules,
            categoryDiscountForUnits,
            findRuleForCat,
            normCat,
            checkCategoryMins,
          } = await import("./store");

          const configObj: Record<string, string> = {};
          if (Array.isArray(dbConfigRows)) {
            for (const row of (dbConfigRows as any[])) {
              if (row.clave && row.valor !== undefined) configObj[row.clave] = String(row.valor);
            }
          }

          const catRules = parseCategoryRules(configObj);
          const catTotals: Record<string, number> = {};
          const itemsWithCat: { categoria?: string; qty: number; unitPrice: number }[] = [];

          for (const item of data.items) {
            const prod = findProduct(dbProducts as any, item.nombre);
            const cat = prod?.categoria ?? "";
            const catNorm = normCat(cat);
            if (catNorm) {
              const match = findRuleForCat(catNorm, catRules);
              const key = match?.key ?? catNorm;
              catTotals[key] = (catTotals[key] ?? 0) + item.qty;
            }
            const baseP = prod ? priceOf(prod) : item.unitPrice;
            itemsWithCat.push({ categoria: cat, qty: item.qty, unitPrice: baseP });
          }

          const violations = checkCategoryMins(itemsWithCat, catRules);
          if (violations.length > 0) {
            const v = violations[0]!;
            const msg =
              v.type === "amount"
                ? `No se cumple el mínimo de compra para ${v.category} ($${v.min.toLocaleString("es-AR")}).`
                : `No se cumple el mínimo de compra para ${v.category} (${v.min} unidades).`;
            return { status: "error", message: msg };
          }

          const { isSuplemento, SUPLEMENTOS_MIN } = await import("./store");
          const minSuplementos = catRules[normCat("Suplementos")]?.minAmount || SUPLEMENTOS_MIN;
          const supTotal = data.items
            .filter((i) => {
              const prod = findProduct(dbProducts as any, i.nombre);
              return isSuplemento(prod?.categoria, i.nombre);
            })
            .reduce((a, i) => a + i.qty * i.unitPrice, 0);

          if (supTotal > 0 && supTotal < minSuplementos) {
            return {
              status: "error",
              message: `No se cumple el mínimo de compra para Suplementos ($${minSuplementos.toLocaleString("es-AR")}).`,
            };
          }

          items = data.items.map((item) => {
            const prod = findProduct(dbProducts as any, item.nombre);
            if (!prod) return item;

            const catNorm = normCat(prod.categoria ?? "");
            const match = catNorm ? findRuleForCat(catNorm, catRules) : undefined;
            const catRule = match?.rule;
            const ruleKey = match?.key;

            let unitPrice: number;
            if (catRule?.discountTiers?.length && ruleKey) {
              const totalCatUnits = catTotals[ruleKey] ?? 0;
              const percent = categoryDiscountForUnits(catRule.discountTiers, totalCatUnits);
              const base = priceOf(prod);
              unitPrice = Math.round(base * (1 - percent / 100));
            } else {
              unitPrice = Math.round(unitPriceFor(prod, item.qty));
            }

            return {
              nombre: item.nombre,
              qty: item.qty,
              unitPrice: unitPrice > 0 ? unitPrice : item.unitPrice,
            };
          });

          total = items.reduce((a, i) => a + i.qty * i.unitPrice, 0);
        }
      } catch (err) {
        console.error("Error revalidando items en tarjeta:", err);
      }

      const orderCode = makeCode();
      const identification =
        data.docType && data.docNumber
          ? { type: data.docType, number: data.docNumber }
          : { type: "DNI", number: data.shipping.dni };

      try {
        const { error } = await supabaseAdmin.from("orders").insert({
          order_code: orderCode,
          user_id: data.userId ?? null,
          ...data.shipping,
          items,
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

      const json = JSON.parse(body) as { status?: string; status_detail?: string };

      if (json.status === "in_process" || json.status === "pending") {
        return {
          status: "pending",
          orderCode,
          message: "El pago quedó pendiente de confirmación. Te avisaremos cuando se acredite.",
        };
      }

      if (json.status !== "approved") {
        const detailMessage = getStatusDetailMessage(json.status_detail);
        return {
          status: "rejected",
          message:
            detailMessage ||
            `La tarjeta fue rechazada (${json.status_detail ?? "motivo no especificado"}). Probá con otra tarjeta o usá el botón azul de Mercado Pago.`,
        };
      }

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

      // Notificar a los admins (fire-and-forget)
      try {
        const { notifyNewOrder } = await import("@/lib/email.functions");
        const cardTotal = items.reduce((a, i) => a + i.qty * i.unitPrice, 0);
        await notifyNewOrder({
          orderCode,
          total: cardTotal,
          metodoPago: "tarjeta",
          shipping: data.shipping,
          items,
        } satisfies NotifyOrderInput);
      } catch (e) {
        console.error("[email] Error enviando notificación de tarjeta:", e);
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
          ...(order?.order_code ? { orderCode: order.order_code } : {}),
          estado: "pendiente",
          ...(order?.total ? { total: Number(order.total) } : {}),
          metodoPago: order?.metodo_pago ?? undefined,
        };
      }

      if (mpStatus !== "approved") {
        console.log(`Pago no aprobado, estado final: ${mpStatus}`);
        return { estado: "rechazado", metodoPago: order?.metodo_pago ?? undefined };
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

        // Notificar a los admins (fire-and-forget)
        try {
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const adminEmailsRaw = process.env["ADMIN_EMAILS"] || process.env["VITE_ADMIN_EMAILS"] || "";
    const adminEmails = adminEmailsRaw
      .toLowerCase()
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    let requestingEmail = data.email ? data.email.toLowerCase().trim() : "";
    if (data.token) {
      const { data: userData } = await supabaseAdmin.auth.getUser(data.token);
      if (userData?.user?.email) {
        requestingEmail = userData.user.email.toLowerCase().trim();
      }
    }

    if (!requestingEmail) {
      return { orders: [], error: "Acceso denegado: Debés iniciar sesión como administrador." };
    }

    if (adminEmails.length > 0) {
      if (!adminEmails.includes(requestingEmail)) {
        return { orders: [], error: "Acceso denegado: El email no tiene permisos de administrador." };
      }
    } else {
      const defaultAdmins = ["admin@config.com", "admin@teimportamos.com"];
      if (!defaultAdmins.includes(requestingEmail)) {
        return { orders: [], error: "Acceso denegado: Configurá ADMIN_EMAILS en el archivo .env." };
      }
    }

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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const adminEmailsRaw = process.env["ADMIN_EMAILS"] || process.env["VITE_ADMIN_EMAILS"] || "";
    const adminEmails = adminEmailsRaw
      .toLowerCase()
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    let requestingEmail = data.email ? data.email.toLowerCase().trim() : "";
    if (data.token) {
      const { data: userData } = await supabaseAdmin.auth.getUser(data.token);
      if (userData?.user?.email) {
        requestingEmail = userData.user.email.toLowerCase().trim();
      }
    }

    if (!requestingEmail) {
      return { orders: [], error: "Acceso denegado: Debés iniciar sesión como administrador." };
    }

    if (adminEmails.length > 0) {
      if (!adminEmails.includes(requestingEmail)) {
        return { orders: [], error: "Acceso denegado: El email no tiene permisos de administrador." };
      }
    } else {
      const defaultAdmins = ["admin@config.com", "admin@teimportamos.com"];
      if (!defaultAdmins.includes(requestingEmail)) {
        return { orders: [], error: "Acceso denegado: Configurá ADMIN_EMAILS en el archivo .env." };
      }
    }

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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    let requestingEmail = data.email?.toLowerCase().trim();
    if (data.token) {
      const { data: userData } = await supabaseAdmin.auth.getUser(data.token);
      if (userData?.user?.email) {
        requestingEmail = userData.user.email.toLowerCase().trim();
      }
    }

    if (!requestingEmail) {
      return { status: "error", message: "Acceso denegado: Debés iniciar sesión." };
    }

    if (adminEmails.length > 0) {
      if (!adminEmails.includes(requestingEmail)) {
        return { status: "error", message: "Acceso denegado: Sin permisos de admin." };
      }
    }

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
 * Registra una orden de pago por Transferencia Bancaria con el descuento aplicado.
 */
export const createTransferOrder = createServerFn({ method: "POST" })
  .validator(
    (data: {
      shipping: ShippingInput;
      items: OrderItem[];
      userId?: string | undefined;
    }) => ({
      shipping: cleanShipping(data.shipping),
      items: cleanItems(data.items),
      userId: data.userId ? text(data.userId, 64) : undefined,
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Revalidar precios y mínimos de categoría
    let total = data.items.reduce((a, i) => a + i.qty * i.unitPrice, 0);
    let items = data.items;

    try {
      const [{ data: dbProducts }, { data: dbConfig }] = await Promise.all([
        supabaseAdmin.from("products").select("*"),
        supabaseAdmin.from("site_config").select("*"),
      ]);

      if (dbProducts) {
        const {
          normCat,
          parseCategoryRules,
          findRuleForCat,
          findProduct,
          priceOf,
          unitPriceFor,
          categoryDiscountForUnits,
          checkCategoryMins,
          transferPrice,
          transferDiscountPct,
        } = await import("./store");

        const configMap: Record<string, string> = {};
        for (const row of dbConfig ?? []) {
          if (row.clave && row.valor) configMap[row.clave] = row.valor;
        }

        const catRules = parseCategoryRules(configMap);
        const catTotals: Record<string, number> = {};

        for (const item of data.items) {
          const prod = findProduct(dbProducts as any, item.nombre);
          if (prod) {
            const catNorm = normCat(prod.categoria ?? "");
            const match = catNorm ? findRuleForCat(catNorm, catRules) : undefined;
            if (match) {
              catTotals[match.key] = (catTotals[match.key] ?? 0) + item.qty;
            }
          }
        }

        const minViolations = checkCategoryMins(data.items as any, dbProducts as any, catRules);
        if (minViolations.length > 0) {
          const v = minViolations[0]!;
          const msg =
            v.type === "amount"
              ? `No se cumple el mínimo de compra para ${v.category} ($${v.min.toLocaleString("es-AR")}).`
              : `No se cumple el mínimo de compra para ${v.category} (${v.min} unidades).`;
          return { status: "error", message: msg };
        }

        items = data.items.map((item) => {
          const prod = findProduct(dbProducts as any, item.nombre);
          if (!prod) return item;

          const catNorm = normCat(prod.categoria ?? "");
          const match = catNorm ? findRuleForCat(catNorm, catRules) : undefined;
          const catRule = match?.rule;
          const ruleKey = match?.key;

          let unitPrice: number;
          if (catRule?.discountTiers?.length && ruleKey) {
            const totalCatUnits = catTotals[ruleKey] ?? 0;
            const percent = categoryDiscountForUnits(catRule.discountTiers, totalCatUnits);
            const base = priceOf(prod);
            unitPrice = Math.round(base * (1 - percent / 100));
          } else {
            unitPrice = Math.round(unitPriceFor(prod, item.qty));
          }

          return {
            nombre: item.nombre,
            qty: item.qty,
            unitPrice: unitPrice > 0 ? unitPrice : item.unitPrice,
          };
        });

        const listTotal = items.reduce((a, i) => a + i.qty * i.unitPrice, 0);
        const discPct = transferDiscountPct(configMap);
        total = transferPrice(listTotal, discPct);
      }
    } catch (err) {
      console.error("Error revalidando items en transferencia:", err);
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

