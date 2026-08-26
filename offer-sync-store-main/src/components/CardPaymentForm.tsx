import { useState } from "react";
import { Lock, CreditCard } from "lucide-react";

export type CardFormData = {
  token: string;
  paymentMethodId: string;
  installments: number;
  issuerId?: string | undefined;
  email: string;
  docType?: string | undefined;
  docNumber?: string | undefined;
};

const PUBLIC_KEY = (import.meta.env["VITE_MERCADOPAGO_PUBLIC_KEY"] as string | undefined) || "";

declare global {
  interface Window {
    MercadoPago?: new (
      key: string,
      opts?: { locale?: string },
    ) => {
      createCardToken: (data: {
        cardNumber: string;
        cardholderName: string;
        cardExpirationMonth: string;
        cardExpirationYear: string;
        securityCode: string;
        identificationType: string;
        identificationNumber: string;
      }) => Promise<{ id: string }>;
      getPaymentMethods: (opts: { bin: string }) => Promise<{
        results: Array<{ id: string; name: string }>;
      }>;
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

function detectBrand(cardNumber: string): string {
  const clean = cardNumber.replace(/\D/g, "");
  if (clean.startsWith("4")) return "visa";
  if (/^5[1-5]/.test(clean) || /^2[2-7]/.test(clean)) return "master";
  if (/^3[47]/.test(clean)) return "amex";
  if (/^3(?:0[0-5]|[68])/.test(clean)) return "diners";
  if (/^6/.test(clean)) return "cabal";
  return "visa";
}

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary";

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
  const [cardNumber, setCardNumber] = useState("");
  const [cardholderName, setCardholderName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [installments, setInstallments] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 3) {
      raw = `${raw.slice(0, 2)}/${raw.slice(2)}`;
    }
    setExpiry(raw);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanCard = cardNumber.replace(/\D/g, "");
    if (cleanCard.length < 15) {
      setError("Ingresá los 16 dígitos de la tarjeta.");
      return;
    }

    if (!cardholderName.trim()) {
      setError("Ingresá el nombre impreso en la tarjeta.");
      return;
    }

    const expiryParts = expiry.split("/");
    if (expiryParts.length !== 2 || expiryParts[0].length !== 2 || expiryParts[1].length !== 2) {
      setError("Ingresá el vencimiento en formato MM/AA (ej: 08/28).");
      return;
    }

    const month = expiryParts[0];
    const monthNum = parseInt(month, 10);
    if (monthNum < 1 || monthNum > 12) {
      setError("El mes de vencimiento debe ser entre 01 y 12.");
      return;
    }

    const year = `20${expiryParts[1]}`;

    if (!securityCode.trim() || securityCode.length < 3) {
      setError("Ingresá el código de seguridad de 3 o 4 dígitos.");
      return;
    }

    setLoading(true);

    try {
      await loadSdk();
      if (!window.MercadoPago) {
        throw new Error("No pudimos conectar con el servidor de pagos. Intentá nuevamente.");
      }

      const mp = new window.MercadoPago(PUBLIC_KEY, { locale: "es-AR" });

      const cleanDni = documentNumber.replace(/\D/g, "") || "11111111";
      const cleanEmail = email.trim() || "comprador@teimportamos.com";

      // Detectar método de pago (Visa, Mastercard, etc.)
      let paymentMethodId = detectBrand(cleanCard);
      try {
        const pmRes = await mp.getPaymentMethods({ bin: cleanCard.slice(0, 6) });
        if (pmRes?.results && pmRes.results.length > 0) {
          paymentMethodId = pmRes.results[0].id;
        }
      } catch {
        // Fallback a detección por expresión regular
      }

      // Crear token seguro de tarjeta
      const tokenRes = await mp.createCardToken({
        cardNumber: cleanCard,
        cardholderName: cardholderName.trim().toUpperCase(),
        cardExpirationMonth: month,
        cardExpirationYear: year,
        securityCode: securityCode.trim(),
        identificationType: "DNI",
        identificationNumber: cleanDni,
      });

      if (!tokenRes?.id) {
        throw new Error("No se pudo procesar la tarjeta. Verificá los datos ingresados.");
      }

      await onPay({
        token: tokenRes.id,
        paymentMethodId,
        installments: Number(installments),
        email: cleanEmail,
        docType: "DNI",
        docNumber: cleanDni,
      });
    } catch (err) {
      console.error("Error al procesar tarjeta:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Verificá los datos de la tarjeta (número, vencimiento o código de seguridad).",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!PUBLIC_KEY) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        El pago con tarjeta directo no está disponible en este momento. Podés usar el botón de Mercado Pago abajo.
      </div>
    );
  }

  const brand = detectBrand(cardNumber);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground border-b border-border pb-2">
        <span className="flex items-center gap-1.5 text-foreground">
          <CreditCard className="h-4 w-4 text-primary" /> Tarjeta de Crédito o Débito
        </span>
        <span className="uppercase font-bold text-primary tracking-wider">{brand}</span>
      </div>

      {/* Número de tarjeta */}
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
          Número de tarjeta
        </span>
        <input
          type="text"
          inputMode="numeric"
          required
          maxLength={19}
          placeholder="0000 0000 0000 0000"
          className={inputClass}
          value={cardNumber}
          onChange={handleCardNumberChange}
        />
      </label>

      {/* Nombre en la tarjeta */}
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
          Nombre impreso en la tarjeta
        </span>
        <input
          type="text"
          required
          placeholder="Como figura en el plástico"
          className={`${inputClass} uppercase`}
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
        />
      </label>

      {/* Vencimiento & Código de Seguridad */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
            Vencimiento (MM/AA)
          </span>
          <input
            type="text"
            inputMode="numeric"
            required
            maxLength={5}
            placeholder="08/28"
            className={inputClass}
            value={expiry}
            onChange={handleExpiryChange}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground flex items-center gap-1">
            <Lock className="h-3 w-3 text-emerald-600" /> Cód. seguridad
          </span>
          <input
            type="password"
            inputMode="numeric"
            required
            maxLength={4}
            placeholder="•••"
            style={{ WebkitTextSecurity: "disc" }}
            className={inputClass}
            value={securityCode}
            onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, ""))}
          />
        </label>
      </div>

      {/* Cuotas */}
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
          Cuotas
        </span>
        <select
          className={inputClass}
          value={installments}
          onChange={(e) => setInstallments(Number(e.target.value))}
        >
          <option value={1}>1 pago de ${(amount).toLocaleString("es-AR")}</option>
          <option value={3}>3 cuotas sin interés de ${(amount / 3).toLocaleString("es-AR")}</option>
          <option value={6}>6 cuotas de ${(amount / 6).toLocaleString("es-AR")}</option>
        </select>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="btn-base grad-urgente mt-2 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {loading ? "Procesando pago..." : `Pagar con tarjeta ($${amount.toLocaleString("es-AR")})`}
      </button>

      {error && <p className="text-xs text-destructive mt-1 font-semibold">{error}</p>}
    </form>
  );
}
