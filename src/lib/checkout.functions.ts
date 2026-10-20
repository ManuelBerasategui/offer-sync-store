import { createServerFn } from "@tanstack/react-start";
import { hasUsedCoupon, verifiedUserFromToken } from "./coupon-usage";
import { priceOrderItems } from "./order-pricing";

/**
 * Orígenes permitidos para back_urls de MercadoPago (CWE-601 — Open Redirect).
 * data.origin viene del cliente y NO se puede confiar en él sin validación.
 */
const ALLOWED_ORIGINS = new Set([
  "https://www.teimportamosarg.com",
  "https://teimportamosarg.com",
]);
const FALLBACK_ORIGIN = "https://www.teimportamosarg.com";

function safeOrigin(raw: string): string {
  try {
    const parsed = new URL(raw);
    // Normalizar: solo scheme + host (sin path, sin query, sin credenciales)
    const normalized = `${parsed.protocol}//${parsed.host}`;
    return ALLOWED_ORIGINS.has(normalized) ? normalized : FALLBACK_ORIGIN;
  } catch {
    return FALLBACK_ORIGIN;
  }
}

type CheckoutItem = {
  nombre: string;
  qty: number;
  unitPrice: number;
  productId?: string | undefined;
  variantId?: string | undefined;
};

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
      couponCode?: string | undefined;
      token?: string | undefined;
    }) => {
      if (!data || !Array.isArray(data.items) || data.items.length === 0) {
        throw new Error("Carrito vacío");
      }
      const s = data.shipping ?? ({} as ShippingInput);
      return {
        origin: String(data.origin ?? "").slice(0, 200),
        userId: data.userId ? String(data.userId).slice(0, 60) : undefined,
        couponCode: data.couponCode ? String(data.couponCode).slice(0, 40).toUpperCase().trim() : undefined,
        token: data.token ? String(data.token).slice(0, 4000) : undefined,
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
          // Solo informativo: el precio que se cobra lo calcula el servidor (priceOrderItems)
          unitPrice: Math.max(1, Math.round(Number(i.unitPrice) || 0)),
          ...(i.productId ? { productId: String(i.productId).slice(0, 100) } : {}),
          ...(i.variantId ? { variantId: String(i.variantId).slice(0, 100) } : {}),
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

    if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      console.error("Supabase no está configurado para crear la orden pendiente.");
      return { error: "No pudimos registrar tu pedido. Probá de nuevo en unos minutos." };
    }

    let items: CheckoutItem[] = [];
    let total = 0;
    let couponDiscountAmount = 0;
    let validCouponApplied: string | null = null;

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Cuenta verificada por token (nunca el userId que manda el navegador)
      const verified = await verifiedUserFromToken(supabaseAdmin, data.token);

      // Garantizar que data.shipping tenga el email de la cuenta si el usuario está logueado
      if (verified?.email && (!data.shipping.email || !data.shipping.email.includes("@"))) {
        data.shipping.email = verified.email;
      }

      const validation = await priceOrderItems(supabaseAdmin, data.items);
      if (validation.error) {
        return { error: validation.error };
      }
      items = validation.validatedItems;
      total = validation.total;

      // Revalidación segura del cupón en el servidor: la cuenta sale del token verificado
      // (no del userId que manda el navegador) y, ante cualquier duda, no se aplica el descuento.
      if (data.couponCode && verified) {
        const { data: dbConfigRows } = await supabaseAdmin.from("site_config").select("clave,valor");
        const configObj: Record<string, string> = {};
        for (const row of dbConfigRows ?? []) {
          if (row.clave && row.valor !== undefined) configObj[row.clave] = String(row.valor);
        }

        const isCouponActive = (configObj["promo_cupon_activo"] ?? "SI").toUpperCase() === "SI";
        const promoCode = (configObj["promo_cupon_codigo"] ?? "TEIMPORTAMOS").toUpperCase().trim();

        if (isCouponActive && data.couponCode === promoCode) {
          const shippingEmail = (data.shipping.email ?? "").trim().toLowerCase();
          // Usos viejos registrados en site_config (antes de coupon_usages)
          const alreadyUsedInConfig = Boolean(
            configObj[`coupon_usage_${promoCode}_${verified.id}`] ||
              (verified.email && configObj[`coupon_usage_${promoCode}_${verified.email}`]) ||
              (shippingEmail && configObj[`coupon_usage_${promoCode}_${shippingEmail}`]),
          );
          const used =
            alreadyUsedInConfig ||
            (await hasUsedCoupon(supabaseAdmin, promoCode, verified.id, verified.email)) ||
            (shippingEmail && shippingEmail !== verified.email
              ? await hasUsedCoupon(supabaseAdmin, promoCode, null, shippingEmail)
              : false);

          if (!used) {
            const couponPct = Number(configObj["promo_cupon_descuento_pct"]) || 5;
            validCouponApplied = promoCode;
            // Aplicar descuento a cada ítem para reflejar el monto en la preferencia de Mercado Pago
            items = items.map((i) => ({
              ...i,
              unitPrice: Math.max(1, Math.round(i.unitPrice * (1 - couponPct / 100))),
            }));
            const discountedTotal = items.reduce((a, i) => a + i.qty * i.unitPrice, 0);
            couponDiscountAmount = Math.max(0, total - discountedTotal);
            total = discountedTotal;
          }
        }
      }
      // El pedido queda asociado solo a la cuenta verificada
      data.userId = verified?.id;
    } catch (err) {
      console.error("Error al revalidar la orden:", err);
      return {
        error: "No pudimos validar los precios de tu carrito. Por favor recargá la página e intentalo nuevamente.",
      };
    }

    if (items.length === 0 || total <= 0) {
      return { error: "No se pudieron calcular los totales de tu orden. Por favor recargá la página." };
    }

    // Generamos el código de orden
    const d = new Date();
    const stamp = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const orderCode = `TI-${stamp}-${rand}`;

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin.from("orders").insert({
        order_code: orderCode,
        user_id: data.userId ?? null,
        ...data.shipping,
        items,
        total,
        estado: "pendiente",
        metodo_pago: "mercadopago",
      });

      if (error) {
        console.error("Error al guardar orden pendiente:", error);
        return { error: "No pudimos registrar tu pedido. Probá de nuevo en unos minutos." };
      }

      // Registrar uso del cupón si fue aplicado
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
          console.error("Error registrando uso de cupón en MP:", couponErr);
        }

        // Los usos se registran solo en coupon_usages (privada). Antes también se escribían en
        // site_config, que es pública: eso exponía los emails de los clientes.
      }
    } catch (err) {
      console.error("Error al guardar orden pendiente:", err);
      return { error: "No pudimos registrar tu pedido. Probá de nuevo en unos minutos." };
    }

    // safeOrigin() valida data.origin contra el allowlist — previene Open Redirect (CWE-601)
    const origin = safeOrigin(data.origin);
    const successUrl = `${origin}/gracias?code=${encodeURIComponent(orderCode)}`;

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        authorization: `Bearer ${mpToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        items: items.map((i) => ({
          title: i.nombre,
          quantity: i.qty,
          unit_price: i.unitPrice,
          currency_id: "ARS",
        })),
        external_reference: orderCode,
        back_urls: {
          success: successUrl,
          pending: successUrl,
          failure: `${origin}/carrito`,
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
