import { useEffect, useRef, useState } from "react";

export type CardFormData = {
  token: string;
  paymentMethodId: string;
  installments: number;
  issuerId?: string | undefined;
  email: string;
  docType?: string | undefined;
  docNumber?: string | undefined;
};

// La Public Key de MercadoPago es pública por diseño (se usa en el navegador).
const PUBLIC_KEY =
  (import.meta.env["VITE_MERCADOPAGO_PUBLIC_KEY"] as string | undefined) ||
  "TEST-9af6f77e-2e08-4ef5-924b-b67d9c0ba75d";

declare global {
  interface Window {
    MercadoPago?: new (key: string, opts?: { locale?: string }) => {
      bricks: () => {
        create: (type: string, container: string, settings: unknown) => Promise<unknown>;
      };
    };
  }
}

function loadSdk() {
  return new Promise<void>((resolve, reject) => {
    if (window.MercadoPago) return resolve();
    const existing = document.querySelector<HTMLScriptElement>("script[data-mp-sdk]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("sdk")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.dataset["mpSdk"] = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("sdk"));
    document.head.appendChild(script);
  });
}

/** Formulario de tarjeta (número, vencimiento, código de seguridad) de MercadoPago. */
export function CardPaymentForm({
  amount,
  email,
  onPay,
}: {
  amount: number;
  email: string;
  onPay: (data: CardFormData) => Promise<void>;
}) {
  const containerId = "mp-card-brick";
  const mounted = useRef(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!PUBLIC_KEY || mounted.current || amount <= 0) return;
    mounted.current = true;
    let cancelled = false;

    (async () => {
      try {
        await loadSdk();
        if (cancelled || !window.MercadoPago) return;
        const mp = new window.MercadoPago(PUBLIC_KEY, { locale: "es-AR" });
        await mp.bricks().create("cardPayment", containerId, {
          initialization: { amount, payer: { email } },
          customization: { visual: { style: { theme: "default" } } },
          callbacks: {
            onReady: () => setReady(true),
            onError: () => setFailed(true),
            onSubmit: async (formData: {
              token: string;
              payment_method_id: string;
              installments: number;
              issuer_id?: string;
              payer?: { email?: string; identification?: { type?: string; number?: string } };
            }) => {
              await onPay({
                token: formData.token,
                paymentMethodId: formData.payment_method_id,
                installments: formData.installments,
                issuerId: formData.issuer_id,
                email: formData.payer?.email ?? email,
                docType: formData.payer?.identification?.type,
                docNumber: formData.payer?.identification?.number,
              });
            },
          },
        });
      } catch {
        setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!PUBLIC_KEY) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        El pago con tarjeta en la página todavía no está activado. Podés pagar con Mercado Pago
        (tarjeta, débito o dinero en cuenta) con el botón de abajo.
      </div>
    );
  }

  return (
    <div>
      <div id={containerId} />
      {!ready && !failed && (
        <p className="text-sm text-muted-foreground">Cargando formulario de tarjeta...</p>
      )}
      {failed && (
        <p className="text-sm text-destructive">
          No pudimos cargar el formulario de tarjeta. Usá el botón de Mercado Pago.
        </p>
      )}
    </div>
  );
}
