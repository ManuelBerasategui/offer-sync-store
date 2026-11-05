/**
 * Condiciones comerciales que acompañan a cada cotización de la calculadora:
 * seña, plazos, factura, qué no incluye y qué pasa ante demoras o controles de aduana.
 * Se editan desde el panel (site_config, claves `calc_cond_*`) y tienen valores por defecto.
 */

export type QuoteTerms = {
  /** Porcentaje del total que se paga para confirmar el pedido (0–100). */
  senaPct: number;
  /** Cuándo se paga el resto. */
  saldoCuando: string;
  plazoAereo: string;
  plazoMaritimo: string;
  factura: string;
  /** Días hábiles de validez de la cotización. */
  validezDias: number;
  /** Un ítem por renglón. */
  incluye: string[];
  /** Un ítem por renglón. */
  noIncluye: string[];
  demoras: string;
};

export const QUOTE_TERMS_KEYS = {
  senaPct: "calc_cond_sena_pct",
  saldoCuando: "calc_cond_saldo_cuando",
  plazoAereo: "calc_cond_plazo_aereo",
  plazoMaritimo: "calc_cond_plazo_maritimo",
  factura: "calc_cond_factura",
  validezDias: "calc_cond_validez_dias",
  incluye: "calc_cond_incluye",
  noIncluye: "calc_cond_no_incluye",
  demoras: "calc_cond_demoras",
} as const;

export const QUOTE_TERMS_LIMITS = { short: 120, long: 400, noIncluyeItems: 6 } as const;

export const DEFAULT_QUOTE_TERMS: QuoteTerms = {
  senaPct: 50,
  saldoCuando: "cuando la mercadería llega a Argentina, antes de la entrega",
  plazoAereo: "25 a 40 días",
  plazoMaritimo: "60 a 90 días",
  factura:
    "Te entregamos el comprobante de pago y el detalle de la operación. Si necesitás factura, avisanos antes de confirmar.",
  validezDias: 15,
  incluye: [
    "Búsqueda del proveedor y negociación del precio",
    "Flete internacional hasta Argentina",
    "Impuestos, gestión de aduana y liberación",
    "Seguimiento del pedido hasta la entrega",
  ],
  noIncluye: [
    "Envío desde Rosario hasta tu domicilio (se cotiza según destino)",
    "Certificaciones o permisos especiales, si el producto los requiere",
  ],
  demoras:
    "Si hay demora en el flete o la aduana pide un control, te avisamos al momento con el nuevo plazo y lo gestionamos nosotros. Si un organismo exige un costo extra, te lo informamos antes de pagarlo.",
};

function cleanText(v: unknown, max: number): string {
  // Caracteres de control (tabs, saltos, etc.) → espacio, sin regex de control.
  const noControl = Array.from(String(v ?? ""), (ch) => {
    const code = ch.charCodeAt(0);
    return code < 32 || code === 127 ? " " : ch;
  }).join("");
  return noControl
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function clampValidezDias(v: unknown, fallback = DEFAULT_QUOTE_TERMS.validezDias): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1 || String(v ?? "").trim() === "") return fallback;
  return Math.min(90, Math.round(n));
}

/** Suma días hábiles (lunes a viernes) a una fecha. */
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from);
  let left = Math.max(0, Math.floor(days));
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return d;
}

export function parseNoIncluye(v: unknown): string[] {
  return String(v ?? "")
    .split(/\r?\n/)
    .map((line) => cleanText(line, QUOTE_TERMS_LIMITS.short))
    .filter(Boolean)
    .slice(0, QUOTE_TERMS_LIMITS.noIncluyeItems);
}

export function clampSenaPct(v: unknown, fallback = DEFAULT_QUOTE_TERMS.senaPct): number {
  const n = Number(v);
  if (!Number.isFinite(n) || String(v ?? "").trim() === "") return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** Lee las condiciones de site_config; cualquier valor vacío o inválido cae al valor por defecto. */
export function readQuoteTerms(config: Record<string, string | undefined>): QuoteTerms {
  const d = DEFAULT_QUOTE_TERMS;
  const { short, long } = QUOTE_TERMS_LIMITS;
  const noIncluye = parseNoIncluye(config[QUOTE_TERMS_KEYS.noIncluye]);
  const incluye = parseNoIncluye(config[QUOTE_TERMS_KEYS.incluye]);
  return {
    senaPct: clampSenaPct(config[QUOTE_TERMS_KEYS.senaPct]),
    validezDias: clampValidezDias(config[QUOTE_TERMS_KEYS.validezDias]),
    incluye: incluye.length ? incluye : d.incluye,
    saldoCuando: cleanText(config[QUOTE_TERMS_KEYS.saldoCuando], short) || d.saldoCuando,
    plazoAereo: cleanText(config[QUOTE_TERMS_KEYS.plazoAereo], short) || d.plazoAereo,
    plazoMaritimo: cleanText(config[QUOTE_TERMS_KEYS.plazoMaritimo], short) || d.plazoMaritimo,
    factura: cleanText(config[QUOTE_TERMS_KEYS.factura], long) || d.factura,
    noIncluye: noIncluye.length ? noIncluye : d.noIncluye,
    demoras: cleanText(config[QUOTE_TERMS_KEYS.demoras], long) || d.demoras,
  };
}

/** Normaliza lo que manda el panel antes de guardarlo (mismo saneado que la lectura). */
export function toQuoteTermsRows(input: Partial<Record<keyof QuoteTerms, unknown>>) {
  const { short, long } = QUOTE_TERMS_LIMITS;
  const lines = (v: unknown) =>
    parseNoIncluye(Array.isArray(v) ? v.join("\n") : String(v ?? "")).join("\n");
  return [
    { clave: QUOTE_TERMS_KEYS.senaPct, valor: String(clampSenaPct(input.senaPct)) },
    { clave: QUOTE_TERMS_KEYS.saldoCuando, valor: cleanText(input.saldoCuando, short) },
    { clave: QUOTE_TERMS_KEYS.plazoAereo, valor: cleanText(input.plazoAereo, short) },
    { clave: QUOTE_TERMS_KEYS.plazoMaritimo, valor: cleanText(input.plazoMaritimo, short) },
    { clave: QUOTE_TERMS_KEYS.factura, valor: cleanText(input.factura, long) },
    { clave: QUOTE_TERMS_KEYS.validezDias, valor: String(clampValidezDias(input.validezDias)) },
    { clave: QUOTE_TERMS_KEYS.incluye, valor: lines(input.incluye) },
    { clave: QUOTE_TERMS_KEYS.noIncluye, valor: lines(input.noIncluye) },
    { clave: QUOTE_TERMS_KEYS.demoras, valor: cleanText(input.demoras, long) },
  ];
}

/** Seña y saldo en USD, redondeados a centavos y sumando exactamente el total. */
export function splitPayment(total: number, senaPct: number) {
  const sena = Math.round(total * senaPct) / 100;
  const saldo = Math.round((total - sena) * 100) / 100;
  return { sena, saldo };
}

/**
 * Honorarios de TE.IMPORTAMOS: un % del valor de la mercadería (FOB) con tope.
 * Con 10% y tope US$ 250, a partir de US$ 2.500 de mercadería se cobra el fijo de 250.
 */
export function calcHonorarios(fob: number, pct: number, tope: number): number {
  const safeFob = Number.isFinite(fob) && fob > 0 ? fob : 0;
  const safePct = Number.isFinite(pct) && pct > 0 ? pct : 0;
  const byPct = Math.round(safeFob * safePct) / 100;
  return Number.isFinite(tope) && tope > 0 ? Math.min(byPct, tope) : byPct;
}
