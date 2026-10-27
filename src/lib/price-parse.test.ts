import { describe, expect, it } from "vitest";
import { detectCurrency, dropSuspiciousTiers, parsePrice } from "./price-parse";

describe("parsePrice", () => {
  it("formato inglés de Alibaba: coma de miles y punto decimal", () => {
    expect(parsePrice("1,894.63")).toBeCloseTo(1894.63);
    expect(parsePrice("ARS 1,210.02")).toBeCloseTo(1210.02);
    expect(parsePrice("12,345,678.9")).toBeCloseTo(12345678.9);
  });

  it("formato argentino: punto de miles y coma decimal", () => {
    expect(parsePrice("1.894,63")).toBeCloseTo(1894.63);
    expect(parsePrice("1.234.567")).toBe(1234567);
  });

  it("un solo separador seguido de 3 dígitos es de miles", () => {
    expect(parsePrice("1,894")).toBe(1894);
    expect(parsePrice("1.894")).toBe(1894);
  });

  it("un solo separador seguido de 1 o 2 dígitos es decimal", () => {
    expect(parsePrice("4,50")).toBeCloseTo(4.5);
    expect(parsePrice("US$ 4.5")).toBeCloseTo(4.5);
    expect(parsePrice("0.15")).toBeCloseTo(0.15);
  });

  it("números ya numéricos o sin separador", () => {
    expect(parsePrice(4.5)).toBe(4.5);
    expect(parsePrice("300")).toBe(300);
  });

  it("texto sin número devuelve NaN", () => {
    expect(parsePrice("")).toBeNaN();
    expect(parsePrice(null)).toBeNaN();
  });
});

describe("detectCurrency", () => {
  it("detecta pesos y dólares como los muestra Alibaba", () => {
    expect(detectCurrency("ARS 1,894.63")).toBe("ARS");
    expect(detectCurrency("US$4.50")).toBe("USD");
    expect(detectCurrency("USD 4.50")).toBe("USD");
    expect(detectCurrency("€ 3,20")).toBe("EUR");
  });

  it("sin marca de moneda o solo '$' devuelve null", () => {
    expect(detectCurrency("1,894.63")).toBeNull();
    expect(detectCurrency("$ 4.50")).toBeNull();
  });
});

describe("dropSuspiciousTiers", () => {
  it("descarta un precio cortado que cae de golpe", () => {
    const tiers = [
      { min_qty: 300, price_usd: 1894.63 },
      { min_qty: 5000, price_usd: 1210.02 },
      { min_qty: 10000, price_usd: 44 },
    ];
    expect(dropSuspiciousTiers(tiers).map((t) => t.min_qty)).toEqual([300, 5000]);
  });

  it("mantiene descuentos normales por cantidad", () => {
    const tiers = [
      { min_qty: 2, price_usd: 5.2 },
      { min_qty: 100, price_usd: 4.5 },
      { min_qty: 500, price_usd: 3.9 },
    ];
    expect(dropSuspiciousTiers(tiers)).toHaveLength(3);
  });
});
