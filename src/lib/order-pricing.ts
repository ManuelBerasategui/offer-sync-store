/**
 * Precios de un pedido calculados en el servidor (Mercado Pago y transferencia).
 *
 * Regla: el precio que manda el navegador NUNCA se usa para cobrar. Cada ítem se identifica en la
 * base (producto + variante, combo o camiseta) y se le calcula el precio con la misma lógica que la
 * tienda. Si un ítem no se puede identificar o su precio no se puede calcular, el pedido se rechaza.
 */
import {
  blackviewUnitPrice,
  calcJerseyUnitPrice,
  categoryDiscountForUnits,
  checkCategoryMins,
  comboUnitPrice,
  findComboByName,
  findProduct,
  findRuleForCat,
  isBlackviewGlasses,
  isCamiseta,
  isLongSleeve,
  isNfcGoogle,
  isSuplemento,
  moqGroupOf,
  normCat,
  parseCategoryRules,
  parseJerseyItem,
  SUPLEMENTOS_MIN,
  unitPriceFor,
  variantBasePrice,
  type Product,
} from "./store";

export type PricedItem = {
  nombre: string;
  qty: number;
  unitPrice: number;
  productId?: string | undefined;
  variantId?: string | undefined;
};

type RawItem = {
  nombre: string;
  qty: number;
  unitPrice?: number | undefined;
  productId?: string | undefined;
  variantId?: string | undefined;
};

const PRODUCT_COLUMNS =
  "id,nombre,categoria,precio,precio_usd,precio_base,moneda_base,precio_oferta,precio_oferta_usd,precio_oferta_base,moneda_oferta_base,oferta,stock,descuento,metadata";

const RELOAD_MSG =
  "Recargá la página y volvé a armar el carrito. Si sigue pasando, escribinos por WhatsApp.";

const normName = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Nombre que queda guardado en el pedido. Si el ítem es un producto de la base, el nombre del
 * navegador tiene que contener el del producto (le puede agregar talle, color o versión); si no,
 * se guarda el nombre real, para que nadie vea un pedido con un nombre engañoso.
 */
function orderItemName(clientName: string, prod: Product | undefined): string {
  if (!prod?.nombre) return clientName;
  return normName(clientName).includes(normName(prod.nombre)) ? clientName : prod.nombre;
}

