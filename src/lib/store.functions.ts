import { createServerFn } from "@tanstack/react-start";
import type { Banner, Product, SiteConfig, StoreData } from "./store";

const SHEET_ID = "18YOF7ac4l5hX7LFX5QsnO1eq3zAAmAfQWUfVl_xINhg";
const TABS = { productos: "Productos", banners: "Banners", config: "Config" };

const tabUrl = (tab: string) =>
  `https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(tab)}`;

async function fetchTab<T>(tab: string): Promise<T[]> {
  try {
    const res = await fetch(tabUrl(tab), { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`${tab}: HTTP ${res.status}`);
    const rows = (await res.json()) as T[];
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error("No se pudo leer la planilla", tab, error);
    return [];
  }
}

const hasValue = (row: Record<string, unknown>) =>
  Object.values(row).some((v) => String(v ?? "").trim() !== "");

/** Descarta la fila de "Notas" que viene al final de cada pestaña. */
const isNote = (v?: string) => /^notas?\s*:/i.test(String(v ?? "").trim());

export const getStoreData = createServerFn({ method: "GET" }).handler(
  async (): Promise<StoreData> => {
    const [productsRaw, bannersRaw, configRaw] = await Promise.all([
      fetchTab<Product>(TABS.productos),
      fetchTab<Banner>(TABS.banners),
      fetchTab<{ clave?: string; valor?: string }>(TABS.config),
    ]);

    const products = productsRaw.filter(
      (p) =>
        hasValue(p as Record<string, unknown>) &&
        !isNote(p.id) &&
        String(p.nombre ?? "").trim() !== "" &&
        String(p.stock ?? "SI").trim().toUpperCase() !== "NO",
    );

    const banners = bannersRaw.filter(
      (b) =>
        hasValue(b as Record<string, unknown>) &&
        !isNote(b.titulo) &&
        String(b.titulo ?? "").trim() !== "" &&
        String(b.activo ?? "SI").trim().toUpperCase() !== "NO",
    );

    const config: SiteConfig = {};
    for (const row of configRaw) {
      const key = String(row.clave ?? "").trim();
      const value = String(row.valor ?? "").trim();
      if (key && !isNote(key)) config[key] = value;
    }

    return { products, banners, config };
  },
);
