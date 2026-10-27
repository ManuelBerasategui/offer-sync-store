import { describe, expect, it } from "vitest";
import { getSafeRedirect } from "./safe-redirect";

describe("getSafeRedirect", () => {
  it("deja pasar rutas de la tienda", () => {
    expect(getSafeRedirect("/carrito")).toBe("/carrito");
    expect(getSafeRedirect("/catalogo?cat=Bazar#top")).toBe("/catalogo?cat=Bazar#top");
    expect(getSafeRedirect(undefined)).toBe("/");
  });

  it("bloquea destinos a otros sitios", () => {
    for (const evil of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "/\t/evil.com",
      "/\n/evil.com",
      "/%09/evil.com/../",
      "javascript:alert(1)",
      "evil.com",
    ]) {
      const out = getSafeRedirect(evil);
      expect(new URL(out, "https://teimportamosarg.com").origin).toBe(
        "https://teimportamosarg.com",
      );
    }
  });
});
