import { describe, it, expect } from "vitest";
import { buildPromotionalEmailHtml } from "./newsletter.functions";

describe("Newsletter Promotional Email Builder", () => {
  it("generates valid HTML with unsubscribe link and token", () => {
    const html = buildPromotionalEmailHtml({
      nombre: "Juan",
      headline: "¡Ofertas de la Semana!",
      content: "Aprovechá 20% de descuento en tecnología.\n\nEnvíos a todo el país.",
      ctaText: "Ver Catálogo",
      ctaUrl: "https://teimportamosarg.com/catalogo",
      couponCode: "PROMO20",
      unsubscribeToken: "abc123token456",
    });

    expect(html).toContain("¡Hola Juan!");
    expect(html).toContain("¡Ofertas de la Semana!");
    expect(html).toContain("Aprovechá 20% de descuento en tecnología.");
    expect(html).toContain("PROMO20");
    expect(html).toContain("Ver Catálogo");
    expect(html).toContain("https://teimportamosarg.com/desuscribir?token=abc123token456");
    expect(html).toContain("Desuscribirme de estos correos");
  });

  it("handles fallback greeting and missing coupon correctly", () => {
    const html = buildPromotionalEmailHtml({
      headline: "Novedades en Bazar",
      content: "Descubrí nuestros nuevos termos y mates importados.",
      unsubscribeToken: "tokenxyz789",
    });

    expect(html).toContain("¡Hola!");
    expect(html).toContain("Novedades en Bazar");
    expect(html).not.toContain("Cupón de Descuento Exclusivo");
    expect(html).toContain("https://teimportamosarg.com/desuscribir?token=tokenxyz789");
  });
});
