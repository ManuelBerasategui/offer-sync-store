import { n as createServerFn } from "./server-BSCRlM9_.mjs";
import { t as createSsrRpc } from "./store.functions-DYWk1U4D.mjs";
import { a as objectType, i as numberType, o as stringType, t as booleanType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/newsletter.functions-DIz849kv.js
/**
* newsletter.functions.ts
* Sistema de envío de campañas promocionales por tandas con Resend
* y seguimiento anti-duplicados por suscriptor.
*/
/**
* Obtener estadísticas de newsletter y estado de campaña activa
*/
var getCampaignsSummary = createServerFn({ method: "GET" }).handler(createSsrRpc("0e9e59e299b1f5fbcea1fe9f3fb5db122668c29d909f68001921ca0967600737"));
/**
* Crear una nueva campaña de correo
*/
var createNewsletterCampaign = createServerFn({ method: "POST" }).validator((d) => {
	return objectType({
		subject: stringType().min(3, "El asunto es obligatorio"),
		headline: stringType().min(3, "El título es obligatorio"),
		content: stringType().min(10, "El contenido debe tener al menos 10 caracteres"),
		cta_text: stringType().optional(),
		cta_url: stringType().optional(),
		coupon_code: stringType().optional()
	}).parse(d);
}).handler(createSsrRpc("205327b4d36edcbcf27343ed3bc22b634281513faf7f09d49b596b6b405e1b85"));
/**
* Enviar siguiente tanda de la campaña activa (anti-duplicación)
*/
var sendNextCampaignBatch = createServerFn({ method: "POST" }).validator((d) => {
	return objectType({
		campaignId: stringType().uuid(),
		batchSize: numberType().min(1).max(80).default(50)
	}).parse(d);
}).handler(createSsrRpc("442234fd61383a0e064253b69f1e392190c63e5f8238d18be70da7770babb02c"));
/**
* Enviar un email de prueba de una campaña a una dirección específica (ej: para testing)
* NO cuenta para las tandas ni registra al usuario en logs de entrega real.
*/
var sendCampaignTestEmail = createServerFn({ method: "POST" }).validator((d) => {
	return objectType({
		campaignId: stringType().uuid(),
		targetEmail: stringType().email("Ingresá un correo electrónico válido")
	}).parse(d);
}).handler(createSsrRpc("c936c1d92b34a8860ac6aebe768dd0e54e73d10de1ad7ab8d9df579d6a809419"));
/**
* Sincronizar nuevo suscriptor al registrar cuenta
*/
var syncNewUserSubscriber = createServerFn({ method: "POST" }).validator((d) => {
	return objectType({
		email: stringType().email(),
		nombre: stringType().optional(),
		acceptMarketing: booleanType()
	}).parse(d);
}).handler(createSsrRpc("0142bccd990b06199b74a8aef8c5d69445f986a0e81330ddf121326728abb5dd"));
/**
* Desuscribir usuario por token seguro (1-click)
*/
var unsubscribeByToken = createServerFn({ method: "POST" }).validator((d) => objectType({ token: stringType().min(8) }).parse(d)).handler(createSsrRpc("d52a68dea94a6c0b6b693035a00f0fd2ad84030cf189f8560d49eef397c71f47"));
/**
* Reactivar suscripción (por si se desuscribió por error)
*/
var resubscribeByToken = createServerFn({ method: "POST" }).validator((d) => objectType({ token: stringType().min(8) }).parse(d)).handler(createSsrRpc("b7efb0b82ae37032ed7a2a214b841f4e40fe255825306e80bac4ddb6ae7d4ef4"));
//#endregion
export { sendNextCampaignBatch as a, sendCampaignTestEmail as i, getCampaignsSummary as n, syncNewUserSubscriber as o, resubscribeByToken as r, unsubscribeByToken as s, createNewsletterCampaign as t };
