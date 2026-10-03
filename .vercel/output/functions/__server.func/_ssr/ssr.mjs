//#region node_modules/.nitro/vite/services/ssr/index.js
var lastCapturedError;
var TTL_MS = 5e3;
function record(error) {
	lastCapturedError = {
		error,
		at: Date.now()
	};
}
var CAUSE_DEPTH_LIMIT = 5;
var DESCRIPTION_LENGTH_LIMIT = 8e3;
function describeError(error) {
	const parts = [];
	let current = error;
	for (let depth = 0; depth < CAUSE_DEPTH_LIMIT && current != null; depth++) {
		if (!(current instanceof Error)) {
			parts.push(typeof current === "string" ? current : safeStringify(current));
			break;
		}
		const label = depth === 0 ? "" : "caused by: ";
		const status = describeStatus(current);
		parts.push(`${label}${current.stack ?? `${current.name}: ${current.message}`}${status}`);
		current = current.cause;
	}
	return parts.join("\n").slice(0, DESCRIPTION_LENGTH_LIMIT);
}
function describeStatus(error) {
	const { status, statusCode } = error;
	const value = status ?? statusCode;
	return typeof value === "number" ? ` (status ${value})` : "";
}
function safeStringify(value) {
	try {
		return JSON.stringify(value) ?? String(value);
	} catch {
		return String(value);
	}
}
function isErrorLike(value) {
	return value instanceof Error;
}
var originalConsoleError = console.error.bind(console);
console.error = (...args) => {
	originalConsoleError(...args.map((arg) => {
		if (!isErrorLike(arg)) return arg;
		record(arg);
		return describeError(arg);
	}));
};
if (typeof globalThis.addEventListener === "function") {
	globalThis.addEventListener("error", (event) => record(event.error ?? event));
	globalThis.addEventListener("unhandledrejection", (event) => record(event.reason));
}
function consumeLastCapturedError() {
	if (!lastCapturedError) return void 0;
	if (Date.now() - lastCapturedError.at > TTL_MS) {
		lastCapturedError = void 0;
		return;
	}
	const { error } = lastCapturedError;
	lastCapturedError = void 0;
	return error;
}
function renderErrorPage() {
	return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>This page didn't load</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 15px/1.5 system-ui, -apple-system, sans-serif; background: #fafafa; color: #111; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 28rem; width: 100%; text-align: center; padding: 2rem; }
      h1 { font-size: 1.25rem; margin: 0 0 0.5rem; }
      p { color: #4b5563; margin: 0 0 1.5rem; }
      .actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: 0.5rem 1rem; border-radius: 0.375rem; font: inherit; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: #111; color: #fff; }
      .secondary { background: #fff; color: #111; border-color: #d1d5db; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>This page didn't load</h1>
      <p>Something went wrong on our end. You can try refreshing or head back home.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Try again</button>
        <a class="secondary" href="/">Go home</a>
      </div>
    </div>
  </body>
</html>`;
}
/**
* Image Proxy con Edge Caching para Vercel CDN y navegadores.
* Intercepta imágenes de Supabase Storage y las sirve con cabeceras de caché agresivas
* (1 año immutable), reduciendo el Cached Egress de Supabase en más de un 95%.
*/
var ALLOWED_CONTENT_TYPES = /* @__PURE__ */ new Set([
	"image/webp",
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/svg+xml",
	"image/avif"
]);
/**
* Allowlist estricta de dominios de Supabase Storage permitidos (anti-SSRF / CWE-918).
* Solo se permiten peticiones a la instancia oficial del proyecto y entornos autorizados.
*/
var ALLOWED_DOMAINS = ["dybzgnmghisqapdzgknv.supabase.co"];
try {
	const envUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
	if (envUrl) {
		const envHost = new URL(envUrl).hostname.toLowerCase();
		if (envHost && !ALLOWED_DOMAINS.includes(envHost)) ALLOWED_DOMAINS.push(envHost);
	}
} catch {}
/**
* Valida estrictamente que la URL pertenezca a Supabase Storage público (anti-SSRF / CWE-918).
* Retorna un objeto URL ya parseado y normalizado si es válido, o null si no lo es.
*/
function isAllowedProxyUrl(targetUrlStr) {
	if (!targetUrlStr || typeof targetUrlStr !== "string") return null;
	let cleanStr = targetUrlStr.trim();
	try {
		while (cleanStr.includes("%25") || cleanStr.startsWith("http%3A") || cleanStr.startsWith("https%3A")) {
			const decoded = decodeURIComponent(cleanStr);
			if (decoded === cleanStr) break;
			cleanStr = decoded;
		}
	} catch {}
	let parsed;
	try {
		parsed = new URL(cleanStr);
	} catch {
		return null;
	}
	if (parsed.protocol !== "https:") return null;
	const hostname = parsed.hostname.toLowerCase();
	if (!ALLOWED_DOMAINS.includes(hostname)) return null;
	const pathname = parsed.pathname;
	if (!pathname.startsWith("/storage/v1/object/public/") || pathname.includes("..") || pathname.includes("//") || pathname.includes("\\") || pathname.includes("%2e") || pathname.includes("%2f")) return null;
	return new URL(`https://${hostname}${pathname}`);
}
/**
* Maneja la petición al proxy de imágenes aplicando Edge Caching para Vercel CDN.
* Las cabeceras de respuesta Cache-Control instruyen al CDN de Vercel a cachear
* cada imagen por 1 año de forma inmutable (X-Vercel-Cache: HIT).
*/
async function handleImageProxy(request, _ctx) {
	if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed", {
		status: 405,
		headers: { Allow: "GET, HEAD" }
	});
	const targetUrlStr = new URL(request.url).searchParams.get("url");
	if (!targetUrlStr) return new Response("Missing url parameter", { status: 400 });
	const safeUrl = isAllowedProxyUrl(targetUrlStr);
	if (!safeUrl) return new Response("Forbidden target URL", { status: 403 });
	if (safeUrl.protocol !== "https:") return new Response("Forbidden protocol", { status: 403 });
	const targetHost = safeUrl.hostname.toLowerCase();
	if (!ALLOWED_DOMAINS.includes(targetHost)) return new Response("Untrusted host", { status: 403 });
	try {
		const upstreamHeaders = new Headers();
		const ifNoneMatch = request.headers.get("if-none-match");
		if (ifNoneMatch) upstreamHeaders.set("if-none-match", ifNoneMatch);
		const ifModifiedSince = request.headers.get("if-modified-since");
		if (ifModifiedSince) upstreamHeaders.set("if-modified-since", ifModifiedSince);
		const upstreamRes = await fetch(safeUrl.href, {
			method: request.method,
			headers: upstreamHeaders,
			signal: AbortSignal.timeout(1e4),
			cf: {
				cacheEverything: true,
				cacheTtl: 31536e3
			}
		});
		if (upstreamRes.status === 304) return new Response(null, {
			status: 304,
			headers: {
				"Cache-Control": "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable",
				"CDN-Cache-Control": "public, max-age=31536000, immutable",
				"Vercel-CDN-Cache-Control": "public, max-age=31536000, immutable",
				Vary: "Accept"
			}
		});
		if (!upstreamRes.ok) return new Response(`Upstream error: ${upstreamRes.statusText}`, { status: upstreamRes.status });
		const contentType = (upstreamRes.headers.get("content-type") || "image/webp").split(";")[0].trim().toLowerCase();
		const safeContentType = ALLOWED_CONTENT_TYPES.has(contentType) ? contentType : "image/webp";
		const resHeaders = new Headers();
		resHeaders.set("Cache-Control", "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable");
		resHeaders.set("CDN-Cache-Control", "public, max-age=31536000, immutable");
		resHeaders.set("Vercel-CDN-Cache-Control", "public, max-age=31536000, immutable");
		resHeaders.set("Content-Type", safeContentType);
		resHeaders.set("X-Content-Type-Options", "nosniff");
		resHeaders.set("Content-Security-Policy", "default-src 'none'");
		resHeaders.set("Vary", "Accept");
		const contentLength = upstreamRes.headers.get("content-length");
		if (contentLength) resHeaders.set("Content-Length", contentLength);
		const etag = upstreamRes.headers.get("etag");
		if (etag) resHeaders.set("ETag", etag);
		const lastModified = upstreamRes.headers.get("last-modified");
		if (lastModified) resHeaders.set("Last-Modified", lastModified);
		return new Response(upstreamRes.body, {
			status: 200,
			headers: resHeaders
		});
	} catch (err) {
		console.error("Image proxy fetch failed:", err);
		return new Response("Image proxy failed", { status: 502 });
	}
}
var serverEntryPromise;
async function getServerEntry() {
	if (!serverEntryPromise) serverEntryPromise = import("./server-BSCRlM9_.mjs").then((n) => n.i).then((n) => n.t).then((m) => m.default ?? m);
	return serverEntryPromise;
}
async function normalizeCatastrophicSsrResponse(response) {
	if (response.status < 500) return response;
	if (!(response.headers.get("content-type") ?? "").includes("application/json")) return response;
	const body = await response.clone().text();
	if (!isH3SwallowedErrorBody(body)) return response;
	console.error(consumeLastCapturedError() ?? /* @__PURE__ */ new Error(`h3 swallowed SSR error: ${body}`));
	return new Response(renderErrorPage(), {
		status: 500,
		headers: { "content-type": "text/html; charset=utf-8" }
	});
}
function isH3SwallowedErrorBody(body) {
	try {
		const payload = JSON.parse(body);
		return payload.unhandled === true && payload.message === "HTTPError";
	} catch {
		return false;
	}
}
var server_default = { async fetch(request, env, ctx) {
	try {
		if (new URL(request.url).pathname === "/api/img") return await handleImageProxy(request, ctx);
		return await normalizeCatastrophicSsrResponse(await (await getServerEntry()).fetch(request, env, ctx));
	} catch (error) {
		console.error(error);
		return new Response(renderErrorPage(), {
			status: 500,
			headers: { "content-type": "text/html; charset=utf-8" }
		});
	}
} };
//#endregion
export { server_default as default, renderErrorPage as n, handleImageProxy as t };
