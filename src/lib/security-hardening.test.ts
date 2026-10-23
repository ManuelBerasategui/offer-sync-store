import { describe, expect, it, vi } from "vitest";
import { scrubUrl } from "./analytics";
import { couponUsedByDni, normalizeEmail } from "./coupon-usage";
import { isSingleEmail } from "./email.functions";
import { confirmMpOrder } from "./mp-confirm.server";
import { decideMpPayment } from "./mp-verify";
import { isDuplicateError, makeOrderCode } from "./order-code";
import { createOrderRecord } from "./order-create.server";
import { isPrivateConfigKey, sanitizeUrl } from "./store";

vi.mock("./email.functions", async (orig) => ({
  ...(await orig<typeof import("./email.functions")>()),
  notifyNewOrder: vi.fn(async () => ({})),
}));

/** Cliente de Supabase falso: cada .from(tabla).<op>() devuelve lo que diga `reply`. */
function fakeDb(
  reply: (table: string, op: string, payload: unknown) => { data?: unknown; error?: unknown },
) {
  const calls: Array<{ table: string; op: string; payload: unknown }> = [];
  const client = {
    calls,
    from(table: string) {
      let op = "select";
      let payload: unknown = null;
      const q: Record<string, unknown> = {};
      const result = () => {
        calls.push({ table, op, payload });
        return Promise.resolve({ data: null, error: null, ...reply(table, op, payload) });
      };
      for (const m of ["select", "eq", "in", "limit"]) q[m] = () => q;
      for (const m of ["insert", "update", "upsert", "delete"]) {
        q[m] = (p: unknown) => {
          op = m;
          payload = p;
          return q;
        };
      }
      q["maybeSingle"] = result;
      q["then"] = (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) =>
        result().then(ok, ko);
      return q;
    },
  };
  return client;
}

describe("isPrivateConfigKey", () => {
  it("oculta claves privadas de site_config", () => {
    for (const k of [
      "resend_api_key",
      "resend_from",
      "last_email_error",
      "coupon_usage_X_a@b.c",
      "promo_cupon_codigo",
      "mp_access_token",
      "algo_secret",
      "OPENAI_API_KEY",
    ]) {
      expect(isPrivateConfigKey(k)).toBe(true);
    }
  });
  it("deja pasar la config pública", () => {
    for (const k of ["dolar_rate", "banner_titulo", "categorias_ocultas", "whatsapp"]) {
      expect(isPrivateConfigKey(k)).toBe(false);
    }
  });
});

describe("sanitizeUrl", () => {
  it("rechaza URLs con caracteres de control o barras invertidas", () => {
    expect(sanitizeUrl("/\t/evil.com")).toBe("#");
    expect(sanitizeUrl("/\\evil.com")).toBe("#");
    expect(sanitizeUrl("java\nscript:alert(1)")).toBe("#");
  });
  it("mantiene rutas internas normales", () => {
    expect(sanitizeUrl("/catalogo?ver=combos")).toBe("/catalogo?ver=combos");
  });
});

describe("normalizeEmail", () => {
  it("unifica alias de Gmail", () => {
    expect(normalizeEmail(" Juan.Perez+promo@GoogleMail.com ")).toBe("juanperez@gmail.com");
    expect(normalizeEmail("ana+x@empresa.com")).toBe("ana@empresa.com");
    expect(normalizeEmail("a.b@empresa.com")).toBe("a.b@empresa.com");
  });
});

describe("couponUsedByDni", () => {
  it("detecta un DNI que ya usó el cupón", async () => {
    const db = fakeDb((t) =>
      t === "orders" ? { data: [{ order_code: "TI-1" }] } : { data: [{ id: "u" }] },
    );
    expect(await couponUsedByDni(db, "TEIMPORTAMOS", "30.123.456")).toBe(true);
  });
  it("no bloquea DNIs sin pedidos con cupón ni DNIs inválidos", async () => {
    const db = fakeDb((t) => (t === "orders" ? { data: [{ order_code: "TI-1" }] } : { data: [] }));
    expect(await couponUsedByDni(db, "TEIMPORTAMOS", "30123456")).toBe(false);
    expect(await couponUsedByDni(db, "TEIMPORTAMOS", "12")).toBe(false);
  });
  it("ante un error de la base, se toma como usado", async () => {
    const db = fakeDb(() => ({ error: { message: "x" } }));
    expect(await couponUsedByDni(db, "TEIMPORTAMOS", "30123456")).toBe(true);
  });
});

describe("isSingleEmail", () => {
  it("acepta un solo destinatario", () => {
    expect(isSingleEmail("cliente@gmail.com")).toBe(true);
    expect(isSingleEmail("a@b.com, c@d.com")).toBe(false);
    expect(isSingleEmail("a@b.com;c@d.com")).toBe(false);
    expect(isSingleEmail('"x" <a@b.com>')).toBe(false);
  });
});

