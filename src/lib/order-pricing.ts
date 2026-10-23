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
  allowedTallesFor,
  isBlackviewGlasses,
  isCamiseta,
  isHiddenCategory,
  isLongSleeve,
  isNfcGoogle,
  isSuplemento,
  moqGroupOf,
  normCat,
  parseCategoryRules,
  parseJerseyItem,
  stripTrailingColor,
  SUPLEMENTOS_MIN,
  unitPriceFor,
  variantBasePrice,
  waOnlyReasonOf,
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
  "id,nombre,categoria,precio,precio_usd,precio_base,moneda_base,precio_oferta,precio_oferta_usd,precio_oferta_base,moneda_oferta_base,oferta,stock,descuento,metadata,color_predeterminado";

/** Talles de camiseta que se pueden comprar por la web (los mismos que ofrece la ficha). */
const JERSEY_TALLES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];

type DbVariant = {
  id: string;
  product_id: string;
  precio: unknown;
  stock?: unknown;
  color?: unknown;
};

const RELOAD_MSG =
  "Recargá la página y volvé a armar el carrito. Si sigue pasando, escribinos por WhatsApp.";

const isNo = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toUpperCase() === "NO";

/** Talle pedido en el nombre del ítem, ej. "... (Talle: M)" o "(Talle: M - Versión Fan ...)". */
function requestedTalle(nombre: string): string | null {
  const m = nombre.match(/Talle:\s*([A-Za-z0-9.,/]{1,8})/i);
  return m?.[1] ? m[1].trim() : null;
}

/**
 * Nombre del ítem armado en el servidor, que es el que queda en el pedido y en los emails.
 * Nunca se guarda el texto libre del navegador: con él alguien podía pagar el precio base y que el
 * pedido dijera otro color, otro talle o "con parche". Se arma igual que en la ficha del producto
 * (nombre + color de la variante + talle válido).
 */
function buildItemName(
  item: RawItem,
  prod: Product,
  variant: DbVariant | undefined,
): { nombre: string; error?: string } {
  const prodRec = prod as unknown as Record<string, unknown>;
  const rawDefault = prod.color_predeterminado;
  const defaultColor =
    rawDefault == null || String(rawDefault) === "null" ? "" : String(rawDefault).trim();
  const baseName = defaultColor
    ? stripTrailingColor(prod.nombre ?? "", defaultColor)
    : (prod.nombre ?? "");

  let color = "";
  let nombre = prod.nombre ?? "";
  if (variant?.color) {
    color = String(variant.color).trim();
    nombre = `${baseName} ${color}`.trim();
  } else if (item.variantId === "default_base" && defaultColor) {
    // La ficha ofrece el color por defecto como una "variante" sin id real
    color = defaultColor;
    nombre = `${baseName} ${defaultColor}`.trim();
  }

  const talle = requestedTalle(item.nombre);
  if (talle) {
    const allowed = allowedTallesFor(prodRec, color || null);
    const match = allowed.find((t) => t.toLowerCase() === talle.toLowerCase());
    if (match) nombre = `${nombre} (Talle: ${match})`;
    else if (allowed.length > 0)
      return { nombre, error: `El talle "${talle}" no está disponible.` };
  }
  return { nombre };
}

/** Nombre de una camiseta armado con lo que se cobra (talle, versión y parche). */
function buildJerseyName(
  baseName: string,
  talle: string,
  version: "fan" | "player",
  badge: "yes" | "no",
) {
  const versionText =
    version === "player"
      ? "Versión Jugador (Personalizado Nombre y Número)"
      : "Versión Fan (Sin personalizar)";
  return `${baseName} (Talle: ${talle} - ${versionText}${badge === "yes" ? " - Con Parche" : ""})`;
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
      supabaseAdmin.from("product_variants").select("id,product_id,precio,stock,color"),
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
    const dbVariants = (variantsRes?.data ?? []) as DbVariant[];
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
      // Solo se vende lo que la tienda ofrece: sin stock, categorías ocultas y productos "solo
      // WhatsApp" no se pueden comprar llamando al servidor directo (las camisetas de Yupoo figuran
      // como "solo WhatsApp" pero se compran por la web con su propia ficha)
      if (prod) {
        const unavailable =
          isNo(prod.stock) ||
          (variant && isNo(variant.stock)) ||
          isHiddenCategory(prod.categoria) ||
          (!isJersey && waOnlyReasonOf(prod as unknown as Record<string, unknown>) !== null);
        if (unavailable) {
          return fail(
            `"${prod.nombre ?? item.nombre}" no está disponible para comprar online. ${RELOAD_MSG}`,
          );
        }
      }

      let nombre = item.nombre;
      if (isJersey) {
        // Camisetas: tramos mayoristas en ARS según el total de camisetas del pedido
        const { version, isExtraSize, badge, talle: rawTalle } = parseJerseyItem(item);
        const allowedTalles = prod
          ? allowedTallesFor(prod as unknown as Record<string, unknown>)
          : [];
        const talle = [...JERSEY_TALLES, ...allowedTalles].find(
          (t) => t.toLowerCase() === rawTalle.toLowerCase(),
        );
        if (!talle) {
          return fail(`El talle "${rawTalle}" no está disponible. ${RELOAD_MSG}`);
        }
        const baseName =
          prod?.nombre ?? (item.nombre.split("(Talle")[0] ?? "").trim().slice(0, 120);
        nombre = buildJerseyName(baseName, talle, version, badge);
        unitPrice = calcJerseyUnitPrice({
          qty: Math.max(item.qty, totalJerseyUnits),
          version,
          isExtraSize,
          badge,
          usdRate,
          isLongSleeve: prod ? isLongSleeve(prod.nombre) : isLongSleeve(item.nombre),
        }).unitArs;
      } else if (prod) {
        const built = buildItemName(item, prod, variant);
        if (built.error) return fail(`${built.error} ${RELOAD_MSG}`);
        nombre = built.nombre;
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
        if (combo) {
          unitPrice = comboUnitPrice(combo, item.qty);
          nombre = String(combo.titulo ?? item.nombre).trim();
        }
      }

      if (!(unitPrice > 0)) {
        console.error("[order-pricing] ítem sin precio válido:", item.nombre, ids);
        return fail(`No pudimos verificar el precio de "${item.nombre}". ${RELOAD_MSG}`);
      }
      validatedItems.push({
        nombre,
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
