import { describe, expect, it } from "vitest";
import {
  DEFAULT_QUOTE_TERMS,
  DEFAULT_BARCO_USD_M3,
  DEFAULT_DESPACHANTE_TRAMOS,
  calcFleteMaritimo,
  calcDespachante,
  calcHonorarios,
  parseDespachanteTramos,
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
  it("piso de 30: hasta US$ 300 se cobra 30, desde 400 el 10%", () => {
    for (const fob of [48, 100, 200, 300]) expect(calcHonorarios(fob, 10, 250, 30)).toBe(30);
    expect(calcHonorarios(400, 10, 250, 30)).toBe(40);
    expect(calcHonorarios(500, 10, 250, 30)).toBe(50);
    expect(calcHonorarios(5000, 10, 250, 30)).toBe(250);
  });
  it("sin mercadería no hay honorarios, ni con piso", () => {
    expect(calcHonorarios(0, 10, 250, 30)).toBe(0);
  });
});

describe("despachante por tramos", () => {
  const tramos = parseDespachanteTramos("0:100, 1000:150, 2000:200");
  it("elige el tramo más alto que alcanza la mercadería", () => {
    expect(calcDespachante(500, tramos)).toBe(100);
    expect(calcDespachante(999.99, tramos)).toBe(100);
    expect(calcDespachante(1000, tramos)).toBe(150);
    expect(calcDespachante(2100, tramos)).toBe(200);
    expect(calcDespachante(50000, tramos)).toBe(200);
  });
  it("sin mercadería no cobra", () => {
    expect(calcDespachante(0, tramos)).toBe(0);
  });
  it("ordena los tramos y descarta pares inválidos", () => {
    expect(parseDespachanteTramos("2000:300, x:1, 0:90, 5:-1, 1000")).toEqual([
      { desde: 0, monto: 90 },
      { desde: 2000, monto: 300 },
    ]);
  });
  it("si no hay nada válido usa la escala por defecto", () => {
    expect(parseDespachanteTramos("")).toEqual(parseDespachanteTramos(DEFAULT_DESPACHANTE_TRAMOS));
    expect(parseDespachanteTramos(undefined)).toHaveLength(3);
  });
});

describe("calcFleteMaritimo", () => {
  it("cobra por m³ con la tarifa dada", () => {
    expect(calcFleteMaritimo(2, 151.52)).toBe(303.04);
    expect(calcFleteMaritimo(33, DEFAULT_BARCO_USD_M3)).toBeCloseTo(5000, 0);
  });
  it("sin volumen no hay flete y una tarifa inválida cae a la de referencia", () => {
    expect(calcFleteMaritimo(0, 151.52)).toBe(0);
    expect(calcFleteMaritimo(-1, 151.52)).toBe(0);
    expect(calcFleteMaritimo(1, 0)).toBe(DEFAULT_BARCO_USD_M3);
  });
});