export async function priceOrderItems(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabaseAdmin: any,
  rawItems: RawItem[],
): Promise<{
  validatedItems: PricedItem[];
  total: number;
  config: Record<string, string>;
  error?: string;
}> {
  const fail = (error: string) => ({ validatedItems: [], total: 0, config: {}, error });
  try {
    const [productsRes, variantsRes, bannersRes, configRes] = await Promise.all([
      supabaseAdmin.from("products").select(PRODUCT_COLUMNS),
      supabaseAdmin.from("product_variants").select("id,product_id,precio,stock"),
      supabaseAdmin
        .from("banners")
        .select("titulo,precio,quantity_tiers,link,activo")
        .eq("activo", "SI"),
      supabaseAdmin.from("site_config").select("clave,valor"),
    ]);

    const dbProducts = (productsRes?.data ?? []) as Product[];
    if (productsRes?.error || dbProducts.length === 0) {
      return fail("No se pudieron obtener los productos. Probá de nuevo en unos minutos.");
    }
    // Las variantes y los combos son opcionales: si la tabla falla, esos ítems se rechazan más abajo
    const dbVariants = (variantsRes?.data ?? []) as {
      id: string;
      product_id: string;
      precio: unknown;
    }[];
    const dbBanners = (bannersRes?.data ?? []) as {
      titulo?: string;
      precio?: unknown;
      quantity_tiers?: unknown;
      link?: unknown;
    }[];

    const config: Record<string, string> = {};
    for (const row of configRes?.data ?? []) {
      if (row.clave && row.valor !== undefined && row.valor !== null)
        config[row.clave] = String(row.valor);
    }
    const catRules = parseCategoryRules(config);
    const usdRate = Number(config["dolar_cotizacion"] ?? 0);

    const resolve = (item: RawItem) => {
      const prod =
        (item.productId ? findProduct(dbProducts, item.productId) : undefined) ??
        findProduct(dbProducts, item.nombre);
      const variant =
        prod && item.variantId
          ? dbVariants.find(
              (v) => String(v.id) === item.variantId && String(v.product_id) === String(prod.id),
            )
          : undefined;
      return { prod, variant };
    };

    // Unidades por categoría (descuentos por cantidad que se calculan sobre el total de la categoría)
    const catTotals: Record<string, number> = {};
    for (const item of rawItems) {
      const { prod } = resolve(item);
      if (!prod) continue;
      if (isNfcGoogle(prod.nombre) || isBlackviewGlasses(prod.nombre)) continue;
      const catNorm = normCat(prod.categoria ?? "");
      if (!catNorm) continue;
      const key = findRuleForCat(catNorm, catRules)?.key ?? catNorm;
      catTotals[key] = (catTotals[key] ?? 0) + item.qty;
    }

    const totalJerseyUnits = rawItems
      .filter((i) => {
        const { prod } = resolve(i);
        return prod ? isCamiseta(prod.categoria, prod.nombre) : isCamiseta(undefined, i.nombre);
      })
      .reduce((sum, i) => sum + i.qty, 0);

    const validatedItems: PricedItem[] = [];
    for (const item of rawItems) {
      const { prod, variant } = resolve(item);
      const ids = {
        ...(item.productId ? { productId: item.productId } : {}),
        ...(item.variantId ? { variantId: item.variantId } : {}),
      };
      let unitPrice = 0;

      // El tipo de precio sale SIEMPRE del producto de la base. El nombre que manda el navegador solo
      // se usa cuando no hay producto (combos, o camisetas sin id): si no, alguien podía renombrar un
      // producto caro como "camiseta" o "blackview" y pagarlo a ese precio.
      const isJersey = prod
        ? isCamiseta(prod.categoria, prod.nombre)
        : isCamiseta(undefined, item.nombre);
      if (isJersey) {
        // Camisetas: tramos mayoristas en ARS según el total de camisetas del pedido
        const { version, isExtraSize, badge } = parseJerseyItem(item);
        unitPrice = calcJerseyUnitPrice({
          qty: Math.max(item.qty, totalJerseyUnits),
          version,
          isExtraSize,
          badge,
          usdRate,
          isLongSleeve: prod ? isLongSleeve(prod.nombre) : isLongSleeve(item.nombre),
        }).unitArs;
      } else if (prod) {
        const base = variantBasePrice(prod, variant ?? null);
        if (isBlackviewGlasses(prod.nombre)) {
          // Blackview BV100: precio fijo desde 3 unidades, sin otros descuentos
          unitPrice = blackviewUnitPrice(base, item.qty, usdRate);
        } else if (isNfcGoogle(prod.nombre)) {
          // NFC Google: sin descuento por cantidad
          unitPrice = base;
        } else {
          const catNorm = normCat(prod.categoria ?? "");
          const match = catNorm ? findRuleForCat(catNorm, catRules) : undefined;
          if (match?.rule.discountTiers?.length) {
            const percent = categoryDiscountForUnits(
              match.rule.discountTiers,
              catTotals[match.key] ?? 0,
            );
            unitPrice = Math.round(base * (1 - percent / 100));
          } else {
            unitPrice = Math.round(unitPriceFor(prod, item.qty, base));
          }
        }
      } else {
        // Combos: se identifican por el título y se cobran con sus tramos por cantidad
        const combo = findComboByName(dbBanners, item.nombre);
        if (combo) unitPrice = comboUnitPrice(combo, item.qty);
      }

      if (!(unitPrice > 0)) {
        console.error("[order-pricing] ítem sin precio válido:", item.nombre, ids);
        return fail(`No pudimos verificar el precio de "${item.nombre}". ${RELOAD_MSG}`);
      }
      validatedItems.push({
        nombre: orderItemName(item.nombre, prod),
        qty: item.qty,
        unitPrice: Math.round(unitPrice),
        ...ids,
      });
    }

    // Mínimos por categoría, calculados con los precios del servidor
    const itemsWithCat = rawItems.map((item, idx) => {
      const { prod } = resolve(item);
      return {
        nombre: prod?.nombre ?? item.nombre,
        categoria: prod?.categoria ?? "",
        moq_group: prod ? (moqGroupOf(prod as Record<string, unknown>) ?? undefined) : undefined,
        qty: item.qty,
        unitPrice: validatedItems[idx]!.unitPrice,
      };
    });
    const violation = checkCategoryMins(itemsWithCat, catRules)[0];
    if (violation) {
      return fail(
        violation.type === "amount"
          ? `No se cumple el mínimo de compra para ${violation.category} ($${violation.min.toLocaleString("es-AR")}).`
          : `No se cumple el mínimo de compra para ${violation.category} (${violation.min} unidades).`,
      );
    }

    const minSuplementos = catRules[normCat("Suplementos")]?.minAmount || SUPLEMENTOS_MIN;
    const supTotal = validatedItems
      .filter((i, idx) => isSuplemento(resolve(rawItems[idx]!).prod?.categoria, i.nombre))
      .reduce((a, i) => a + i.qty * i.unitPrice, 0);
    if (supTotal > 0 && supTotal < minSuplementos) {
      return fail(
        `No se cumple el mínimo de compra para Suplementos ($${minSuplementos.toLocaleString("es-AR")}).`,
      );
    }

    const total = validatedItems.reduce((a, i) => a + i.qty * i.unitPrice, 0);
    return { validatedItems, total, config };
  } catch (err) {
    // Ante cualquier error, rechazar: nunca cobrar con los precios del navegador
    console.error("[order-pricing] error al calcular precios:", err);
    return fail(`No pudimos calcular los precios de tu pedido. ${RELOAD_MSG}`);
  }
}
