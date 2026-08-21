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
const PUBLIC_KEY = (import.meta.env["VITE_MERCADOPAGO_PUBLIC_KEY"] as string | undefined) || "";

interface BrickController {
  unmount: () => void;
}

declare global {
  interface Window {
    MercadoPago?: new (
      key: string,
      opts?: { locale?: string },
    ) => {
      bricks: () => {
        create: (type: string, container: string, settings: unknown) => Promise<BrickController>;
      };
    };
  }
}

function loadSdk() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (window.MercadoPago) return resolve();
    const existing = document.querySelector<HTMLScriptElement>("script[data-mp-sdk]");
    if (existing) {
      if (window.MercadoPago) return resolve();
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

// Pre-cargar el SDK de Mercado Pago en segundo plano de inmediato si estamos en el navegador
if (typeof window !== "undefined") {
  loadSdk().catch(() => {});
}

/** Formulario de tarjeta (número, vencimiento, código de seguridad) de MercadoPago. */
export function CardPaymentForm({
  amount,
  email,
  documentNumber,
  onPay,
}: {
  amount: number;
  email: string;
  documentNumber: string;
  onPay: (data: CardFormData) => Promise<void>;
}) {
  const containerId = "mp-card-brick";
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const brickControllerRef = useRef<BrickController | null>(null);

  useEffect(() => {
    if (!PUBLIC_KEY || amount <= 0) return;
    let isCancelled = false;

    const timer = setTimeout(async () => {
      try {
        setFailed(false);
        setReady(false);
        await loadSdk();
        if (isCancelled || !window.MercadoPago) return;

        const containerElem = document.getElementById(containerId);
        if (!containerElem || isCancelled) return;

        // Limpiar controller previo si existe
        if (brickControllerRef.current) {
          try {
            brickControllerRef.current.unmount();
          } catch {}
          brickControllerRef.current = null;
        }
        containerElem.innerHTML = "";

        const cleanDni = String(documentNumber ?? "").replace(/\D/g, "") || "11111111";
        const cleanEmail = String(email ?? "").trim() || "comprador@teimportamos.com";
        const cleanAmount = Number(amount) > 0 ? Number(amount.toFixed(2)) : 100;

        const mp = new window.MercadoPago(PUBLIC_KEY, { locale: "es-AR" });
        const controller = await mp.bricks().create("cardPayment", containerId, {
          initialization: {
            amount: cleanAmount,
            payer: {
              email: cleanEmail,
              identification: { type: "DNI", number: cleanDni },
            },
          },
          customization: { visual: { style: { theme: "default" } } },
          callbacks: {
            onReady: () => {
              if (!isCancelled) setReady(true);
            },
            onError: (err: unknown) => {
              console.error("Error inicializando Brick de Mercado Pago:", err);
              if (!isCancelled) setFailed(true);
            },
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
                email: formData.payer?.email ?? cleanEmail,
                docType: formData.payer?.identification?.type ?? "DNI",
                docNumber: formData.payer?.identification?.number ?? cleanDni,
              });
            },
          },
        });

        if (isCancelled) {
          try {
            controller.unmount();
          } catch {}
        } else {
          brickControllerRef.current = controller;
        }
      } catch (err) {
        console.error("Error al cargar formulario de tarjeta MP:", err);
        if (!isCancelled) setFailed(true);
      }
    }, 150);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      if (brickControllerRef.current) {
        try {
          brickControllerRef.current.unmount();
        } catch {}
        brickControllerRef.current = null;
      }
    };
  }, [amount, documentNumber, email]);

  if (!PUBLIC_KEY) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        El pago con tarjeta en la página todavía no está activado. Podés pagar con Mercado Pago
        (tarjeta, débito o dinero en cuenta) con el botón de abajo.
      </div>
    );
  }

  return (
    <div className="min-h-[160px]">
      <div id={containerId} />
      {!ready && !failed && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Cargando formulario de tarjeta...
        </p>
      )}
      {failed && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-center">
          <p className="text-sm text-destructive">
            No pudimos cargar el formulario de tarjeta. Podés usar el botón de Mercado Pago abajo.
          </p>
        </div>
      )}
    </div>
  );
}
