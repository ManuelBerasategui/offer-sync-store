/**
 * email.functions.ts
 * Funciones de servidor para enviar notificaciones de órdenes por email.
 * Usa Resend (https://resend.com) — variable de entorno: RESEND_API_KEY
 */

import { money } from "@/lib/store";

export type NotifyOrderInput = {
  orderCode: string;
  total: number;
  metodoPago: "transferencia" | "tarjeta" | "mercadopago";
  shipping: {
    nombre: string;
    email: string;
    telefono: string;
    dni?: string;
    ciudad?: string;
    provincia?: string;
    codigo_postal?: string;
    transporte?: string;
    sucursal_correo?: string;
  };
  items: { nombre: string; qty: number; unitPrice: number }[];
};

const ADMIN_EMAILS = [
  "teimportamosar@gmail.com",
  "soporte.nolimit@gmail.com",
  "felipecuffia7@gmail.com",
];

const METODO_LABEL: Record<string, string> = {
  transferencia: "🏦 Transferencia Bancaria",
  tarjeta: "💳 Tarjeta de Crédito/Débito",
  mercadopago: "🔵 Mercado Pago",
};

function buildAdminEmailHtml(order: NotifyOrderInput): string {
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

  const metodoPago = METODO_LABEL[order.metodoPago] ?? order.metodoPago;

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
            <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#888;">Total abonado</p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:900;color:#e05600;">${money(order.total)}</p>
          </div>
        </div>
        
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
              <td colspan="3" style="padding:10px 8px;font-weight:700;font-size:14px;text-align:right;border-top:2px solid #e05600;">TOTAL</td>
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

/**
 * Envía notificación a los emails de admin cuando se realiza una nueva venta.
 * Fire-and-forget: no lanza error si falla, solo loguea.
 */
export async function notifyNewOrder(order: NotifyOrderInput): Promise<void> {
  const apiKey =
    process.env["RESEND_API_KEY"] ||
    process.env["VITE_RESEND_API_KEY"] ||
    (typeof import.meta !== "undefined" && import.meta.env ? (import.meta.env["VITE_RESEND_API_KEY"] as string | undefined) || (import.meta.env["RESEND_API_KEY"] as string | undefined) : undefined);

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY no está configurada — se omite el email de notificación.");
    return;
  }

  const fromAddress =
    process.env["RESEND_FROM"] ||
    process.env["VITE_RESEND_FROM"] ||
    (typeof import.meta !== "undefined" && import.meta.env ? (import.meta.env["VITE_RESEND_FROM"] as string | undefined) || (import.meta.env["RESEND_FROM"] as string | undefined) : undefined) ||
    "Te Importamos <onboarding@resend.dev>";

  const metodoPago = METODO_LABEL[order.metodoPago] ?? order.metodoPago;

  try {
    const res = await fetch("https://api.resend.com/emails", {
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

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[email] Error al enviar notificación de orden: ${res.status}`, body);
    } else {
      console.log(`[email] Notificación de nueva orden enviada: ${order.orderCode}`);
    }
  } catch (err) {
    console.error("[email] Error inesperado al enviar email de orden:", err);
  }
}
