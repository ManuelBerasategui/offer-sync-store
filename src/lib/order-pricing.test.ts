import { describe, expect, it } from "vitest";
import { priceOrderItems } from "./order-pricing";

type Rows = Record<string, unknown[]>;

/** Cliente de Supabase falso: from(tabla).select(...).eq(...) devuelve las filas de esa tabla. */
function fakeSupabase(rows: Rows, failTable?: string) {
  return {
    from(table: string) {
      const result =
        table === failTable
          ? { data: null, error: { message: "boom" } }
          : { data: rows[table] ?? [], error: null };
      const q = {
        select: () => q,
        eq: () => q,
        then: (resolve: (v: unknown) => unknown) => resolve(result),
      };
      return q;
    },
  };
}

const baseRows: Rows = {
  products: [
    {
      id: "p1",
      nombre: "Parlante JBL",
      categoria: "Varios",
      precio: "20000",
      oferta: "NO",
      stock: "SI",
    },
    {
      id: "p2",
      nombre: "Mate Imperial",
      categoria: "Bazar",
      precio: "10000",
      oferta: "NO",
      stock: "SI",
    },
  ],
  product_variants: [{ id: "v1", product_id: "p1", precio: "25000", stock: "SI" }],
  banners: [
    {
      titulo: "Combo Premium Remeras",
      precio: "60000",
      quantity_tiers: [{ units: 3, price: 55000 }],
      activo: "SI",
    },
  ],
  site_config: [{ clave: "dolar_cotizacion", valor: "1500" }],
};

describe("priceOrderItems", () => {
  it("cobra el combo con el precio de la base, aunque el navegador mande $1", async () => {
    const res = await priceOrderItems(fakeSupabase(baseRows), [
      { nombre: "Combo Premium Remeras", qty: 1, unitPrice: 1 },
    ]);
    expect(res.error).toBeUndefined();
    expect(res.validatedItems[0]!.unitPrice).toBe(60000);
    expect(res.total).toBe(60000);
  });

  it("aplica el tramo por cantidad del combo", async () => {
    const res = await priceOrderItems(fakeSupabase(baseRows), [
      { nombre: "combo premium remeras", qty: 3, unitPrice: 1 },
    ]);
    expect(res.validatedItems[0]!.unitPrice).toBe(55000);
  });

  it("rechaza un ítem que no existe (no usa el precio del navegador)", async () => {
    const res = await priceOrderItems(fakeSupabase(baseRows), [
      { nombre: "Producto inventado", qty: 1, unitPrice: 1 },
    ]);
    expect(res.error).toMatch(/No pudimos verificar el precio/);
    expect(res.validatedItems).toHaveLength(0);
  });

  it("ignora el precio adulterado de un producto", async () => {
    const res = await priceOrderItems(fakeSupabase(baseRows), [
      { nombre: "Parlante JBL", qty: 1, unitPrice: 1, productId: "p1" },
    ]);
    expect(res.validatedItems[0]!.unitPrice).toBe(20000);
  });

  it("encuentra el producto por ID aunque el nombre tenga el color agregado", async () => {
    const res = await priceOrderItems(fakeSupabase(baseRows), [
      { nombre: "Parlante JBL Rojo (Talle: M)", qty: 1, unitPrice: 1, productId: "p1" },
    ]);
    expect(res.error).toBeUndefined();
    expect(res.validatedItems[0]!.unitPrice).toBe(20000);
  });

  it("usa el precio propio de la variante", async () => {
    const res = await priceOrderItems(fakeSupabase(baseRows), [
      { nombre: "Parlante JBL Azul", qty: 1, unitPrice: 1, productId: "p1", variantId: "v1" },
    ]);
    expect(res.validatedItems[0]!.unitPrice).toBe(25000);
  });

  it("si falla la base de datos, rechaza en lugar de aceptar los precios del navegador", async () => {
    const res = await priceOrderItems(fakeSupabase(baseRows, "products"), [
      { nombre: "Parlante JBL", qty: 1, unitPrice: 1, productId: "p1" },
    ]);
    expect(res.error).toBeTruthy();
    expect(res.validatedItems).toHaveLength(0);
  });

  it("suma varios ítems con los precios del servidor", async () => {
    const res = await priceOrderItems(fakeSupabase(baseRows), [
      { nombre: "Parlante JBL", qty: 2, unitPrice: 1, productId: "p1" },
      { nombre: "Combo Premium Remeras", qty: 1, unitPrice: 1 },
    ]);
    expect(res.error).toBeUndefined();
    expect(res.total).toBe(res.validatedItems[0]!.unitPrice * 2 + 60000);
    expect(res.validatedItems[0]!.unitPrice).toBeGreaterThan(1);
  });
});

describe("priceOrderItems — mínimos por categoría", () => {
  it("sigue exigiendo el mínimo de la categoría con los precios del servidor", async () => {
    const rows: Rows = {
      ...baseRows,
      products: [
        { id: "t1", nombre: "Auriculares", categoria: "Tecnología", precio: "15000", oferta: "NO" },
      ],
    };
    const res = await priceOrderItems(fakeSupabase(rows), [
      { nombre: "Auriculares", qty: 1, unitPrice: 1, productId: "t1" },
    ]);
    expect(res.error).toMatch(/mínimo de compra/);
  });
});
