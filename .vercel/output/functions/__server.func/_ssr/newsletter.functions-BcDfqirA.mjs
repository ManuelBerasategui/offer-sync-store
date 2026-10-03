import { n as createServerFn } from "./server-BSCRlM9_.mjs";
import { a as objectType, i as numberType, o as stringType, t as booleanType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-prIP6Hrh.mjs";
import { supabaseAdmin } from "./client.server-KzwUIAkW.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/newsletter.functions-BcDfqirA.js
/**
* newsletter.functions.ts
* Sistema de envío de campañas promocionales por tandas con Resend
* y seguimiento anti-duplicados por suscriptor.
*/
var BASE_URL = "https://teimportamosarg.com";
function buildPromotionalEmailHtml(params) {
	const greeting = params.nombre ? `¡Hola ${params.nombre}!` : "¡Hola!";
	const ctaText = params.ctaText || "Ver Ofertas en la Tienda";
	const ctaUrl = params.ctaUrl || `${BASE_URL}/catalogo`;
	const unsubscribeUrl = `${BASE_URL}/desuscribir?token=${encodeURIComponent(params.unsubscribeToken)}`;
	const contentHtml = params.content.split("\n\n").map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">${p.replace(/\n/g, "<br/>")}</p>`).join("");
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
      ${params.couponCode ? `
      <div style="margin:24px 0;padding:16px;background:#fef2f2;border:2px dashed #dc2626;border-radius:8px;text-align:center;">
        <div style="font-size:12px;font-weight:700;color:#991b1b;text-transform:uppercase;letter-spacing:0.5px;">Cupón de Descuento Exclusivo</div>
        <div style="font-size:24px;font-weight:900;color:#dc2626;letter-spacing:2px;margin:8px 0;">${params.couponCode}</div>
        <div style="font-size:12px;color:#7f1d1d;">Ingresalo en el carrito antes de finalizar tu compra</div>
      </div>
      ` : ""}

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
var getCampaignsSummary_createServerFn_handler = createServerRpc({
	id: "0e9e59e299b1f5fbcea1fe9f3fb5db122668c29d909f68001921ca0967600737",
	name: "getCampaignsSummary",
	filename: "src/lib/newsletter.functions.ts"
}, (opts) => getCampaignsSummary.__executeServer(opts));
var getCampaignsSummary = createServerFn({ method: "GET" }).handler(getCampaignsSummary_createServerFn_handler, async () => {
	try {
		const [subsRes, unsubsRes, campaignsRes] = await Promise.all([
			supabaseAdmin.from("newsletter_subscribers").select("id", {
				count: "exact",
				head: true
			}).eq("is_active", true),
			supabaseAdmin.from("newsletter_subscribers").select("id", {
				count: "exact",
				head: true
			}).eq("is_active", false),
			supabaseAdmin.from("newsletter_campaigns").select("*").order("created_at", { ascending: false }).limit(10)
		]);
		const activeSubscribersCount = subsRes.count ?? 0;
		const unsubscribedCount = unsubsRes.count ?? 0;
		const recentCampaigns = campaignsRes.data ?? [];
		const activeCampaign = recentCampaigns.find((c) => c.status === "active") || null;
		let pendingInActiveCampaign = 0;
		if (activeCampaign) {
			const { count: sentLogsCount } = await supabaseAdmin.from("newsletter_campaign_logs").select("id", {
				count: "exact",
				head: true
			}).eq("campaign_id", activeCampaign.id);
			pendingInActiveCampaign = Math.max(0, activeSubscribersCount - (sentLogsCount ?? 0));
		}
		return {
			activeSubscribersCount,
			unsubscribedCount,
			activeCampaign,
			recentCampaigns,
			pendingInActiveCampaign
		};
	} catch (err) {
		console.error("[newsletter] Error al obtener resumen de campañas:", err);
		return {
			activeSubscribersCount: 0,
			unsubscribedCount: 0,
			activeCampaign: null,
			recentCampaigns: [],
			pendingInActiveCampaign: 0
		};
	}
});
var createNewsletterCampaign_createServerFn_handler = createServerRpc({
	id: "205327b4d36edcbcf27343ed3bc22b634281513faf7f09d49b596b6b405e1b85",
	name: "createNewsletterCampaign",
	filename: "src/lib/newsletter.functions.ts"
}, (opts) => createNewsletterCampaign.__executeServer(opts));
var createNewsletterCampaign = createServerFn({ method: "POST" }).validator((d) => {
	return objectType({
		subject: stringType().min(3, "El asunto es obligatorio"),
		headline: stringType().min(3, "El título es obligatorio"),
		content: stringType().min(10, "El contenido debe tener al menos 10 caracteres"),
		cta_text: stringType().optional(),
		cta_url: stringType().optional(),
		coupon_code: stringType().optional()
	}).parse(d);
}).handler(createNewsletterCampaign_createServerFn_handler, async ({ data }) => {
	try {
		const { count: activeCount, error: countErr } = await supabaseAdmin.from("newsletter_subscribers").select("id", {
			count: "exact",
			head: true
		}).eq("is_active", true);
		if (countErr) throw countErr;
		await supabaseAdmin.from("newsletter_campaigns").update({ status: "completed" }).eq("status", "active");
		const { data: newCampaign, error: insertErr } = await supabaseAdmin.from("newsletter_campaigns").insert({
			subject: data.subject.trim(),
			headline: data.headline.trim(),
			content: data.content.trim(),
			cta_text: data.cta_text?.trim() || "Ver Ofertas en la Tienda",
			cta_url: data.cta_url?.trim() || `${BASE_URL}/catalogo`,
			coupon_code: data.coupon_code?.trim() || null,
			status: "active",
			total_target: activeCount ?? 0,
			sent_count: 0
		}).select().single();
		if (insertErr) throw insertErr;
		return {
			success: true,
			campaign: newCampaign
		};
	} catch (err) {
		console.error("[newsletter] Error al crear campaña:", err);
		return {
			success: false,
			error: err.message || "Error al crear la campaña."
		};
	}
});
var sendNextCampaignBatch_createServerFn_handler = createServerRpc({
	id: "442234fd61383a0e064253b69f1e392190c63e5f8238d18be70da7770babb02c",
	name: "sendNextCampaignBatch",
	filename: "src/lib/newsletter.functions.ts"
}, (opts) => sendNextCampaignBatch.__executeServer(opts));
var sendNextCampaignBatch = createServerFn({ method: "POST" }).validator((d) => {
	return objectType({
		campaignId: stringType().uuid(),
		batchSize: numberType().min(1).max(80).default(50)
	}).parse(d);
}).handler(sendNextCampaignBatch_createServerFn_handler, async ({ data }) => {
	const { campaignId, batchSize } = data;
	try {
		const { data: campaign, error: campErr } = await supabaseAdmin.from("newsletter_campaigns").select("*").eq("id", campaignId).single();
		if (campErr || !campaign) return {
			success: false,
			error: "Campaña no encontrada."
		};
		const { data: sentLogs } = await supabaseAdmin.from("newsletter_campaign_logs").select("subscriber_id").eq("campaign_id", campaignId);
		const sentSubscriberIds = new Set((sentLogs || []).map((l) => l.subscriber_id));
		const { data: allActiveSubscribers, error: subsErr } = await supabaseAdmin.from("newsletter_subscribers").select("id, email, nombre, unsubscribe_token").eq("is_active", true);
		if (subsErr) throw subsErr;
		const pendingSubscribers = (allActiveSubscribers || []).filter((sub) => !sentSubscriberIds.has(sub.id));
		if (pendingSubscribers.length === 0) {
			await supabaseAdmin.from("newsletter_campaigns").update({
				status: "completed",
				completed_at: (/* @__PURE__ */ new Date()).toISOString()
			}).eq("id", campaignId);
			return {
				success: true,
				sentCount: 0,
				remainingCount: 0,
				completed: true,
				message: "¡La campaña ya fue enviada a todos los suscriptores activos!"
			};
		}
		const batch = pendingSubscribers.slice(0, batchSize);
		let apiKey = process.env["RESEND_API_KEY"] || process.env["VITE_RESEND_API_KEY"];
		const fromAddress = "Te Importamos <noreply@teimportamosarg.com>";
		let sentCount = 0;
		let failedCount = 0;
		const logsToInsert = [];
		for (const subscriber of batch) {
			const html = buildPromotionalEmailHtml({
				nombre: subscriber.nombre,
				headline: campaign.headline,
				content: campaign.content,
				ctaText: campaign.cta_text,
				ctaUrl: campaign.cta_url,
				couponCode: campaign.coupon_code,
				unsubscribeToken: subscriber.unsubscribe_token
			});
			if (apiKey) try {
				const res = await fetch("https://api.resend.com/emails", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${apiKey}`,
						"Content-Type": "application/json"
					},
					body: JSON.stringify({
						from: fromAddress,
						to: [subscriber.email],
						subject: campaign.subject,
						reply_to: "teimportamosar@gmail.com",
						html
					})
				});
				if (res.ok) {
					sentCount++;
					logsToInsert.push({
						campaign_id: campaignId,
						subscriber_id: subscriber.id,
						email: subscriber.email
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
			else {
				console.warn("[newsletter] RESEND_API_KEY ausente: simulando envío en desarrollo");
				sentCount++;
				logsToInsert.push({
					campaign_id: campaignId,
					subscriber_id: subscriber.id,
					email: subscriber.email
				});
			}
		}
		if (logsToInsert.length > 0) await supabaseAdmin.from("newsletter_campaign_logs").insert(logsToInsert);
		const newTotalSent = (sentLogs?.length || 0) + sentCount;
		const remainingCount = pendingSubscribers.length - sentCount;
		const isCompleted = remainingCount <= 0;
		await supabaseAdmin.from("newsletter_campaigns").update({
			sent_count: newTotalSent,
			status: isCompleted ? "completed" : "active",
			completed_at: isCompleted ? (/* @__PURE__ */ new Date()).toISOString() : null
		}).eq("id", campaignId);
		return {
			success: true,
			sentCount,
			failedCount,
			remainingCount,
			completed: isCompleted,
			message: isCompleted ? `¡Tanda enviada exitosamente! Campaña completada: todos los clientes (${newTotalSent}) recibieron el correo.` : `Se enviaron ${sentCount} correos hoy. Quedan ${remainingCount} pendientes para las próximas tandas.`
		};
	} catch (err) {
		console.error("[newsletter] Error en envío de tanda:", err);
		return {
			success: false,
			error: err.message || "Error al procesar la tanda de emails."
		};
	}
});
var sendCampaignTestEmail_createServerFn_handler = createServerRpc({
	id: "c936c1d92b34a8860ac6aebe768dd0e54e73d10de1ad7ab8d9df579d6a809419",
	name: "sendCampaignTestEmail",
	filename: "src/lib/newsletter.functions.ts"
}, (opts) => sendCampaignTestEmail.__executeServer(opts));
var sendCampaignTestEmail = createServerFn({ method: "POST" }).validator((d) => {
	return objectType({
		campaignId: stringType().uuid(),
		targetEmail: stringType().email("Ingresá un correo electrónico válido")
	}).parse(d);
}).handler(sendCampaignTestEmail_createServerFn_handler, async ({ data }) => {
	try {
		const { data: campaign, error: campErr } = await supabaseAdmin.from("newsletter_campaigns").select("*").eq("id", data.campaignId).single();
		if (campErr || !campaign) return {
			success: false,
			error: "Campaña no encontrada."
		};
		let apiKey = process.env["RESEND_API_KEY"] || process.env["VITE_RESEND_API_KEY"];
		const fromAddress = "Te Importamos <noreply@teimportamosarg.com>";
		const html = buildPromotionalEmailHtml({
			nombre: "Admin (Prueba)",
			headline: campaign.headline,
			content: campaign.content,
			ctaText: campaign.cta_text,
			ctaUrl: campaign.cta_url,
			couponCode: campaign.coupon_code,
			unsubscribeToken: "test_preview_token_123"
		});
		if (!apiKey) return {
			success: false,
			error: "RESEND_API_KEY no configurada. Verificá tus variables de entorno."
		};
		const res = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				from: fromAddress,
				to: [data.targetEmail.trim().toLowerCase()],
				subject: `[PRUEBA] ${campaign.subject}`,
				reply_to: "teimportamosar@gmail.com",
				html
			})
		});
		if (!res.ok) {
			const body = await res.text().catch(() => "");
			return {
				success: false,
				error: `Error de Resend (${res.status}): ${body}`
			};
		}
		return {
			success: true,
			message: `¡Email de prueba enviado exitosamente a ${data.targetEmail}! Revisá tu bandeja de entrada o Spam.`
		};
	} catch (err) {
		console.error("[newsletter] Error en test email:", err);
		return {
			success: false,
			error: err.message || "Error al enviar email de prueba."
		};
	}
});
var syncNewUserSubscriber_createServerFn_handler = createServerRpc({
	id: "0142bccd990b06199b74a8aef8c5d69445f986a0e81330ddf121326728abb5dd",
	name: "syncNewUserSubscriber",
	filename: "src/lib/newsletter.functions.ts"
}, (opts) => syncNewUserSubscriber.__executeServer(opts));
var syncNewUserSubscriber = createServerFn({ method: "POST" }).validator((d) => {
	return objectType({
		email: stringType().email(),
		nombre: stringType().optional(),
		acceptMarketing: booleanType()
	}).parse(d);
}).handler(syncNewUserSubscriber_createServerFn_handler, async ({ data }) => {
	try {
		const token = (await import("crypto")).randomBytes(16).toString("hex");
		await supabaseAdmin.from("newsletter_subscribers").upsert({
			email: data.email.trim().toLowerCase(),
			nombre: data.nombre?.trim() || null,
			is_active: data.acceptMarketing,
			unsubscribe_token: token,
			updated_at: (/* @__PURE__ */ new Date()).toISOString()
		}, { onConflict: "email" });
		return { success: true };
	} catch (err) {
		console.error("[newsletter] Error al registrar suscriptor:", err);
		return {
			success: false,
			error: err.message
		};
	}
});
var unsubscribeByToken_createServerFn_handler = createServerRpc({
	id: "d52a68dea94a6c0b6b693035a00f0fd2ad84030cf189f8560d49eef397c71f47",
	name: "unsubscribeByToken",
	filename: "src/lib/newsletter.functions.ts"
}, (opts) => unsubscribeByToken.__executeServer(opts));
var unsubscribeByToken = createServerFn({ method: "POST" }).validator((d) => objectType({ token: stringType().min(8) }).parse(d)).handler(unsubscribeByToken_createServerFn_handler, async ({ data }) => {
	try {
		const { data: sub, error } = await supabaseAdmin.from("newsletter_subscribers").update({
			is_active: false,
			updated_at: (/* @__PURE__ */ new Date()).toISOString()
		}).eq("unsubscribe_token", data.token).select("email").single();
		if (error || !sub) return {
			success: false,
			error: "Enlace de desuscripción no válido o caducado."
		};
		return {
			success: true,
			email: sub.email
		};
	} catch (err) {
		console.error("[newsletter] Error al desuscribir:", err);
		return {
			success: false,
			error: "No se pudo procesar la desuscripción."
		};
	}
});
var resubscribeByToken_createServerFn_handler = createServerRpc({
	id: "b7efb0b82ae37032ed7a2a214b841f4e40fe255825306e80bac4ddb6ae7d4ef4",
	name: "resubscribeByToken",
	filename: "src/lib/newsletter.functions.ts"
}, (opts) => resubscribeByToken.__executeServer(opts));
var resubscribeByToken = createServerFn({ method: "POST" }).validator((d) => objectType({ token: stringType().min(8) }).parse(d)).handler(resubscribeByToken_createServerFn_handler, async ({ data }) => {
	try {
		const { data: sub, error } = await supabaseAdmin.from("newsletter_subscribers").update({
			is_active: true,
			updated_at: (/* @__PURE__ */ new Date()).toISOString()
		}).eq("unsubscribe_token", data.token).select("email").single();
		if (error || !sub) return {
			success: false,
			error: "Enlace no válido."
		};
		return {
			success: true,
			email: sub.email
		};
	} catch (err) {
		console.error("[newsletter] Error al reactivar:", err);
		return {
			success: false,
			error: "No se pudo reactivar la suscripción."
		};
	}
});
//#endregion
export { createNewsletterCampaign_createServerFn_handler, getCampaignsSummary_createServerFn_handler, resubscribeByToken_createServerFn_handler, sendCampaignTestEmail_createServerFn_handler, sendNextCampaignBatch_createServerFn_handler, syncNewUserSubscriber_createServerFn_handler, unsubscribeByToken_createServerFn_handler };
