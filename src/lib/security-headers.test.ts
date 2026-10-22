import { describe, expect, it } from "vitest";
import { SECURITY_HEADERS, withSecurityHeaders } from "./security-headers";
import { clientIpFrom, createRateLimiter } from "./rate-limit";

describe("withSecurityHeaders", () => {
  it("agrega los encabezados y conserva estado, cuerpo y encabezados propios", async () => {
    const res = withSecurityHeaders(
      new Response("<html>ok</html>", {
        status: 201,
        headers: { "content-type": "text/html", "Content-Security-Policy": "default-src 'none'" },
      }),
    );
    expect(res.status).toBe(201);
    expect(await res.text()).toBe("<html>ok</html>");
    expect(res.headers.get("content-type")).toBe("text/html");
    expect(res.headers.get("Strict-Transport-Security")).toBe("max-age=31536000");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    // No pisa una política propia (p. ej. la del proxy de imágenes)
    expect(res.headers.get("Content-Security-Policy")).toBe("default-src 'none'");
  });

  it("no restringe scripts ni conexiones (PostHog, Mercado Pago)", () => {
    const csp = SECURITY_HEADERS["Content-Security-Policy"]!;
    expect(csp).not.toMatch(/script-src|connect-src|default-src|img-src/);
    expect(csp).toContain("frame-ancestors");
    expect(csp).toContain("lovable");
    expect(csp).toContain("https://*.posthog.com");
  });

  it("funciona con respuestas sin cuerpo", () => {
    const res = withSecurityHeaders(new Response(null, { status: 304 }));
    expect(res.status).toBe(304);
    expect(res.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });
});

describe("createRateLimiter", () => {
  it("corta al superar el máximo y cuenta cada IP por separado", () => {
    const limited = createRateLimiter({ windowMs: 60_000, max: 3 });
    expect([1, 2, 3].map(() => limited("1.1.1.1"))).toEqual([false, false, false]);
    expect(limited("1.1.1.1")).toBe(true);
    expect(limited("2.2.2.2")).toBe(false);
  });

  it("toma la IP de los encabezados del proxy", () => {
    expect(clientIpFrom(new Headers({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }))).toBe("9.9.9.9");
    expect(clientIpFrom(new Headers({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
    expect(clientIpFrom(new Headers())).toBe("desconocida");
  });
});
