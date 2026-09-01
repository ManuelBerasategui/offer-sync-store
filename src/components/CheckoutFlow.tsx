import { Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Copy, Check, Building2, CreditCard, Send } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createTransferOrder } from "@/lib/orders.functions";
import { createCheckout } from "@/lib/checkout.functions";
import { useAuth } from "@/hooks/useAuth";
import { storeQueryOptions } from "@/lib/store-query";
import { useCart } from "@/lib/cart";
import {
  money,
  transferPrice,
  transferDiscountPct,
  getBankInfo,
  waLink,
  sanitizeUrl,
} from "@/lib/store";

type CheckoutItem = { nombre: string; qty: number; unitPrice: number; productId?: string | undefined };

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary";
const MAX_FIELD_LENGTH = 40;
const MAX_EMAIL_LENGTH = 254;

const BASE_FIELDS: { key: keyof ShippingForm; label: string; type?: string }[] = [
  { key: "nombre", label: "Nombre y apellido" },
  { key: "dni", label: "DNI" },
  { key: "telefono", label: "Teléfono" },
  { key: "email", label: "Email", type: "email" },
  { key: "provincia", label: "Provincia" },
  { key: "ciudad", label: "Ciudad" },
  { key: "codigo_postal", label: "Código postal" },
];

type ShippingForm = {
  nombre: string;
  dni: string;
  telefono: string;
  email: string;
  provincia: string;
  ciudad: string;
  codigo_postal: string;
  transporte: "Correo Argentino" | "Vía Cargo";
  sucursal_correo: string;
};

const EMPTY: ShippingForm = {
  nombre: "",
  dni: "",
  telefono: "",
  email: "",
  provincia: "",
  ciudad: "",
  codigo_postal: "",
  transporte: "Correo Argentino",
  sucursal_correo: "",
};

/**
 * Flujo de pre-pago: 1) datos de envío (autocompletados si hay sesión) 2) pago
 * (Transferencia con descuento o Mercado Pago Checkout Pro).
 */
