/**
 * newsletter.functions.ts
 * Sistema de envío de campañas promocionales por tandas con Resend
 * y seguimiento anti-duplicados por suscriptor.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BASE_URL = "https://teimportamosarg.com";

export interface NewsletterSubscriber {
  id: string;
  email: string;
  nombre?: string;
  is_active: boolean;
  unsubscribe_token: string;
  created_at: string;
}

export interface NewsletterCampaign {
  id: string;
  subject: string;
  headline: string;
  content: string;
  cta_text: string;
  cta_url: string;
  coupon_code?: string;
  status: "draft" | "active" | "completed";
  total_target: number;
  sent_count: number;
  created_at: string;
  completed_at?: string;
}

export interface CampaignSummary {
  activeSubscribersCount: number;
  unsubscribedCount: number;
  activeCampaign: NewsletterCampaign | null;
  recentCampaigns: NewsletterCampaign[];
  pendingInActiveCampaign: number;
}

/**
 * Plantilla HTML responsive para correos promocionales con enlace de desuscripción de 1-click
 */
export function buildPromotionalEmailHtml(params: {
  nombre?: string;
  headline: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  couponCode?: string;
  unsubscribeToken: string;
}): string {
  const greeting = params.nombre ? `¡Hola ${params.nombre}!` : "¡Hola!";
  const ctaText = params.ctaText || "Ver Ofertas en la Tienda";
  const ctaUrl = params.ctaUrl || `${BASE_URL}/catalogo`;
  const unsubscribeUrl = `${BASE_URL}/desuscribir?token=${encodeURIComponent(params.unsubscribeToken)}`;

  // Convertir saltos de línea del mensaje en párrafos
  const contentHtml = params.content
    .split("\n\n")
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.headline}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Header con Logo -->
    <div style="background-color:#000000;padding:24px 20px;text-align:center;">
      <a href="${BASE_URL}" style="text-decoration:none;">
        <span style="font-size:24px;font-weight:900;letter-spacing:1px;color:#ffffff;text-transform:uppercase;">
          TE IMPORTAMOS
        </span>
      </a>
      <div style="color:#9ca3af;font-size:12px;margin-top:4px;letter-spacing:0.5px;">PRECIO DE IMPORTADOR • VENTA MAYORISTA Y MINORISTA</div>
    </div>

    <!-- Contenido Principal -->
    <div style="padding:32px 24px;">
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#111827;line-height:1.3;">
        ${params.headline}
      </h1>

      <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#4b5563;">
        ${greeting}
      </p>

      ${contentHtml}

      <!-- Cupón Destacado (si existe) -->
      ${
        params.couponCode
          ? `
      <div style="margin:24px 0;padding:16px;background:#fef2f2;border:2px dashed #dc2626;border-radius:8px;text-align:center;">
        <div style="font-size:12px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px;">Cupón de Descuento Exclusivo</div>
        <div style="font-size:24px;font-weight:900;color:#dc2626;letter-spacing:2px;margin:8px 0;">${params.couponCode}</div>
        <div style="font-size:12px;color:#7f1d1d;">Ingresalo en el carrito antes de finalizar tu compra</div>
      </div>
      `
          : ""
      }

      <!-- Botón Call To Action -->
      <div style="text-align:center;margin:32px 0 16px;">
        <a href="${ctaUrl}" style="display:inline-block;background-color:#dc2626;color:#ffffff;font-size:16px;font-weight:700;padding:14px 32px;text-decoration:none;border-radius:8px;box-shadow:0 4px 6px -1px rgba(220,38,38,0.3);">
          ${ctaText} →
        </a>
      </div>
    </div>

    <!-- Footer con Desuscripción Obligatoria -->
    <div style="background-color:#f9fafb;padding:24px 20px;border-top:1px solid #e5e7eb;text-align:center;font-size:12px;color:#6b7280;line-height:1.5;">
      <p style="margin:0 0 8px;">
        Recibiste este correo porque tenés una cuenta o te suscribiste en <strong>Te Importamos</strong>.
      </p>
      <p style="margin:0 0 12px;">
        Rosario, Santa Fe, Argentina • Envíos a todo el país
      </p>
      <p style="margin:0;">
        ¿No querés recibir más promociones? 
        <a href="${unsubscribeUrl}" style="color:#dc2626;text-decoration:underline;">
          Desuscribirme de estos correos
        </a>
      </p>
    </div>

  </div>
