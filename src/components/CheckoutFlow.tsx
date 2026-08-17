import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CardPaymentForm, type CardFormData } from "@/components/CardPaymentForm";
import { createOrder } from "@/lib/orders.functions";
import { payOrderWithCard } from "@/lib/orders.functions";
import { createCheckout } from "@/lib/checkout.functions";
import { useAuth } from "@/hooks/useAuth";
import { money } from "@/lib/store";

type CheckoutItem = { nombre: string; qty: number; unitPrice: number };

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary";

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
 * (tarjeta en la propia página o botón directo a Mercado Pago).
 */
export function CheckoutFlow({ items, total }: { items: CheckoutItem[]; total: number }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<"shipping" | "payment">("shipping");
  const [form, setForm] = useState<ShippingForm>(EMPTY);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [promptShown, setPromptShown] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<{ orderId: string; orderCode: string } | null>(null);
  const [mpLoading, setMpLoading] = useState(false);
  const [cardMsg, setCardMsg] = useState("");

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
      form.sucursal_correo.trim(),
    [form],
  );

  const submitShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setCreating(true);
    try {
      const res = await createOrder({
        data: {
          shipping: form,
          items,
          userId: user?.id,
        },
      });
      setOrder({ orderId: res.orderId, orderCode: res.orderCode });
      setStep("payment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos registrar el pedido.");
    } finally {
      setCreating(false);
    }
  };

  const goMercadoPago = async () => {
    setError("");
    setMpLoading(true);
    try {
      const res = await createCheckout({
        data: {
          items,
          origin: window.location.origin,
          ...(order?.orderCode ? { orderCode: order.orderCode } : {}),
        },
      });
      if (res.url) window.location.href = res.url;
      else setError(res.error ?? "No pudimos iniciar el pago.");
    } catch {
      setError("No pudimos iniciar el pago. Probá de nuevo.");
    } finally {
      setMpLoading(false);
    }
  };

  const payWithCard = async (cardData: CardFormData) => {
    if (!order) return;
    setCardMsg("");
    try {
      const res = await payOrderWithCard({ data: { ...cardData, orderId: order.orderId } });
      if (res.status === "approved") {
        navigate({ to: "/gracias", search: { code: order.orderCode } });
      } else if (res.status === "pending") {
        navigate({ to: "/gracias", search: { code: order.orderCode } });
      } else {
        setCardMsg(res.message ?? "No pudimos procesar el pago con tarjeta.");
      }
    } catch {
      setCardMsg("No pudimos procesar el pago con tarjeta. Probá con Mercado Pago.");
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
        <form className="flex flex-col gap-3" onSubmit={submitShipping}>
          {user && (
            <p className="rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              Completamos tus datos automáticamente con tu cuenta.
            </p>
          )}
          {FIELDS.map((f) => (
            <label key={f.key} className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                {f.label}
              </span>
              <input
                type={f.type ?? "text"}
                required
                className={inputClass}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
            </label>
          ))}
          <button
            type="submit"
            disabled={!canSubmit || creating}
            className="btn-base grad-urgente mt-2 text-primary-foreground disabled:opacity-60"
          >
            {creating ? "Guardando..." : "Continuar al pago"}
          </button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold uppercase tracking-[1px] text-muted-foreground">
              Total a pagar
            </span>
            <span className="tabular-nums text-xl font-bold">{money(total)}</span>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
              Pagar con tarjeta
            </p>
            {order && <CardPaymentForm amount={total} email={form.email} onPay={payWithCard} />}
            {cardMsg && <p className="mt-2 text-sm text-destructive">{cardMsg}</p>}
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            o
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={goMercadoPago}
            disabled={mpLoading}
            className="btn-base bg-[#009ee3] text-white disabled:opacity-60"
          >
            {mpLoading ? "Redirigiendo..." : "Pagar con Mercado Pago"}
          </button>

          <button
            type="button"
            onClick={() => setStep("shipping")}
            className="text-xs font-semibold text-muted-foreground hover:text-primary"
          >
            ← Volver a mis datos
          </button>

          {error && <p className="text-sm text-destructive">{error}</p>}
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
