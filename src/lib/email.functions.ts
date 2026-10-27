/**
 * email.functions.ts
 * Funciones de servidor para enviar notificaciones de órdenes por email.
 * Usa Resend (https://resend.com) — variable de entorno: RESEND_API_KEY
 */

import { money } from "@/lib/store";
import { escapeHtml } from "@/lib/html-escape";
import { createRateLimiter } from "./rate-limit";

export type NotifyOrderInput = {
  orderCode: string;
  total: number;
  metodoPago: "transferencia" | "tarjeta" | "mercadopago";
  shipping: {
    nombre: string;
    email: string;
    telefono: string;
    dni?: string | undefined;
    ciudad?: string | undefined;
    provincia?: string | undefined;
    codigo_postal?: string | undefined;
    transporte?: string | undefined;
    sucursal_correo?: string | undefined;
  };
  items: { nombre: string; qty: number; unitPrice: number }[];
  couponCode?: string | undefined;
  couponDiscountAmount?: number | undefined;
};

const ADMIN_EMAILS = [
  "teimportamosar@gmail.com",
];

/**
 * Copia del pedido con todo el texto escapado para HTML. Nombre, dirección y nombres de productos
 * los escribe el cliente: sin escapar, alguien podría meter links o contenido falso en un email que
 * sale desde nuestro dominio (por ejemplo, poniendo el email de otra persona).
 */
function escapeOrderForHtml(order: NotifyOrderInput): NotifyOrderInput {
  const shipping = Object.fromEntries(
    Object.entries(order.shipping).map(([k, v]) => [k, v === undefined ? v : escapeHtml(v)]),
  ) as NotifyOrderInput["shipping"];
  return {
    ...order,
    orderCode: escapeHtml(order.orderCode),
    total: Number(order.total) || 0,
    shipping,
    items: order.items.map((i) => ({
      nombre: escapeHtml(i.nombre),
      qty: Number(i.qty) || 0,
      unitPrice: Number(i.unitPrice) || 0,
    })),
    ...(order.couponCode !== undefined ? { couponCode: escapeHtml(order.couponCode) } : {}),
  };
}

/**
 * site_config es pública (la lee la tienda): el registro del último envío no puede llevar el email
 * del cliente ni el número de pedido. Se guarda enmascarado ("j***@gmail.com").
 */
function maskEmail(email: string): string {
  const [user = "", domain = ""] = String(email ?? "").split("@");
  return domain ? `${user.slice(0, 1)}***@${domain}` : "***";
}
function redactEmails(text: string): string {
  return String(text ?? "").replace(/[^\s@"'<>]+@[^\s@"'<>]+/g, (m) => maskEmail(m));
}

/** Emails de confirmación por destinatario (cada instancia del servidor lleva su cuenta). */
const customerEmailLimited = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 3 });

