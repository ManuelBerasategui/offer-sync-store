import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

export type CardFormData = {
  token: string;
  paymentMethodId: string;
  installments: number;
  issuerId?: string | undefined;
  email: string;
  docType?: string | undefined;
  docNumber?: string | undefined;
  deviceId?: string | undefined;
};

const PUBLIC_KEY = (import.meta.env["VITE_MERCADOPAGO_PUBLIC_KEY"] as string | undefined) || "";

declare global {
  interface Window {
    MP_DEVICE_SESSION_ID?: string;
    MercadoPago?: any;
    cardPaymentBrickController?: any;
  }
}

function loadSecurityScript() {
  return new Promise<void>((resolve) => {
    if (typeof window === "undefined") return resolve();
    if (window.MP_DEVICE_SESSION_ID) return resolve();
    const existing = document.querySelector<HTMLScriptElement>("script[data-mp-security]");
    if (existing) return resolve();

    const script = document.createElement("script");
    script.src = "https://www.mercadopago.com/v2/security.js";
    script.setAttribute("view", "checkout");
    script.setAttribute("output", "MP_DEVICE_SESSION_ID");
    script.dataset["mpSecurity"] = "1";
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

function loadSdk() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (window.MercadoPago) return resolve();
    const existing = document.querySelector<HTMLScriptElement>("script[data-mp-sdk]");
    if (existing) {
      if (window.MercadoPago) return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Error al cargar el sistema de pagos.")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.dataset["mpSdk"] = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Error al cargar el sistema de pagos."));
    document.head.appendChild(script);
  });
}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!PUBLIC_KEY) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let brickController: any = null;

    async function initBrick() {
      try {
        setLoading(true);
        setError("");

        await Promise.all([loadSdk(), loadSecurityScript()]);
        if (!isMounted) return;

        if (!window.MercadoPago) {
          throw new Error("No se pudo conectar con Mercado Pago.");
        }

        const mp = new window.MercadoPago(PUBLIC_KEY, { locale: "es-AR" });
        const bricksBuilder = mp.bricks();

        if (window.cardPaymentBrickController) {
          try {
            await window.cardPaymentBrickController.unmount();
          } catch {}
          window.cardPaymentBrickController = undefined;
        }

        const container = document.getElementById("cardPaymentBrick_container");
        if (container) container.innerHTML = "";

        const cleanDni = documentNumber ? documentNumber.replace(/\D/g, "") : "";

        const settings = {
          initialization: {
            amount: Math.max(1, Math.round(amount)),
            payer: {
              email: email.trim() || undefined,
              identification: cleanDni ? { type: "DNI", number: cleanDni } : undefined,
            },
          },
          customization: {
            visual: {
              style: {
                theme: "default",
                customVariables: {
                  borderRadius: "8px",
                },
              },
            },
            paymentMethods: {
              maxInstallments: 12,
            },
          },
          callbacks: {
            onReady: () => {
              if (isMounted) setLoading(false);
            },
            onSubmit: (formData: any) => {
              return new Promise<void>((resolve, reject) => {
                const deviceId =
                  window.MP_DEVICE_SESSION_ID?.trim() ||
                  (document.getElementById("deviceId") as HTMLInputElement)?.value?.trim() ||
                  undefined;

                onPay({
                  token: formData.token,
                  paymentMethodId: formData.payment_method_id,
                  installments: Number(formData.installments) || 1,
                  issuerId: formData.issuer_id ? String(formData.issuer_id) : undefined,
                  email: formData.payer?.email || email.trim() || "comprador@teimportamos.com",
                  docType: formData.payer?.identification?.type || "DNI",
                  docNumber: formData.payer?.identification?.number || cleanDni,
                  deviceId,
                })
                  .then(() => resolve())
                  .catch((err) => {
                    setError(err instanceof Error ? err.message : "Error al procesar el pago.");
                    reject(err);
                  });
              });
            },
            onError: (err: any) => {
              console.error("Card Payment Brick error:", err);
              if (isMounted) {
                setError("Ocurrió un error al cargar el formulario seguro de tarjeta.");
                setLoading(false);
              }
            },
          },
        };

        brickController = await bricksBuilder.create(
          "cardPayment",
          "cardPaymentBrick_container",
          settings,
        );

        if (isMounted) {
          window.cardPaymentBrickController = brickController;
        } else if (brickController) {
          await brickController.unmount();
        }
      } catch (err) {
        console.error("Error al montar Brick de tarjeta:", err);
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "No pudimos cargar el formulario de pago seguro.",
          );
          setLoading(false);
        }
      }
    }

    void initBrick();

    return () => {
      isMounted = false;
      if (brickController) {
        try {
          void brickController.unmount();
        } catch {}
      }
      if (window.cardPaymentBrickController) {
        try {
          void window.cardPaymentBrickController.unmount();
        } catch {}
        window.cardPaymentBrickController = undefined;
      }
    };
  }, [amount, email, documentNumber]);

  if (!PUBLIC_KEY) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        El pago con tarjeta directo no está configurado. Podés usar el botón de Mercado Pago abajo.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <input type="hidden" id="deviceId" name="deviceId" />

      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground border-b border-border pb-2">
        <span className="flex items-center gap-1.5 text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> Formulario Oficial Mercado Pago
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">Pago Seguro SSL</span>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground text-xs">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Cargando procesador seguro de tarjetas...</span>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive font-semibold p-2 bg-destructive/10 rounded-md">
          {error}
        </p>
      )}

      <div id="cardPaymentBrick_container" className={loading ? "hidden" : "w-full"} />
    </div>
  );
}
