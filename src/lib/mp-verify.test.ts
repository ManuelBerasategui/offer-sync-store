import { describe, expect, it } from "vitest";
import { decideMpPayment } from "./mp-verify";

const order = { order_code: "TI-261019-ABCD", total: 50000 };

describe("decideMpPayment", () => {
  it("confirma un pago aprobado de este pedido por el monto completo", () => {
    expect(
      decideMpPayment(order, {
        status: "approved",
        external_reference: order.order_code,
        transaction_amount: 50000,
      }),
    ).toBe("pagado");
  });

  it("sin consulta a la API (solo ?status=approved en la URL) queda pendiente", () => {
    expect(decideMpPayment(order, null)).toBe("pendiente");
  });

  it("no acepta un pago aprobado de OTRO pedido", () => {
    expect(
      decideMpPayment(order, {
        status: "approved",
        external_reference: "TI-OTRO",
        transaction_amount: 50000,
      }),
    ).toBe("pendiente");
  });

  it("no acepta un pago aprobado por menos plata que el pedido", () => {
    expect(
      decideMpPayment(order, {
        status: "approved",
        external_reference: order.order_code,
        transaction_amount: 100,
      }),
    ).toBe("pendiente");
  });

  it("pagos en proceso quedan pendientes y los rechazados, rechazados", () => {
    const base = { external_reference: order.order_code, transaction_amount: 50000 };
    expect(decideMpPayment(order, { ...base, status: "in_process" })).toBe("pendiente");
    expect(decideMpPayment(order, { ...base, status: "rejected" })).toBe("rechazado");
  });
});