</body>
</html>
  `.trim();
}

/**
 * Obtener estadísticas de newsletter y estado de campaña activa
 */
export const getCampaignsSummary = createServerFn({ method: "GET" }).handler(
  async (): Promise<CampaignSummary> => {
    try {
      const [subsRes, unsubsRes, campaignsRes] = await Promise.all([
        (supabaseAdmin as any).from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("is_active", true),
        (supabaseAdmin as any).from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("is_active", false),
        (supabaseAdmin as any).from("newsletter_campaigns").select("*").order("created_at", { ascending: false }).limit(10),
      ]);

      const activeSubscribersCount = subsRes.count ?? 0;
      const unsubscribedCount = unsubsRes.count ?? 0;
      const recentCampaigns = (campaignsRes.data ?? []) as NewsletterCampaign[];

      const activeCampaign = recentCampaigns.find((c) => c.status === "active") || null;
      let pendingInActiveCampaign = 0;

      if (activeCampaign) {
        // Contar cuántos faltan enviar en esta campaña específica
        const { count: sentLogsCount } = await (supabaseAdmin as any)
          .from("newsletter_campaign_logs")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", activeCampaign.id);

        pendingInActiveCampaign = Math.max(0, activeSubscribersCount - (sentLogsCount ?? 0));
      }

      return {
        activeSubscribersCount,
        unsubscribedCount,
        activeCampaign,
        recentCampaigns,
        pendingInActiveCampaign,
      };
    } catch (err) {
      console.error("[newsletter] Error al obtener resumen de campañas:", err);
      return {
        activeSubscribersCount: 0,
        unsubscribedCount: 0,
        activeCampaign: null,
        recentCampaigns: [],
        pendingInActiveCampaign: 0,
      };
    }
  },
);

/**
 * Crear una nueva campaña de correo
 */
export const createNewsletterCampaign = createServerFn({ method: "POST" })
  .validator((d: { subject: string; headline: string; content: string; cta_text?: string; cta_url?: string; coupon_code?: string }) => {
    return z
      .object({
        subject: z.string().min(3, "El asunto es obligatorio"),
        headline: z.string().min(3, "El título es obligatorio"),
        content: z.string().min(10, "El contenido debe tener al menos 10 caracteres"),
        cta_text: z.string().optional(),
        cta_url: z.string().optional(),
        coupon_code: z.string().optional(),
      })
      .parse(d);
  })
  .handler(async ({ data }) => {
    try {
      // 1. Contar suscriptores activos
      const { count: activeCount, error: countErr } = await (supabaseAdmin as any)
        .from("newsletter_subscribers")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);

      if (countErr) throw countErr;

      // 2. Desactivar cualquier otra campaña activa previa
      await (supabaseAdmin as any)
        .from("newsletter_campaigns")
        .update({ status: "completed" })
        .eq("status", "active");

      // 3. Crear la nueva campaña
      const { data: newCampaign, error: insertErr } = await (supabaseAdmin as any)
        .from("newsletter_campaigns")
        .insert({
          subject: data.subject.trim(),
          headline: data.headline.trim(),
          content: data.content.trim(),
          cta_text: data.cta_text?.trim() || "Ver Ofertas en la Tienda",
          cta_url: data.cta_url?.trim() || `${BASE_URL}/catalogo`,
          coupon_code: data.coupon_code?.trim() || null,
          status: "active",
          total_target: activeCount ?? 0,
          sent_count: 0,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      return { success: true, campaign: newCampaign as NewsletterCampaign };
    } catch (err: any) {
      console.error("[newsletter] Error al crear campaña:", err);
      return { success: false, error: err.message || "Error al crear la campaña." };
    }
  });

/**
 * Enviar siguiente tanda de la campaña activa (anti-duplicación)
 */
export const sendNextCampaignBatch = createServerFn({ method: "POST" })
  .validator((d: { campaignId: string; batchSize: number }) => {
    return z
      .object({
        campaignId: z.string().uuid(),
        batchSize: z.number().min(1).max(80).default(50),
      })
      .parse(d);
  })
  .handler(async ({ data }) => {
    const { campaignId, batchSize } = data;

    try {
      // 1. Obtener la campaña
      const { data: campaign, error: campErr } = await (supabaseAdmin as any)
        .from("newsletter_campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (campErr || !campaign) {
        return { success: false, error: "Campaña no encontrada." };
      }

      // 2. Obtener IDs de suscriptores que YA recibieron esta campaña
      const { data: sentLogs } = await (supabaseAdmin as any)
        .from("newsletter_campaign_logs")
        .select("subscriber_id")
        .eq("campaign_id", campaignId);

      const sentSubscriberIds = new Set((sentLogs || []).map((l: any) => l.subscriber_id));

      // 3. Obtener todos los suscriptores activos
      const { data: allActiveSubscribers, error: subsErr } = await (supabaseAdmin as any)
        .from("newsletter_subscribers")
        .select("id, email, nombre, unsubscribe_token")
        .eq("is_active", true);

      if (subsErr) throw subsErr;

      // 4. Filtrar los que FALTAN recibir esta campaña
      const pendingSubscribers = (allActiveSubscribers || []).filter(
        (sub: any) => !sentSubscriberIds.has(sub.id),
      );

      if (pendingSubscribers.length === 0) {
        // Ya se le envió a todos -> Completar campaña
        await (supabaseAdmin as any)
          .from("newsletter_campaigns")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", campaignId);

        return {
          success: true,
          sentCount: 0,
          remainingCount: 0,
          completed: true,
          message: "¡La campaña ya fue enviada a todos los suscriptores activos!",
        };
      }

      // 5. Tomar solo la tanda seleccionada (ej: 50)
      const batch = pendingSubscribers.slice(0, batchSize);

      // Obtener API Key de Resend
      let apiKey = process.env["RESEND_API_KEY"] || process.env["VITE_RESEND_API_KEY"];
      const fromAddress = "Te Importamos <noreply@teimportamosarg.com>";

      let sentCount = 0;
      let failedCount = 0;
      const logsToInsert: { campaign_id: string; subscriber_id: string; email: string }[] = [];

      for (const subscriber of batch) {
        const html = buildPromotionalEmailHtml({
          nombre: subscriber.nombre,
          headline: campaign.headline,
          content: campaign.content,
          ctaText: campaign.cta_text,
          ctaUrl: campaign.cta_url,
          couponCode: campaign.coupon_code,
          unsubscribeToken: subscriber.unsubscribe_token,
        });

        if (apiKey) {
          try {
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: fromAddress,
                to: [subscriber.email],
                subject: campaign.subject,
                reply_to: "teimportamosar@gmail.com",
                html,
              }),
            });

            if (res.ok) {
              sentCount++;
              logsToInsert.push({
                campaign_id: campaignId,
                subscriber_id: subscriber.id,
                email: subscriber.email,
              });
            } else {
              failedCount++;
              const errBody = await res.text().catch(() => "");
              console.error("[newsletter] Fallo envio a suscriptor:", subscriber.email, errBody);
            }
          } catch (e) {
            failedCount++;
            console.error("[newsletter] Error en fetch a Resend:", subscriber.email, e);
          }
        } else {
          // Si no hay API key en local/dev, simulamos el log
          console.warn("[newsletter] RESEND_API_KEY ausente: simulando envío en desarrollo");
          sentCount++;
          logsToInsert.push({
            campaign_id: campaignId,
            subscriber_id: subscriber.id,
            email: subscriber.email,
          });
        }
      }

      // 6. Guardar registros de envío para que NUNCA se les vuelva a mandar
      if (logsToInsert.length > 0) {
        await (supabaseAdmin as any).from("newsletter_campaign_logs").insert(logsToInsert);
      }

      // 7. Actualizar el conteo total enviado de la campaña
      const newTotalSent = (sentLogs?.length || 0) + sentCount;
      const remainingCount = pendingSubscribers.length - sentCount;
      const isCompleted = remainingCount <= 0;

      await (supabaseAdmin as any)
        .from("newsletter_campaigns")
        .update({
          sent_count: newTotalSent,
          status: isCompleted ? "completed" : "active",
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .eq("id", campaignId);

      return {
        success: true,
        sentCount,
        failedCount,
        remainingCount,
        completed: isCompleted,
        message: isCompleted
          ? `¡Tanda enviada exitosamente! Campaña completada: todos los clientes (${newTotalSent}) recibieron el correo.`
          : `Se enviaron ${sentCount} correos hoy. Quedan ${remainingCount} pendientes para las próximas tandas.`,
      };
    } catch (err: any) {
      console.error("[newsletter] Error en envío de tanda:", err);
      return { success: false, error: err.message || "Error al procesar la tanda de emails." };
    }
  });

/**
 * Desuscribir usuario por token seguro (1-click)
 */
export const unsubscribeByToken = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => z.object({ token: z.string().min(8) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { data: sub, error } = await (supabaseAdmin as any)
        .from("newsletter_subscribers")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("unsubscribe_token", data.token)
        .select("email")
        .single();

      if (error || !sub) {
        return { success: false, error: "Enlace de desuscripción no válido o caducado." };
      }

      return { success: true, email: sub.email };
    } catch (err: any) {
      console.error("[newsletter] Error al desuscribir:", err);
      return { success: false, error: "No se pudo procesar la desuscripción." };
    }
  });

/**
 * Reactivar suscripción (por si se desuscribió por error)
 */
export const resubscribeByToken = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => z.object({ token: z.string().min(8) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { data: sub, error } = await (supabaseAdmin as any)
        .from("newsletter_subscribers")
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq("unsubscribe_token", data.token)
        .select("email")
        .single();

      if (error || !sub) {
        return { success: false, error: "Enlace no válido." };
      }

      return { success: true, email: sub.email };
    } catch (err: any) {
      console.error("[newsletter] Error al reactivar:", err);
      return { success: false, error: "No se pudo reactivar la suscripción." };
    }
  });
