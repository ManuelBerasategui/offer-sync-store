import { describe, it, expect, vi } from "vitest";
import { isAllowedProxyUrl, handleImageProxy } from "./image-proxy";
import { imageUrl } from "./store";

describe("isAllowedProxyUrl (SSRF Prevention — CWE-918)", () => {
  it("returns a URL object for valid Supabase Storage public URLs", () => {
    const url1 = isAllowedProxyUrl(
      "https://xyzcompany.supabase.co/storage/v1/object/public/storage-images/productos/test.webp",
    );
    expect(url1).toBeInstanceOf(URL);
    expect(url1?.hostname).toBe("xyzcompany.supabase.co");

    const url2 = isAllowedProxyUrl(
      "https://app-12345.supabase.co/storage/v1/object/public/banners/promo.png",
    );
    expect(url2).toBeInstanceOf(URL);
  });

  it("returns null for non-Supabase domains (SSRF protection)", () => {
    expect(isAllowedProxyUrl("https://attacker.com/malicious.jpg")).toBeNull();
    expect(isAllowedProxyUrl("https://google.com/image.png")).toBeNull();
    expect(
      isAllowedProxyUrl("https://fake-supabase.co.attacker.com/storage/v1/object/public/test.jpg"),
    ).toBeNull();
  });

  it("returns null for non-HTTPS protocols and internal networks", () => {
    expect(isAllowedProxyUrl("http://xyz.supabase.co/storage/v1/object/public/test.webp")).toBeNull();
    expect(isAllowedProxyUrl("file:///etc/passwd")).toBeNull();
    expect(isAllowedProxyUrl("http://localhost:3000")).toBeNull();
    expect(isAllowedProxyUrl("http://127.0.0.1")).toBeNull();
    expect(isAllowedProxyUrl("http://169.254.169.254/latest/meta-data/")).toBeNull();
  });

  it("returns null for non-public Supabase endpoints", () => {
    expect(isAllowedProxyUrl("https://xyz.supabase.co/rest/v1/users")).toBeNull();
    expect(isAllowedProxyUrl("https://xyz.supabase.co/auth/v1/admin")).toBeNull();
    expect(isAllowedProxyUrl("https://xyz.supabase.co/storage/v1/bucket")).toBeNull();
  });

  it("the returned URL href is normalized (taint flow is broken)", () => {
    const rawInput = "https://myproj.supabase.co/storage/v1/object/public/storage-images/photo.webp";
    const result = isAllowedProxyUrl(rawInput);
    // El fetch debe usar result.href, NUNCA el string crudo del usuario
    expect(result?.href).toBe(rawInput);
    expect(typeof result?.href).toBe("string");
  });
});

describe("imageUrl helper with Edge CDN proxying", () => {
  it("routes Supabase Storage URLs through /api/img proxy", () => {
    const original = "https://test.supabase.co/storage/v1/object/public/storage-images/prod.webp";
    const proxied = imageUrl(original);
    expect(proxied).toBe(`/api/img?url=${encodeURIComponent(original)}`);
  });

  it("does not re-proxy already proxied URLs", () => {
    const proxied = "/api/img?url=https%3A%2F%2Ftest.supabase.co%2Fstorage...";
    expect(imageUrl(proxied)).toBe(proxied);
  });

  it("handles Google Drive URLs using Google User Content CDN", () => {
    const driveUrl = "https://drive.google.com/file/d/1A2B3C4D5E/view";
    expect(imageUrl(driveUrl)).toBe("https://lh3.googleusercontent.com/d/1A2B3C4D5E=w1200");
  });

  it("returns relative paths unchanged", () => {
    expect(imageUrl("/placeholder.svg")).toBe("/placeholder.svg");
  });
});

describe("handleImageProxy request processing", () => {
  it("returns 405 for disallowed HTTP methods", async () => {
    const req = new Request("https://myshop.com/api/img?url=...", { method: "POST" });
    const res = await handleImageProxy(req);
    expect(res.status).toBe(405);
  });

  it("returns 400 when url param is missing", async () => {
    const req = new Request("https://myshop.com/api/img", { method: "GET" });
    const res = await handleImageProxy(req);
    expect(res.status).toBe(400);
  });

  it("returns 403 when url is forbidden", async () => {
    const req = new Request("https://myshop.com/api/img?url=https://attacker.com/img.jpg", {
      method: "GET",
    });
    const res = await handleImageProxy(req);
    expect(res.status).toBe(403);
  });

  it("fetches upstream and attaches immutable 1-year cache headers", async () => {
    const mockImageBytes = new Uint8Array([1, 2, 3, 4]);
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(mockImageBytes, {
        status: 200,
        headers: {
          "content-type": "image/webp",
          "content-length": "4",
          etag: '"abc123etag"',
        },
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const targetUrl =
      "https://myproj.supabase.co/storage/v1/object/public/storage-images/photo.webp";
    const req = new Request(`https://myshop.com/api/img?url=${encodeURIComponent(targetUrl)}`, {
      method: "GET",
    });

    const res = await handleImageProxy(req);

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("max-age=31536000");
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=31536000");
    expect(res.headers.get("Cache-Control")).toContain("immutable");
    expect(res.headers.get("CDN-Cache-Control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("Vercel-CDN-Cache-Control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("Content-Type")).toBe("image/webp");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("ETag")).toBe('"abc123etag"');

    vi.unstubAllGlobals();
  });
});
