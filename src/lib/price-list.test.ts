import { describe, expect, it } from "vitest";
import { priceListTiers, priceListUnitPrice } from "./product-gallery";

const mallas = {
  metadata: {
    price_list:
      "1/2 Docena x $15.000 C/u\n1 Docena x $13.000 C/u\n3 Docenas x $12.000 C/u\n5 Docenas x $11.500 C/u\n10 Docenas x $11.000 C/u\n20 Docenas x $10.500 C/u",
  },
};

describe("lista de precios de las mallas", () => {
  it("lee los tramos de la lista tal cual se escriben", () => {
    expect(priceListTiers(mallas)).toEqual([
      { units: 6, price: 15000 },
      { units: 12, price: 13000 },
      { units: 36, price: 12000 },
      { units: 60, price: 11500 },
      { units: 120, price: 11000 },
      { units: 240, price: 10500 },
    ]);
  });

  it("cada curva cobra exactamente el precio de la lista", () => {
    expect(priceListUnitPrice(mallas, 6)).toBe(15000);
    expect(priceListUnitPrice(mallas, 12)).toBe(13000);
    expect(priceListUnitPrice(mallas, 18)).toBe(13000);
    expect(priceListUnitPrice(mallas, 36)).toBe(12000);
    expect(priceListUnitPrice(mallas, 60)).toBe(11500);
    expect(priceListUnitPrice(mallas, 120)).toBe(11000);
    expect(priceListUnitPrice(mallas, 300)).toBe(10500);
  });

  it("otros formatos y renglones que no son precios", () => {
    const p = { price_list: "Precios mayoristas:\n6 unidades x $15000\n12 u. a $ 13.000,00 c/u\nEnvíos a todo el país" };
    expect(priceListTiers(p)).toEqual([
      { units: 6, price: 15000 },
      { units: 12, price: 13000 },
    ]);
    expect(priceListUnitPrice({ nombre: "sin lista" }, 6)).toBeNull();
  });
});