export function isSingleEmail(email: string): boolean {
  // Sin cuantificadores anidados (ReDoS): se separa en usuario y dominio
  if (email.length > 254) return false;
  const at = email.indexOf("@");
  if (at < 1 || at > 64 || at !== email.lastIndexOf("@")) return false;
  const user = email.slice(0, at);
  const domain = email.slice(at + 1);
  return (
    !/[\s,;<>"'()]/.test(user) &&
    /^[a-z0-9.-]+$/i.test(domain) &&
    domain.includes(".") &&
    !domain.startsWith(".") &&
    !domain.endsWith(".") &&
    !domain.includes("..")
  );
}

const METODO_LABEL: Record<string, string> = {
  transferencia: "🏦 Transferencia Bancaria",
  tarjeta: "💳 Tarjeta de Crédito/Débito",
  mercadopago: "🔵 Mercado Pago",
};

export function buildAdminEmailHtml(rawOrder: NotifyOrderInput): string {
  const order = escapeOrderForHtml(rawOrder);
  const itemsHtml = order.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;">${i.nombre}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${i.qty}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${money(i.unitPrice)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">${money(i.qty * i.unitPrice)}</td>
        </tr>`,
    )
    .join("");

  const metodoPago = METODO_LABEL[order.metodoPago] ?? escapeHtml(order.metodoPago);
  const itemsSubtotal = order.items.reduce((acc, i) => acc + i.qty * i.unitPrice, 0);
  const discountAmount = Math.max(0, itemsSubtotal - order.total);
  const hasDiscount = discountAmount > 0;
  const couponDiscount = order.couponDiscountAmount ?? 0;
  const transferDiscount = Math.max(0, discountAmount - couponDiscount);

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e8e8e8;border-radius:12px;overflow:hidden;">
      
      <!-- Header -->
      <div style="background:linear-gradient(100deg,#e05600,#c94a00);padding:24px 28px;">
        <h1 style="color:#fff;margin:0;font-size:20px;font-weight:800;letter-spacing:0.5px;">
          🛒 NUEVA VENTA — Te Importamos
        </h1>
        <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">
          Orden <strong>#${order.orderCode}</strong>
        </p>
      </div>
      
      <!-- Body -->
      <div style="padding:24px 28px;">
        
        <!-- Método de pago y total -->
        <div style="background:#fafafa;border:1px solid #eee;border-radius:8px;padding:16px 20px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#888;">Método de pago</p>
            <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#333;">${metodoPago}</p>
          </div>
          <div style="text-align:right;">
            <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#888;">
              ${hasDiscount ? "Total con descuento" : "Total abonado"}
            </p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:900;color:#e05600;">${money(order.total)}</p>
          </div>
        </div>

        <!-- Alerta de Cupón si fue utilizado -->
        ${order.couponCode ? `
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
          <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#15803d;">🎟️ Cupón de Descuento Utilizado</p>
          <p style="margin:3px 0 0;font-size:15px;font-weight:800;color:#166534;font-family:monospace;">
            ${order.couponCode} ${couponDiscount > 0 ? `<span style="font-size:13px;font-weight:600;color:#15803d;">(-${money(couponDiscount)})</span>` : ""}
          </p>
        </div>
        ` : ""}
        
        <!-- Datos del cliente -->
        <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#888;margin:0 0 12px;">Cliente y envío</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr>
            <td style="padding:5px 0;font-size:13px;font-weight:600;color:#333;width:40%;">Nombre</td>
            <td style="padding:5px 0;font-size:13px;color:#555;">${order.shipping.nombre}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;font-size:13px;font-weight:600;color:#333;">Email</td>
            <td style="padding:5px 0;font-size:13px;color:#555;">${order.shipping.email}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;font-size:13px;font-weight:600;color:#333;">Teléfono</td>
            <td style="padding:5px 0;font-size:13px;color:#555;">${order.shipping.telefono}</td>
          </tr>
          ${order.shipping.dni ? `<tr><td style="padding:5px 0;font-size:13px;font-weight:600;color:#333;">DNI</td><td style="padding:5px 0;font-size:13px;color:#555;">${order.shipping.dni}</td></tr>` : ""}
          ${order.shipping.ciudad ? `<tr><td style="padding:5px 0;font-size:13px;font-weight:600;color:#333;">Ciudad</td><td style="padding:5px 0;font-size:13px;color:#555;">${order.shipping.ciudad}, ${order.shipping.provincia ?? ""} (CP: ${order.shipping.codigo_postal ?? ""})</td></tr>` : ""}
          ${order.shipping.transporte ? `<tr><td style="padding:5px 0;font-size:13px;font-weight:600;color:#333;">Transporte</td><td style="padding:5px 0;font-size:13px;color:#555;">${order.shipping.transporte}</td></tr>` : ""}
          ${order.shipping.sucursal_correo ? `<tr><td style="padding:5px 0;font-size:13px;font-weight:600;color:#333;">Sucursal</td><td style="padding:5px 0;font-size:13px;color:#555;">${order.shipping.sucursal_correo}</td></tr>` : ""}
        </table>
        
        <!-- Ítems del pedido -->
        <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#888;margin:0 0 12px;">Productos comprados</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:8px;text-align:left;font-weight:600;color:#555;border-radius:4px 0 0 4px;">Producto</th>
              <th style="padding:8px;text-align:center;font-weight:600;color:#555;">Cant.</th>
              <th style="padding:8px;text-align:right;font-weight:600;color:#555;">Precio u.</th>
              <th style="padding:8px;text-align:right;font-weight:600;color:#555;border-radius:0 4px 4px 0;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:8px 8px;font-size:13px;text-align:right;border-top:1px solid #ddd;color:#666;">Subtotal de lista</td>
              <td style="padding:8px 8px;font-size:13px;text-align:right;border-top:1px solid #ddd;color:#333;">${money(itemsSubtotal)}</td>
            </tr>
            ${
              order.couponCode
                ? `
            <tr>
              <td colspan="3" style="padding:6px 8px;font-size:13px;text-align:right;color:#16a34a;font-weight:600;">🎟️ Cupón de descuento (${order.couponCode})</td>
              <td style="padding:6px 8px;font-size:13px;text-align:right;color:#16a34a;font-weight:600;">-${money(couponDiscount > 0 ? couponDiscount : discountAmount)}</td>
            </tr>
            `
                : ""
            }
            ${
              order.metodoPago === "transferencia" && transferDiscount > 0
                ? `
            <tr>
              <td colspan="3" style="padding:6px 8px;font-size:13px;text-align:right;color:#16a34a;font-weight:600;">🏦 Descuento Transferencia</td>
              <td style="padding:6px 8px;font-size:13px;text-align:right;color:#16a34a;font-weight:600;">-${money(transferDiscount)}</td>
            </tr>
            `
                : ""
            }
            ${
              !order.couponCode && order.metodoPago !== "transferencia" && hasDiscount
                ? `
            <tr>
              <td colspan="3" style="padding:6px 8px;font-size:13px;text-align:right;color:#16a34a;font-weight:600;">Descuento aplicado</td>
              <td style="padding:6px 8px;font-size:13px;text-align:right;color:#16a34a;font-weight:600;">-${money(discountAmount)}</td>
            </tr>
            `
                : ""
            }
            <tr>
              <td colspan="3" style="padding:10px 8px;font-weight:700;font-size:14px;text-align:right;border-top:2px solid #e05600;">TOTAL FINAL</td>
              <td style="padding:10px 8px;font-weight:900;font-size:16px;text-align:right;border-top:2px solid #e05600;color:#e05600;">${money(order.total)}</td>
            </tr>
          </tfoot>
        </table>
        
        <!-- Footer -->
        <div style="background:#fafafa;border:1px solid #eee;border-radius:8px;padding:14px 18px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#888;">
            Revisá el panel admin para ver todos los detalles y marcar la orden como enviada.
          </p>
        </div>
      </div>
    </div>
  `;
}

export function buildCustomerEmailHtml(rawOrder: NotifyOrderInput): string {
  const order = escapeOrderForHtml(rawOrder);
  const itemsHtml = order.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;">${i.nombre}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${i.qty}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${money(i.unitPrice)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">${money(i.qty * i.unitPrice)}</td>
        </tr>`,
    )
    .join("");

  const metodoPago = METODO_LABEL[order.metodoPago] ?? escapeHtml(order.metodoPago);
  const isTransfer = order.metodoPago === "transferencia";
  const itemsSubtotal = order.items.reduce((acc, i) => acc + i.qty * i.unitPrice, 0);
  const discountAmount = Math.max(0, itemsSubtotal - order.total);
  const hasDiscount = discountAmount > 0;
  const couponDiscount = order.couponDiscountAmount ?? 0;
  const transferDiscount = Math.max(0, discountAmount - couponDiscount);

  const waLink = `https://wa.me/5493418051515?text=Hola%20Te%20Importamos%2C%20${encodeURIComponent(
    isTransfer
      ? `adjunto el comprobante de mi pedido #${order.orderCode}`
      : `tengo una consulta sobre mi pedido #${order.orderCode}`
  )}`;

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e8e8e8;border-radius:12px;overflow:hidden;">
      
      <!-- Header -->
      <div style="background:linear-gradient(100deg,#e05600,#c94a00);padding:24px 28px;">
        <h1 style="color:#fff;margin:0;font-size:20px;font-weight:800;letter-spacing:0.5px;">
          ¡Gracias por tu compra en Te Importamos!
        </h1>
        <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">
          Pedido <strong>#${order.orderCode}</strong>
        </p>
      </div>
      
      <!-- Body -->
      <div style="padding:24px 28px;">
        <p style="font-size:14px;color:#333;margin-top:0;">
          Hola <strong>${order.shipping.nombre}</strong>, recibimos tu pedido con éxito.
        </p>
        
        ${isTransfer ? `
        <div style="background:#fff8e6;border:1px solid #fbd38d;border-radius:8px;padding:16px 18px;margin-bottom:20px;font-size:13px;color:#7b341e;">
          <p style="margin:0 0 10px;font-weight:700;">
            ⏳ Recordatorio de Transferencia:
          </p>
          <p style="margin:0 0 12px;">
            Tu pedido y stock están reservados por <strong>24 horas</strong>. Por favor enviá el comprobante de pago a nuestro WhatsApp para despachar tu paquete.
          </p>
          <a href="${waLink}" target="_blank" style="display:inline-block;background:#25d366;color:#ffffff;font-weight:700;padding:10px 16px;border-radius:8px;text-decoration:none;font-size:13px;">
            📲 Enviar comprobante por WhatsApp
          </a>
        </div>
        ` : `
        <div style="background:#edfbf3;border:1px solid #9ae6b4;border-radius:8px;padding:14px 18px;margin-bottom:20px;font-size:13px;color:#22543d;">
          ✓ Tu pago fue recibido correctamente. Ya estamos preparando tu pedido para el despacho.
        </div>
        `}

        <!-- Método de pago y total -->
        <div style="background:#fafafa;border:1px solid #eee;border-radius:8px;padding:16px 20px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#888;">Método de pago</p>
            <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#333;">${metodoPago}</p>
          </div>
          <div style="text-align:right;">
            <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#888;">
              ${hasDiscount ? "Total con descuento aplicado" : "Total"}
            </p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:900;color:#e05600;">${money(order.total)}</p>
          </div>
        </div>
        
        <!-- Datos del cliente -->
        <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#888;margin:0 0 12px;">Datos de envío</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr>
            <td style="padding:5px 0;font-size:13px;font-weight:600;color:#333;width:40%;">Destinatario</td>
            <td style="padding:5px 0;font-size:13px;color:#555;">${order.shipping.nombre}</td>
          </tr>
          <tr>
            <td style="padding:5px 0;font-size:13px;font-weight:600;color:#333;">Teléfono</td>
            <td style="padding:5px 0;font-size:13px;color:#555;">${order.shipping.telefono}</td>
          </tr>
          ${order.shipping.ciudad ? `<tr><td style="padding:5px 0;font-size:13px;font-weight:600;color:#333;">Ciudad</td><td style="padding:5px 0;font-size:13px;color:#555;">${order.shipping.ciudad}, ${order.shipping.provincia ?? ""} (CP: ${order.shipping.codigo_postal ?? ""})</td></tr>` : ""}
          ${order.shipping.transporte ? `<tr><td style="padding:5px 0;font-size:13px;font-weight:600;color:#333;">Transporte</td><td style="padding:5px 0;font-size:13px;color:#555;">${order.shipping.transporte} (${order.shipping.sucursal_correo ?? ""})</td></tr>` : ""}
        </table>
        
        <!-- Ítems del pedido -->
        <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#888;margin:0 0 12px;">Resumen del pedido</h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:8px;text-align:left;font-weight:600;color:#555;border-radius:4px 0 0 4px;">Producto</th>
              <th style="padding:8px;text-align:center;font-weight:600;color:#555;">Cant.</th>
              <th style="padding:8px;text-align:right;font-weight:600;color:#555;">Precio u.</th>
              <th style="padding:8px;text-align:right;font-weight:600;color:#555;border-radius:0 4px 4px 0;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:8px 8px;font-size:13px;text-align:right;border-top:1px solid #ddd;color:#666;">Subtotal de lista</td>
              <td style="padding:8px 8px;font-size:13px;text-align:right;border-top:1px solid #ddd;color:#333;">${money(itemsSubtotal)}</td>
            </tr>
            ${
              order.couponCode
                ? `
            <tr>
              <td colspan="3" style="padding:6px 8px;font-size:13px;text-align:right;color:#16a34a;font-weight:600;">🎟️ Cupón de descuento (${order.couponCode})</td>
              <td style="padding:6px 8px;font-size:13px;text-align:right;color:#16a34a;font-weight:600;">-${money(couponDiscount > 0 ? couponDiscount : discountAmount)}</td>
            </tr>
            `
                : ""
            }
            ${
              isTransfer && transferDiscount > 0
                ? `
            <tr>
              <td colspan="3" style="padding:6px 8px;font-size:13px;text-align:right;color:#16a34a;font-weight:600;">🏦 Descuento por Transferencia</td>
              <td style="padding:6px 8px;font-size:13px;text-align:right;color:#16a34a;font-weight:600;">-${money(transferDiscount)}</td>
            </tr>
            `
                : ""
            }
            ${
              !order.couponCode && !isTransfer && hasDiscount
                ? `
            <tr>
              <td colspan="3" style="padding:6px 8px;font-size:13px;text-align:right;color:#16a34a;font-weight:600;">Descuento aplicado</td>
              <td style="padding:6px 8px;font-size:13px;text-align:right;color:#16a34a;font-weight:600;">-${money(discountAmount)}</td>
            </tr>
            `
                : ""
            }
            <tr>
              <td colspan="3" style="padding:10px 8px;font-weight:700;font-size:14px;text-align:right;border-top:2px solid #e05600;">TOTAL FINAL</td>
              <td style="padding:10px 8px;font-weight:900;font-size:16px;text-align:right;border-top:2px solid #e05600;color:#e05600;">${money(order.total)}</td>
            </tr>
          </tfoot>
        </table>
        
        <!-- Footer -->
        <div style="background:#fafafa;border:1px solid #eee;border-radius:8px;padding:18px 20px;text-align:center;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#333;">
            ¿Tenés dudas sobre tu pedido?
          </p>
          <a href="${waLink}" target="_blank" style="display:inline-block;background:#25d366;color:#ffffff;font-weight:700;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;margin-bottom:8px;">
            💬 Escribinos por WhatsApp (+54 9 3418 05-1515)
          </a>

        </div>
      </div>
    </div>
  `;
}

