import { describe, expect, it, vi } from "vitest";
import { handleMpWebhook, paymentIdFromNotification, type WebhookDeps } from "./mp-webhook";

const url = (q = "") => new URL(`https://www.teimportamosarg.com/api/mp-webhook${q}`);

describe("paymentIdFromNotification", () => {
  it("lee el id del cuerpo JSON", () => {
    expect(
      paymentIdFromNotification(url(), JSON.stringify({ type: "payment", data: { id: "123456" } })),
    ).toBe("123456");
  });
  it("lee el id de la query (formato IPN)", () => {
    expect(paymentIdFromNotification(url("?topic=payment&id=987"), "")).toBe("987");
    expect(paymentIdFromNotification(url("?type=payment&data.id=55"), "")).toBe("55");
  });
  it("ignora avisos que no son de pago o ids no numéricos", () => {
    expect(paymentIdFromNotification(url("?topic=merchant_order&id=1"), "")).toBeNull();
    expect(
      paymentIdFromNotification(url(), JSON.stringify({ type: "payment", data: { id: "1/../x" } })),
    ).toBeNull();
    expect(paymentIdFromNotification(url(), "no-json")).toBeNull();
  });
});

function deps(over: Partial<WebhookDeps> = {}) {
  const d = {
    fetchPayment: vi.fn(async () => ({ external_reference: "TI-261023-ABCDEFGH" })),
    findOrder: vi.fn(async () => ({ estado: "pendiente", metodo_pago: "mercadopago" })),
    confirm: vi.fn(async () => "pagado"),
    ...over,
  };
  return d;
}

const post = (body: unknown, ip = "1.1.1.1") =>
  new Request(url().toString(), {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": ip, "cf-connecting-ip": ip },
    body: JSON.stringify(body),
  });

describe("handleMpWebhook", () => {
  it("rechaza métodos que no son POST", async () => {
    const res = await handleMpWebhook(new Request(url().toString()), deps());
    expect(res.status).toBe(405);
  });

  it("confirma con el pago consultado a MP, no con el aviso", async () => {
    const d = deps();
    const res = await handleMpWebhook(post({ type: "payment", data: { id: "42" } }, "2.2.2.2"), d);
    expect(res.status).toBe(200);
    expect(d.fetchPayment).toHaveBeenCalledWith("42");
    expect(d.findOrder).toHaveBeenCalledWith("TI-261023-ABCDEFGH");
    expect(d.confirm).toHaveBeenCalledTimes(1);
  });

  it("no hace nada si MP no devuelve el pago", async () => {
    const d = deps({ fetchPayment: vi.fn(async () => null) });
    await handleMpWebhook(post({ type: "payment", data: { id: "42" } }, "3.3.3.3"), d);
    expect(d.findOrder).not.toHaveBeenCalled();
    expect(d.confirm).not.toHaveBeenCalled();
  });

  it("no toca pedidos ya pagados ni de transferencia", async () => {
    const paid = deps({
      findOrder: vi.fn(async () => ({ estado: "pagado", metodo_pago: "mercadopago" })),
    });
    await handleMpWebhook(post({ type: "payment", data: { id: "42" } }, "4.4.4.4"), paid);
    expect(paid.confirm).not.toHaveBeenCalled();
    const transfer = deps({
      findOrder: vi.fn(async () => ({ estado: "pendiente", metodo_pago: "transferencia" })),
    });
    await handleMpWebhook(post({ type: "payment", data: { id: "42" } }, "4.4.4.4"), transfer);
    expect(transfer.confirm).not.toHaveBeenCalled();
  });

  it("responde 200 aunque falle la consulta", async () => {
    const d = deps({
      fetchPayment: vi.fn(async () => {
        throw new Error("boom");
      }),
    });
    const res = await handleMpWebhook(post({ type: "payment", data: { id: "42" } }, "5.5.5.5"), d);
    expect(res.status).toBe(200);
  });

  it("limita los avisos por IP", async () => {
    const d = deps({ fetchPayment: vi.fn(async () => null) });
    let last = 200;
    for (let i = 0; i < 61; i++)
      last = (await handleMpWebhook(post({ type: "x" }, "6.6.6.6"), d)).status;
    expect(last).toBe(429);
  });
});
