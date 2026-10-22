import { describe, expect, it } from "vitest";
import {
  buildAdminEmailHtml,
  buildCustomerEmailHtml,
  type NotifyOrderInput,
} from "./email.functions";
import { escapeHtml } from "./html-escape";

const evil = '<a href="https://phish.example">Reclamá tu premio</a><img src=x onerror=alert(1)>';

const order: NotifyOrderInput = {
  orderCode: "TI-ABC123",
  total: 47430,
  metodoPago: "transferencia",
  shipping: {
    nombre: evil,
    email: "victima@example.com",
    telefono: "<b>341</b>",
    ciudad: evil,
    provincia: "Santa Fe",
    transporte: evil,
    sucursal_correo: evil,
    dni: evil,
  },
  items: [{ nombre: evil, qty: 1, unitPrice: 51000 }],
  couponCode: evil,
};

describe("escapeHtml", () => {
  it("escapa los caracteres de HTML", () => {
    expect(escapeHtml(`<a href="x" title='y'>&\``)).toBe(
      "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&#96;",
    );
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(123)).toBe("123");
  });
});

describe("emails de pedido", () => {
  for (const [name, build] of [
    ["admin", buildAdminEmailHtml],
    ["cliente", buildCustomerEmailHtml],
  ] as const) {
    it(`no deja pasar HTML del cliente (${name})`, () => {
      const html = build(order);
      expect(html).not.toContain('phish.example">');
      expect(html).not.toContain("<img src=x");
      expect(html).not.toContain("<b>341</b>");
      expect(html).toContain("&lt;a href=&quot;https://phish.example&quot;&gt;");
      // El contenido legítimo sigue estando
      expect(html).toContain("TI-ABC123");
      expect(html).toContain("51.000");
    });
  }
});