export function CheckoutFlow({
  items,
  total,
  appliedCoupon,
}: {
  items: CheckoutItem[];
  total: number;
  appliedCoupon?: { code: string; discountPct: number } | null;
}) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const cart = useCart();
  const { data: storeData } = useSuspenseQuery(storeQueryOptions);
  const config = storeData?.config;

  const [step, setStep] = useState<"shipping" | "payment">("shipping");
  const [paymentMethod, setPaymentMethod] = useState<"transfer" | "mercadopago">("transfer");
  const [form, setForm] = useState<ShippingForm>(EMPTY);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [promptShown, setPromptShown] = useState(false);
  const [mpLoading, setMpLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const bankInfo = useMemo(() => getBankInfo(config), [config]);
  const discPct = useMemo(() => transferDiscountPct(config), [config]);

  const couponDiscountPct = appliedCoupon?.discountPct ?? 0;
  const couponCode = appliedCoupon?.code;

  // Totales finales con cupón si existe
  const finalTransferTotal = useMemo(() => {
    const baseTransfer = transferPrice(total, discPct);
    if (!couponDiscountPct) return baseTransfer;
    return Math.max(1, baseTransfer - Math.round(baseTransfer * (couponDiscountPct / 100)));
  }, [total, discPct, couponDiscountPct]);

  const finalMpTotal = useMemo(() => {
    if (!couponDiscountPct) return total;
    return Math.max(1, total - Math.round(total * (couponDiscountPct / 100)));
  }, [total, couponDiscountPct]);

  // Autocompletar con los datos guardados si el usuario inició sesión.
  useEffect(() => {
    if (user && profile) {
      setForm({
        nombre: profile.nombre,
        dni: profile.dni,
        telefono: profile.telefono,
        email: user.email ?? "",
        provincia: profile.provincia,
        ciudad: profile.ciudad,
        codigo_postal: profile.codigo_postal,
        transporte: (profile.transporte as ShippingForm["transporte"]) || "Correo Argentino",
        sucursal_correo: profile.sucursal_correo,
      });
    }
  }, [user, profile]);

  // Si no inició sesión, ofrecemos una única vez el pop-up de descuentos.
  useEffect(() => {
    if (!user && !promptShown) {
      const t = setTimeout(() => {
        setShowLoginPrompt(true);
        setPromptShown(true);
      }, 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [user, promptShown]);

  const canSubmit = useMemo(
    () =>
      form.nombre.trim() &&
      form.dni.trim() &&
      form.telefono.trim() &&
      form.email.trim() &&
      form.provincia.trim() &&
      form.ciudad.trim() &&
      form.codigo_postal.trim() &&
      form.transporte.trim() &&
      form.sucursal_correo.trim(),
    [form],
  );

  const copyToClipboard = (textToCopy: string, field: string) => {
    if (!navigator?.clipboard) return;
    navigator.clipboard.writeText(textToCopy);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    // Validación de DNI
    const dniDigits = form.dni.replace(/\D/g, "");
    if (dniDigits.length < 7 || dniDigits.length > 9) {
      setError("El DNI debe tener entre 7 y 9 números.");
      return;
    }

    // Validación de Código Postal
    const cpDigits = form.codigo_postal.replace(/\D/g, "");
    if (cpDigits.length < 4) {
      setError("El Código Postal debe tener al menos 4 dígitos.");
      return;
    }

    // Validación de Teléfono
    const telDigits = form.telefono.replace(/\D/g, "");
    if (telDigits.length < 8) {
      setError("Ingresá un número de teléfono válido con caracteristica.");
      return;
    }

    setError("");
    setStep("payment");
  };

  const confirmTransfer = async () => {
    setError("");
    setTransferLoading(true);
    try {
      const res = await createTransferOrder({
        data: {
          items,
          shipping: form,
          userId: user?.id,
          couponCode: couponCode || undefined,
        },
      });

      if (res.status === "success" && res.orderCode) {
        cart.clear();

        // Abrir WhatsApp con el comprobante pre-armado
        const finalAmount = res.total ?? finalTransferTotal;
        const couponText = couponCode ? ` (con cupón ${couponCode})` : "";
        const waMsg = `¡Hola! Acabo de hacer el pedido ${res.orderCode} por ${money(finalAmount)} mediante Transferencia Bancaria${couponText}. Adjunto el comprobante de pago.`;
        const waUrl = waLink(config ?? {}, waMsg);
        window.open(sanitizeUrl(waUrl), "_blank", "noopener,noreferrer");

        // Navegar a la página de gracias
        void navigate({
          to: "/gracias",
          search: {
            code: res.orderCode,
            status: "pending",
          },
        });
      } else {
        setError(res.message ?? "No pudimos registrar tu pedido. Probá de nuevo.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar el pedido.");
    } finally {
      setTransferLoading(false);
    }
  };

  const goMercadoPago = async () => {
    setError("");
    setMpLoading(true);
    try {
      const res = await createCheckout({
        data: {
          items,
          shipping: form,
          origin: window.location.origin,
          userId: user?.id,
          couponCode: couponCode || undefined,
        },
      });
      if (res.url) {
        const safeUrl = sanitizeUrl(res.url);
        if (safeUrl !== "#") {
          window.location.href = safeUrl;
        } else {
          setError("URL de pago no válida.");
        }
      } else {
        setError(res.error ?? "No pudimos iniciar el pago.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos iniciar el pago. Probá de nuevo.");
    } finally {
      setMpLoading(false);
    }
  };

  return (
    <div className="card-soft p-5">
      {/* Pasos */}
      <div className="mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1px]">
        <span className={step === "shipping" ? "text-primary" : "text-muted-foreground"}>
          1. Tus datos
        </span>
        <span className="text-muted-foreground">→</span>
        <span className={step === "payment" ? "text-primary" : "text-muted-foreground"}>
          2. Pago
        </span>
      </div>

      {step === "shipping" ? (
        <form className="flex flex-col gap-3" onSubmit={handleNextStep}>
          {user && (
            <p className="rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              Completamos tus datos automáticamente con tu cuenta.
            </p>
          )}
          {BASE_FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1.5">
              {f.key === "dni" && (
                <p className="text-xs text-muted-foreground">
                  Ahora te pedimos unos datos para hacer el envío directo a domicilio.
                </p>
              )}
              <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                {f.label}
              </span>
              <input
                type={f.type ?? "text"}
                inputMode={f.key === "dni" ? "numeric" : f.key === "telefono" ? "tel" : undefined}
                maxLength={
                  f.key === "dni" ? 8 : f.key === "email" ? MAX_EMAIL_LENGTH : MAX_FIELD_LENGTH
                }
                required
                className={inputClass}
                value={form[f.key]}
                onChange={(e) => {
                  let val = e.target.value;
                  if (f.key === "dni") {
                    val = val.replace(/\D/g, "").slice(0, 8);
                  }
                  if (f.key === "telefono") {
                    val = val.replace(/[^\d+()\-\s]/g, "");
                  }
                  setForm({ ...form, [f.key]: val });
                }}
              />
            </label>
          ))}

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
              Transporte
            </span>
            <select
              required
              className={inputClass}
              value={form.transporte}
              onChange={(e) =>
                setForm({
                  ...form,
                  transporte: e.target.value as ShippingForm["transporte"],
                })
              }
            >
              <option value="Correo Argentino">Correo Argentino</option>
              <option value="Vía Cargo">Vía Cargo</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
              {form.transporte === "Vía Cargo"
                ? "Suc. Vía Cargo más cercana"
                : "Suc. Correo Argentino más cercana"}
            </span>
            <input
              type="text"
              required
              className={inputClass}
              maxLength={MAX_FIELD_LENGTH}
              value={form.sucursal_correo}
              onChange={(e) => setForm({ ...form, sucursal_correo: e.target.value })}
            />
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-base grad-urgente mt-2 text-primary-foreground disabled:opacity-60"
          >
            Continuar al pago
          </button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Selector de Método de Pago */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod("transfer")}
              className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                paymentMethod === "transfer"
                  ? "border-emerald-600 bg-emerald-500/10 shadow-sm"
                  : "border-border bg-card hover:border-border/80"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Building2 className={`h-4 w-4 ${paymentMethod === "transfer" ? "text-emerald-600" : "text-muted-foreground"}`} />
                <span className="text-xs font-bold">Transferencia</span>
              </div>
              <span className="mt-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                {discPct}% OFF
              </span>
              <span className="mt-1 tabular-nums text-sm font-bold text-foreground">
                {money(finalTransferTotal)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("mercadopago")}
              className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                paymentMethod === "mercadopago"
                  ? "border-[#009ee3] bg-[#009ee3]/10 shadow-sm"
                  : "border-border bg-card hover:border-border/80"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <CreditCard className={`h-4 w-4 ${paymentMethod === "mercadopago" ? "text-[#009ee3]" : "text-muted-foreground"}`} />
                <span className="text-xs font-bold">Mercado Pago</span>
              </div>
              <span className="mt-1 text-[10px] text-muted-foreground">
                Precio de lista
              </span>
              <span className="mt-1 tabular-nums text-sm font-bold text-foreground">
                {money(finalMpTotal)}
              </span>
            </button>
          </div>

          {/* OPCIÓN TRANSFERENCIA BANCARIA */}
          {paymentMethod === "transfer" ? (
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold uppercase tracking-[1px] text-emerald-700 dark:text-emerald-400">
                    Total a pagar (Transferencia)
                  </span>
                  <span className="tabular-nums text-2xl font-bold text-foreground">
                    {money(finalTransferTotal)}
                  </span>
                </div>
              </div>

              {/* Datos Bancarios */}
              <div className="space-y-2.5 rounded-xl border border-border bg-card p-4 text-xs">
                <p className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                  Datos para transferir:
                </p>

                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div>
                    <span className="text-muted-foreground">Alias: </span>
                    <span className="font-mono font-bold text-foreground select-all">{bankInfo.alias}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(bankInfo.alias, "alias")}
                    className="flex items-center gap-1 rounded bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground hover:bg-secondary/80"
                  >
                    {copiedField === "alias" ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copiar
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div className="min-w-0 pr-2">
                    <span className="text-muted-foreground">CBU / CVU: </span>
                    <span className="font-mono font-bold text-foreground select-all break-all">{bankInfo.cbu}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(bankInfo.cbu, "cbu")}
                    className="shrink-0 flex items-center gap-1 rounded bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground hover:bg-secondary/80"
                  >
                    {copiedField === "cbu" ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" /> Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copiar
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <span className="text-muted-foreground">Titular:</span>
                  <span className="font-semibold text-foreground">{bankInfo.titular}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Banco / Entidad:</span>
                  <span className="font-semibold text-foreground">{bankInfo.banco}</span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                ⏳ <strong>Tu pedido está reservado:</strong> Tenés <strong>24 horas</strong> para enviar el comprobante de pago; de lo contrario, la orden se cancelará automáticamente para liberar el stock.
              </div>

              <button
                type="button"
                onClick={confirmTransfer}
                disabled={transferLoading}
                className="btn-base grad-urgente flex items-center justify-center gap-2 text-primary-foreground disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {transferLoading ? "Registrando pedido..." : "Confirmar pedido y enviar comprobante"}
              </button>

              <button
                type="button"
                onClick={() => setStep("shipping")}
                className="text-xs font-semibold text-muted-foreground hover:text-primary text-center"
              >
                ← Volver a mis datos
              </button>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          ) : (
            /* OPCIÓN MERCADO PAGO CHECKOUT PRO */
            <div className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold uppercase tracking-[1px] text-muted-foreground">
                  Total a pagar (Mercado Pago)
                </span>
                <div className="flex items-baseline gap-2">
                  {appliedCoupon && (
                    <span className="text-xs line-through text-muted-foreground">
                      {money(total)}
                    </span>
                  )}
                  <span className="tabular-nums text-xl font-bold text-foreground">
                    {money(finalMpTotal)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-[#009ee3]/30 bg-[#009ee3]/5 p-4 text-xs space-y-1.5">
                <p className="font-semibold text-foreground">
                  Pagá de forma 100% segura con Mercado Pago
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Serás redirigido al Checkout oficial de Mercado Pago para pagar con tarjeta de crédito, débito, saldo en cuenta o en efectivo.
                </p>
              </div>

              <button
                type="button"
                onClick={goMercadoPago}
                disabled={mpLoading}
                className="btn-base bg-[#009ee3] hover:bg-[#0089c7] text-white disabled:opacity-60 transition-colors"
              >
                {mpLoading ? "Redirigiendo a Mercado Pago..." : "Pagar con Mercado Pago"}
              </button>

              <button
                type="button"
                onClick={() => setStep("shipping")}
                className="text-xs font-semibold text-muted-foreground hover:text-primary text-center"
              >
                ← Volver a mis datos
              </button>

              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}
        </div>
      )}

      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Querés obtener descuentos exclusivos?</DialogTitle>
            <DialogDescription>
              Iniciá sesión y tus datos de envío se completan solos en cada compra.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setShowLoginPrompt(false)}
              className="btn-base border border-border text-foreground"
            >
              Continuar sin cuenta
            </button>
            <Link
              to="/auth"
              search={{ mode: "login" }}
              className="btn-base grad-urgente text-primary-foreground"
            >
              Iniciar sesión
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