describe("makeOrderCode", () => {
  it("formato TI-AAMMDD-XXXXXXXX sin caracteres confusos", () => {
    const code = makeOrderCode(new Date(2026, 9, 23));
    expect(code).toMatch(/^TI-261023-[2-9A-HJ-NP-Z]{8}$/);
    expect(new Set(Array.from({ length: 200 }, () => makeOrderCode())).size).toBe(200);
    expect(isDuplicateError({ code: "23505" })).toBe(true);
  });
});

describe("scrubUrl", () => {
  it("saca tokens y hash de las URLs que van a PostHog", () => {
    const out = scrubUrl(
      "https://www.teimportamosarg.com/gracias?code=TI-1&payment_id=9&utm_source=ig#access_token=abc",
    );
    expect(out).toBe("https://www.teimportamosarg.com/gracias?utm_source=ig");
  });
});

describe("decideMpPayment (moneda y devoluciones)", () => {
  const order = { order_code: "TI-1", total: 1000 };
  const base = { external_reference: "TI-1", transaction_amount: 1000, status: "approved" };
  it("no confirma pagos en otra moneda", () => {
    expect(decideMpPayment(order, { ...base, currency_id: "USD" })).toBe("pendiente");
  });
  it("no confirma pagos devueltos", () => {
    expect(
      decideMpPayment(order, { ...base, currency_id: "ARS", transaction_amount_refunded: 1000 }),
    ).toBe("rechazado");
  });
});

describe("confirmMpOrder", () => {
  const order = {
    id: "o1",
    order_code: "TI-1",
    estado: "pendiente",
    total: 1000,
    metodo_pago: "mercadopago",
    email: "a@b.com",
    nombre: "A",
    telefono: "1",
    items: [],
  };
  const payment = {
    external_reference: "TI-1",
    transaction_amount: 1000,
    status: "approved",
    currency_id: "ARS",
  };

  it("si otro aviso ya lo confirmó (0 filas), no manda emails de nuevo", async () => {
    const { notifyNewOrder } = await import("./email.functions");
    vi.mocked(notifyNewOrder).mockClear();
    const db = fakeDb((t, op) => (t === "orders" && op === "update" ? { data: [] } : {}));
    expect(await confirmMpOrder(db, order, payment)).toBe("pagado");
    expect(notifyNewOrder).not.toHaveBeenCalled();
  });

  it("marca pagado y avisa una vez", async () => {
    const { notifyNewOrder } = await import("./email.functions");
    vi.mocked(notifyNewOrder).mockClear();
    const db = fakeDb((t, op) =>
      t === "orders" && op === "update" ? { data: [{ id: "o1" }] } : {},
    );
    expect(await confirmMpOrder(db, order, payment)).toBe("pagado");
    expect(notifyNewOrder).toHaveBeenCalledTimes(1);
  });

  it("no toca el pedido si el pago es de otro pedido", async () => {
    const db = fakeDb(() => ({}));
    expect(await confirmMpOrder(db, order, { ...payment, external_reference: "TI-2" })).toBe(
      "pendiente",
    );
    expect(db.calls.some((c) => c.op === "update")).toBe(false);
  });
});

describe("createOrderRecord", () => {
  const coupon = { code: "TEIMPORTAMOS", userId: "u1", email: "a+x@gmail.com", discount: 100 };

  it("reserva el cupón antes del pedido (email normalizado)", async () => {
    const db = fakeDb(() => ({}));
    const res = await createOrderRecord(db, { total: 900 }, coupon);
    expect(res.orderCode).toMatch(/^TI-/);
    expect(db.calls.map((c) => `${c.table}.${c.op}`)).toEqual([
      "coupon_usages.insert",
      "orders.insert",
    ]);
    expect((db.calls[0]!.payload as { user_email: string }).user_email).toBe("a@gmail.com");
  });

  it("cupón ya usado (índice único): no crea el pedido", async () => {
    const db = fakeDb((t) => (t === "coupon_usages" ? { error: { code: "23505" } } : {}));
    const res = await createOrderRecord(db, { total: 900 }, coupon);
    expect(res.error).toMatch(/ya fue usado/);
    expect(db.calls.some((c) => c.table === "orders")).toBe(false);
  });

  it("si falla el pedido, libera el cupón", async () => {
    const db = fakeDb((t, op) =>
      t === "orders" && op === "insert" ? { error: { code: "XX000", message: "x" } } : {},
    );
    const res = await createOrderRecord(db, { total: 900 }, coupon);
    expect(res.error).toBeDefined();
    expect(db.calls.at(-1)).toMatchObject({ table: "coupon_usages", op: "delete" });
  });

  it("código repetido: reintenta con otro", async () => {
    let n = 0;
    const db = fakeDb((t, op) =>
      t === "orders" && op === "insert" && n++ === 0 ? { error: { code: "23505" } } : {},
    );
    const res = await createOrderRecord(db, { total: 900 }, null);
    expect(res.orderCode).toBeDefined();
    expect(db.calls.filter((c) => c.table === "orders").length).toBe(2);
  });
});
