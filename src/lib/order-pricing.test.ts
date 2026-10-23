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

describe("priceOrderItems — nombres adulterados", () => {
  const rows: Rows = {
    ...baseRows,
    products: [
      { id: "caro", nombre: "Notebook Pro", categoria: "Varios", precio: "2500000", oferta: "NO" },
    ],
  };

  for (const nombre of [
    "Notebook Pro (sin camiseta)",
    "Notebook Pro blackview bv100",
    "Notebook Pro llavero nfc google",
  ]) {
    it(`cobra el precio real aunque el nombre diga otra cosa: "${nombre}"`, async () => {
      const res = await priceOrderItems(fakeSupabase(rows), [
        { nombre, qty: 1, unitPrice: 1, productId: "caro" },
      ]);
      expect(res.error).toBeUndefined();
      expect(res.validatedItems[0]!.unitPrice).toBe(2500000);
    });
  }

  it("guarda el nombre armado en el servidor, no el texto del navegador", async () => {
    const res = await priceOrderItems(fakeSupabase(rows), [
      { nombre: "Llavero barato", qty: 1, unitPrice: 1, productId: "caro" },
    ]);
    expect(res.validatedItems[0]!.nombre).toBe("Notebook Pro");
    // Sin variante, el color escrito a mano no se guarda (se cobraría el precio base)
    const sinVariante = await priceOrderItems(fakeSupabase(rows), [
      { nombre: "Notebook Pro Gris", qty: 1, unitPrice: 1, productId: "caro" },
    ]);
    expect(sinVariante.validatedItems[0]!.nombre).toBe("Notebook Pro");
  });

  it("las camisetas reales se siguen cobrando con su escala", async () => {
    const jersey: Rows = {
      ...baseRows,
      products: [
        { id: "cam", nombre: "Camiseta Boca", categoria: "Camisetas", precio: "1", oferta: "NO" },
      ],
    };
    const res = await priceOrderItems(fakeSupabase(jersey), [
      {
        nombre: "Camiseta Boca (Talle: M - Versión Fan (Sin personalizar) - Con Parche)",
        qty: 10,
        unitPrice: 1,
        productId: "cam",
      },
    ]);
    expect(res.error).toBeUndefined();
    // 18.5 USD * 1.07 * 1500 + parche (1 * 1.07 * 1500)
    expect(res.validatedItems[0]!.unitPrice).toBe(
      Math.round(18.5 * 1.07 * 1500) + Math.round(1.07 * 1500),
    );
  });
});

describe("priceOrderItems — disponibilidad, variantes, talles y camisetas", () => {
  const rows: Rows = {
    ...baseRows,
    products: [
      {
        id: "par",
        nombre: "Parlante Negro",
        categoria: "Varios",
        precio: "20000",
        oferta: "NO",
        stock: "SI",
        color_predeterminado: "Negro",
        metadata: { talles_disponibles: "M,L", talles_color_rojo: "S" },
      },
      { id: "agot", nombre: "Auricular", categoria: "Varios", precio: "9000", stock: "NO" },
      { id: "elec", nombre: "Pava", categoria: "Electrodomésticos", precio: "9000", stock: "SI" },
      {
        id: "wa",
        nombre: "Vaper X",
        categoria: "Varios",
        precio: "9000",
        stock: "SI",
        metadata: { whatsapp_only_reason: "whatsapp_only" },
      },
      {
        id: "cam",
        nombre: "Camiseta River",
        categoria: "Camisetas",
        precio: "1",
        stock: "SI",
        metadata: { source: "yupoo" },
      },
    ],
    product_variants: [
      { id: "vr", product_id: "par", precio: "25000", stock: "SI", color: "Rojo" },
      { id: "vx", product_id: "par", precio: "25000", stock: "NO", color: "Azul" },
    ],
  };
  const one = (item: Record<string, unknown>) =>
    priceOrderItems(fakeSupabase(rows), [{ qty: 1, unitPrice: 1, ...item } as never]);

  it("arma el nombre con el color de la variante (aunque el producto tenga el color por defecto en el nombre)", async () => {
    const res = await one({
      nombre: "Parlante Rojo (Talle: S)",
      productId: "par",
      variantId: "vr",
    });
    expect(res.error).toBeUndefined();
    expect(res.validatedItems[0]!.nombre).toBe("Parlante Rojo (Talle: S)");
    expect(res.validatedItems[0]!.unitPrice).toBe(25000);
  });

  it("el color por defecto (variante sin id real) se cobra al precio base", async () => {
    const res = await one({
      nombre: "Parlante Negro (Talle: L)",
      productId: "par",
      variantId: "default_base",
    });
    expect(res.validatedItems[0]!.nombre).toBe("Parlante Negro (Talle: L)");
    expect(res.validatedItems[0]!.unitPrice).toBe(20000);
  });

  it("rechaza un talle que el producto no tiene", async () => {
    const res = await one({ nombre: "Parlante Negro (Talle: XXL)", productId: "par" });
    expect(res.error).toMatch(/talle/i);
  });

  it("rechaza productos sin stock, variantes sin stock, categorías ocultas y solo WhatsApp", async () => {
    expect((await one({ nombre: "Auricular", productId: "agot" })).error).toMatch(
      /no está disponible/,
    );
    expect(
      (await one({ nombre: "Parlante Azul", productId: "par", variantId: "vx" })).error,
    ).toMatch(/no está disponible/);
    expect((await one({ nombre: "Pava", productId: "elec" })).error).toMatch(/no está disponible/);
    expect((await one({ nombre: "Vaper X", productId: "wa" })).error).toMatch(/no está disponible/);
  });

  it("camisetas de Yupoo se pueden comprar; el nombre refleja lo que se cobra", async () => {
    const res = await priceOrderItems(fakeSupabase(rows), [
      {
        nombre: "Camiseta River (Talle: 3XL - Versión Fan (Sin personalizar) - Con Parche)",
        qty: 10,
        unitPrice: 1,
        productId: "cam",
      },
    ]);
    expect(res.error).toBeUndefined();
    expect(res.validatedItems[0]!.nombre).toBe(
      "Camiseta River (Talle: 3XL - Versión Fan (Sin personalizar) - Con Parche)",
    );
  });

  it("camiseta con talle inventado (XXXL) o texto libre: se rechaza o se guarda lo que se cobra", async () => {
    const xxxl = await priceOrderItems(fakeSupabase(rows), [
      {
        nombre: "Camiseta River (Talle: XXXL - Versión Fan)",
        qty: 10,
        unitPrice: 1,
        productId: "cam",
      },
    ]);
    expect(xxxl.error).toMatch(/talle/i);
    const libre = await priceOrderItems(fakeSupabase(rows), [
      {
        nombre:
          "Camiseta River (Talle: M - Versión Player c/ Nombre y Número - Parche Libertadores)",
        qty: 10,
        unitPrice: 1,
        productId: "cam",
      },
    ]);
    // Se cobra como Fan sin parche, y eso es lo que queda escrito en el pedido
    expect(libre.validatedItems[0]!.nombre).toBe(
      "Camiseta River (Talle: M - Versión Fan (Sin personalizar))",
    );
  });

  it("los combos quedan con su título real", async () => {
    const res = await priceOrderItems(fakeSupabase(rows), [
      { nombre: "  COMBO premium remeras ", qty: 1, unitPrice: 1 },
    ]);
    expect(res.validatedItems[0]!.nombre).toBe("Combo Premium Remeras");
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