/**
 * Envía notificación a los emails de admin y al comprador cuando se realiza una nueva venta.
 * Fire-and-forget: no lanza error si falla, solo loguea.
 */
export async function notifyNewOrder(order: NotifyOrderInput): Promise<{ success: boolean; error?: string }> {
  // Clave de Resend desde la configuración privada (nunca desde site_config, que es pública)
  const { supabaseAdmin: adminForKey } = await import("@/integrations/supabase/client.server");
  const { getResendConfig } = await import("./secrets.server");
  const { apiKey, from: fromAddress } = await getResendConfig(adminForKey);

  if (!apiKey) {
    const msg = "[email] RESEND_API_KEY no está configurada ni en base de datos ni en variables de entorno — se omite el email.";
    console.warn(msg);
    return { success: false, error: msg };
  }

  const metodoPago = METODO_LABEL[order.metodoPago] ?? escapeHtml(order.metodoPago);
  let adminSuccess = false;
  let adminError = "";
  let customerSuccess = false;
  let customerError = "";

  try {
    // 1. Enviar notificación al equipo Administrador
    const resAdmin = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: ADMIN_EMAILS,
        subject: `🛒 Nueva venta ${order.metodoPago === "transferencia" ? "— esperando transferencia" : "— pago aprobado"} | ${order.orderCode}`,
        reply_to: "teimportamosar@gmail.com",
        html: buildAdminEmailHtml(order),
        text: [
          `NUEVA VENTA — Te Importamos`,
          `Orden: ${order.orderCode}`,
          `Método: ${metodoPago}`,
          `Total: ${money(order.total)}`,
          ``,
          `CLIENTE:`,
          `Nombre: ${order.shipping.nombre}`,
          `Email: ${order.shipping.email}`,
          `Teléfono: ${order.shipping.telefono}`,
          ``,
          `PRODUCTOS:`,
          ...order.items.map((i) => `- ${i.nombre} x${i.qty} = ${money(i.qty * i.unitPrice)}`),
          ``,
          `Total: ${money(order.total)}`,
        ].join("\n"),
      }),
    });

    if (!resAdmin.ok) {
      const body = await resAdmin.text().catch(() => "");
      adminError = `Admin error ${resAdmin.status}: ${body}`;
      console.error("[email] Error al enviar notificación a admins:", resAdmin.status, body);
    } else {
      adminSuccess = true;
    }

    // 2. Enviar confirmación al comprador si tiene email válido
    const customerEmail = order.shipping.email?.trim();
    // Una sola dirección válida (sin comas, espacios ni "Nombre <...>") y un límite por
    // destinatario: el formulario de pedido no puede usarse para mandar emails a terceros en masa
    if (
      customerEmail &&
      isSingleEmail(customerEmail) &&
      !customerEmailLimited(customerEmail.toLowerCase())
    ) {
      const resCustomer = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [customerEmail],
          subject: `📦 Confirmación de tu pedido #${order.orderCode} — Te Importamos`,
          reply_to: "teimportamosar@gmail.com",
          html: buildCustomerEmailHtml(order),
          text: [
            `¡Hola ${order.shipping.nombre}!`,
            ``,
            `Recibimos tu pedido #${order.orderCode} en Te Importamos con éxito.`,
            `Total a abonar: ${money(order.total)} (${metodoPago})`,
            ``,
            `Resumen de tu pedido:`,
            ...order.items.map((i) => `- ${i.nombre} x${i.qty} = ${money(i.qty * i.unitPrice)}`),
            ``,
            order.metodoPago === "transferencia"
              ? `Recordá enviar tu comprobante de transferencia por WhatsApp (+54 9 3418 05-1515) para reservar tu stock y despachar tu pedido.`
              : `Tu pago fue aprobado. Ya estamos preparando tu paquete para despacharlo.`,
            ``,
            `¡Gracias por confiar en Te Importamos!`,
          ].join("\n"),
        }),
      });

      if (!resCustomer.ok) {
        const body = await resCustomer.text().catch(() => "");
        customerError = `Cliente error ${resCustomer.status}: ${body}`;
        console.error("[email] Error al enviar confirmación al cliente:", resCustomer.status, body);
        try {
          // Registro interno: va a la configuración privada (site_config es pública)
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await (supabaseAdmin as any).from("app_secrets").upsert(
            {
              clave: "last_email_error",
              valor: `[${new Date().toLocaleTimeString("es-AR")}] Error enviando a ${maskEmail(customerEmail)} (HTTP ${resCustomer.status}): ${redactEmails(body).slice(0, 300)}`,
            },
            { onConflict: "clave" },
          );
        } catch {
          // ignore
        }
      } else {
        customerSuccess = true;
        try {
          // Registro interno: va a la configuración privada (site_config es pública)
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await (supabaseAdmin as any).from("app_secrets").upsert(
            {
              clave: "last_email_success",
              valor: `[${new Date().toLocaleTimeString("es-AR")}] Enviado con éxito a ${maskEmail(customerEmail)}`,
            },
            { onConflict: "clave" },
          );
        } catch {
          // ignore
        }
      }
    }

    const finalSuccess = adminSuccess || customerSuccess;
    const finalError = [adminError, customerError].filter(Boolean).join(" | ");

    return { success: finalSuccess, error: finalError || undefined };
  } catch (err) {
    const errStr = err instanceof Error ? err.message : String(err);
    console.error("[email] Error inesperado al enviar emails de orden:", err);
    return { success: false, error: errStr };
  }
}

/**
 * Enviar un email de prueba directamente desde el panel de administración
 */
export async function sendTestOrderEmail(targetEmail?: string): Promise<{ success: boolean; message: string }> {
  const testOrder: NotifyOrderInput = {
    orderCode: "TEST-" + Math.floor(1000 + Math.random() * 9000),
    total: 25000,
    metodoPago: "transferencia",
    shipping: {
      nombre: "Cliente de Prueba",
      email: targetEmail || "teimportamosar@gmail.com",
      telefono: "1123456789",
      dni: "35123456",
      ciudad: "Rosario",
      provincia: "Santa Fe",
      codigo_postal: "2000",
      transporte: "Correo Argentino",
      sucursal_correo: "Sucursal Centro",
    },
    items: [
      { nombre: "Perfume Árabe Asad Lattafa 100ml", qty: 1, unitPrice: 25000 },
    ],
  };

  const res = await notifyNewOrder(testOrder);
  if (res.success) {
    return { success: true, message: "¡Email de prueba enviado con éxito! Revisá la bandeja de entrada (y Spam)." };
  }
  return { success: false, message: res.error || "No se pudo enviar el email de prueba. Verificá tu API Key de Resend." };
}
