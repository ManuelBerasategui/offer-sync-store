import { describe, expect, it } from "vitest";
import {
  DEFAULT_QUOTE_TERMS,
  calcHonorarios,
  QUOTE_TERMS_KEYS,
  readQuoteTerms,
  splitPayment,
  toQuoteTermsRows,
} from "./quote-terms";

describe("readQuoteTerms", () => {
  it("usa los valores por defecto si no hay nada guardado", () => {
    expect(readQuoteTerms({})).toEqual(DEFAULT_QUOTE_TERMS);
  });

  it("lee lo guardado y limita la seña entre 0 y 100", () => {
    const t = readQuoteTerms({
      [QUOTE_TERMS_KEYS.senaPct]: "150",
      [QUOTE_TERMS_KEYS.plazoAereo]: "  30 días  ",
      [QUOTE_TERMS_KEYS.noIncluye]: "Envío\n\n  Seguro  \n",
    });
    expect(t.senaPct).toBe(100);
    expect(t.plazoAereo).toBe("30 días");
    expect(t.noIncluye).toEqual(["Envío", "Seguro"]);
  });

  it("acepta seña 0 y descarta valores no numéricos", () => {
    expect(readQuoteTerms({ [QUOTE_TERMS_KEYS.senaPct]: "0" }).senaPct).toBe(0);
    expect(readQuoteTerms({ [QUOTE_TERMS_KEYS.senaPct]: "abc" }).senaPct).toBe(50);
  });
});

describe("toQuoteTermsRows", () => {
  it("sanea textos largos y caracteres de control", () => {
    const rows = toQuoteTermsRows({ factura: "Factura\tA" + "x".repeat(1000), senaPct: -5 });
    const get = (k: string) => rows.find((r) => r.clave === k)?.valor ?? "";
    expect(get(QUOTE_TERMS_KEYS.senaPct)).toBe("0");
    expect(get(QUOTE_TERMS_KEYS.factura).startsWith("Factura A")).toBe(true);
    expect(get(QUOTE_TERMS_KEYS.factura).length).toBe(400);
  });
});

describe("splitPayment", () => {
  it("seña + saldo suman el total", () => {
    const { sena, saldo } = splitPayment(1234.57, 50);
    expect(sena).toBe(617.29);
    expect(Math.round((sena + saldo) * 100) / 100).toBe(1234.57);
  });
});

describe("calcHonorarios", () => {
  it("10% de la mercadería hasta tope de 250", () => {
    expect(calcHonorarios(500, 10, 250)).toBe(50);
    expect(calcHonorarios(2500, 10, 250)).toBe(250);
    expect(calcHonorarios(5000, 10, 250)).toBe(250);
    expect(calcHonorarios(53, 10, 250)).toBe(5.3);
  });
  it("sin tope o con valores inválidos", () => {
    expect(calcHonorarios(5000, 10, 0)).toBe(500);
    expect(calcHonorarios(-1, 10, 250)).toBe(0);
  });
});
