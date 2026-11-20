import { describe, it, expect } from "vitest";
import {
  curvaLabel,
  curvaSelectorOptions,
  curvaSelectorUnitsOf,
  discountFor,
  fotoCodigo,
  modeloItemName,
  requestedModeloCodigo,
  roundUpToCurva,
  tiersOf,
  type Product,
} from "./store";
import { isStoreStorageImage } from "./mallas.functions";

const mallasMeta = {
  selector_curva: "SI",
  moq_min_units: "6",
  qty_discount_mode: "custom",
  "12 unidades": "13.3333333333%",
  "36 unidades": "20.0000000000%",
};

describe("tramos por cantidad", () => {
  it("el servidor (fila cruda con metadata) calcula igual que la tienda (metadata aplanado)", () => {
    const crudo = {
      nombre: "Mallas",
      precio: "15000",
      descuento: "SI",
      metadata: mallasMeta,
    } as unknown as Product;
    const aplanado = {
      nombre: "Mallas",
      precio: "15000",
      descuento: "SI",
      ...mallasMeta,
    } as unknown as Product;
    expect(tiersOf(crudo)).toEqual(tiersOf(aplanado));
    expect(Math.round(15000 * (1 - discountFor(crudo, 12) / 100))).toBe(13000);
    expect(Math.round(15000 * (1 - discountFor(crudo, 36) / 100))).toBe(12000);
    expect(discountFor(crudo, 6)).toBe(0);
  });

  it("si el tramo está arriba y en metadata no se duplica", () => {
    const p = {
      nombre: "X",
      descuento: "SI",
      "5 unidades": "5%",
      metadata: { "5 unidades": "9%" },
    } as unknown as Product;
    expect(tiersOf(p)).toEqual([{ units: 5, percent: 5 }]);
  });
});

describe("selector de curva", () => {
  it("solo aplica con selector_curva = SI y usa el mínimo propio como curva", () => {
    expect(curvaSelectorUnitsOf({ metadata: mallasMeta })).toBe(6);
    expect(curvaSelectorUnitsOf({ selector_curva: "SI", moq_min_units: "6" })).toBe(6);
    expect(curvaSelectorUnitsOf({ metadata: { moq_min_units: "6" } })).toBeNull();
  });

  it("opciones: la curva y los tramos múltiplos de ella", () => {
    const tiers = [
      { units: 12, percent: 10 },
      { units: 20, percent: 12 },
      { units: 36, percent: 20 },
    ];
    expect(curvaSelectorOptions(6, tiers)).toEqual([6, 12, 36]);
  });

  it("etiquetas en docenas", () => {
    expect(curvaLabel(6)).toBe("½ docena");
    expect(curvaLabel(12)).toBe("1 docena");
    expect(curvaLabel(36)).toBe("3 docenas");
    expect(curvaLabel(10)).toBe("10 unidades");
  });

  it("redondea hacia arriba a curvas completas", () => {
    expect(roundUpToCurva(1, 6)).toBe(6);
    expect(roundUpToCurva(7, 6)).toBe(12);
    expect(roundUpToCurva(12, 6)).toBe(12);
    expect(roundUpToCurva(0, 6)).toBe(6);
  });
});

describe("modelo elegido por foto", () => {
  const url =
    "https://abc.supabase.co/storage/v1/object/public/storage-images/products/ce58b101-eeca-4c61-91ac-28c9ed8e7130.webp";

  it("código fijo de la foto y ida y vuelta por el nombre del ítem", () => {
    expect(fotoCodigo(url)).toBe("ce58b101");
    const nombre = modeloItemName("Mallas", 5, fotoCodigo(url));
    expect(nombre).toBe("Mallas — Modelo 5 (Cód: ce58b101)");
    expect(requestedModeloCodigo(nombre)).toBe("ce58b101");
    expect(requestedModeloCodigo("Mallas")).toBeNull();
  });

  it("el panel solo acepta fotos del Storage de la tienda", () => {
    expect(isStoreStorageImage(url)).toBe(true);
    expect(
      isStoreStorageImage("https://evil.com/storage/v1/object/public/storage-images/a.webp"),
    ).toBe(false);
    expect(
      isStoreStorageImage("http://abc.supabase.co/storage/v1/object/public/storage-images/a.webp"),
    ).toBe(false);
    expect(
      isStoreStorageImage("https://abc.supabase.co/storage/v1/object/public/otro-bucket/a.webp"),
    ).toBe(false);
    expect(
      isStoreStorageImage(
        "https://abc.supabase.co/storage/v1/object/public/storage-images/../x.webp",
      ),
    ).toBe(false);
    expect(isStoreStorageImage("javascript:alert(1)")).toBe(false);
    expect(isStoreStorageImage(42)).toBe(false);
  });
});

describe("descuento por transferencia", () => {
  it("las mallas (curva con selector) no lo llevan", async () => {
    const { hasTransferDiscount, transferTotal } = await import("./store");
    expect(hasTransferDiscount({ metadata: mallasMeta })).toBe(false);
    expect(hasTransferDiscount({ nombre: "Parlante" })).toBe(true);
    expect(hasTransferDiscount(undefined)).toBe(true);
    expect(transferTotal(10000, 10000, 7)).toBe(10000);
    expect(transferTotal(10000, 0, 7)).toBe(9300);
  });
});
