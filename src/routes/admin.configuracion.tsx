import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, X, Save, Settings2 } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { AdminHeader } from "@/components/AdminHeader";
import { storeQueryOptions } from "@/lib/store-query";
import { useAuth } from "@/hooks/useAuth";
import {
  getAdminProducts,
  upsertCategoryRules,
  testAdminResendEmail,
  type CategoryRuleInput,
} from "@/lib/products.functions";
import { parseCategoryRules, normCat, getBaseCategory, money } from "@/lib/store";

export const Route = createFileRoute("/admin/configuracion")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(storeQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Configuración de Categorías — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminConfiguracionPage,
});

/* ─── Tipos locales ─────────────────────────────────────── */

type TierForm = { units: number; percent: number };

type CatRuleForm = {
  displayName: string;
  discountTiers: TierForm[];
  minType: "none" | "units" | "amount";
  minValue: string;
};

/* ─── Página ────────────────────────────────────────────── */

function AdminConfiguracionPage() {
  const { data: storeData } = useSuspenseQuery(storeQueryOptions);
  const { config } = storeData;
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [categories, setCategories] = useState<string[]>([]);
  const [rules, setRules] = useState<Record<string, CatRuleForm>>({});
  const [dolarRate, setDolarRate] = useState<string>(config["dolar_cotizacion"] ?? "1500");
  const [liveUsdt, setLiveUsdt] = useState<number | null>(null);
  const [dbDolarRate, setDbDolarRate] = useState<number | null>(null);

  const [bankAlias, setBankAlias] = useState<string>(config["transferencia_alias"] ?? "teimportamos.mp");
  const [bankCbu, setBankCbu] = useState<string>(config["transferencia_cbu"] ?? "0000003100012345678901");
  const [bankTitular, setBankTitular] = useState<string>(config["transferencia_titular"] ?? "Te Importamos Argentina");
  const [bankBanco, setBankBanco] = useState<string>(config["transferencia_banco"] ?? "Mercado Pago");
  const [bankDiscountPct, setBankDiscountPct] = useState<string>(config["transferencia_descuento_pct"] ?? "7");

  const [resendApiKey, setResendApiKey] = useState<string>(config["resend_api_key"] ?? "");
  const [resendFrom, setResendFrom] = useState<string>(config["resend_from"] ?? "Te Importamos <noreply@teimportamosarg.com>");
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailMsg, setTestEmailMsg] = useState<{ success?: boolean; text?: string } | null>(null);

  useEffect(() => {
    fetch("https://dolarapi.com/v1/dolares/cripto")
      .then((res) => res.json())
      .then((data: { venta?: number }) => {
        if (data?.venta) setLiveUsdt(Math.round(data.venta));
      })
      .catch(() => {});
  }, []);

  const userId = user?.id;
  const userEmail = user?.email ?? "";
  const userToken = session?.access_token ?? "";

  async function loadCategories(isInitial = false) {
    if (isInitial || categories.length === 0) setLoading(true);
    setError("");
    try {
      const email = user?.email ?? "";
      const token = session?.access_token ?? "";
      const res = await getAdminProducts({ data: { email, token } });
      if (res.error) {
        if (categories.length === 0) setError(res.error);
        if (res.error.toLowerCase().includes("acceso denegado")) {
          setIsAuthorized(false);
          void navigate({ to: "/", replace: true });
        }
        return;
      }
      setIsAuthorized(true);

      // Calcular la cotización implícita ponderada usada actualmente en los productos de la DB
      const prodsWithBoth = res.products.filter((p) => {
        const ars = Number(p.precio) || 0;
        const usd = Number((p as any).precio_usd) || 0;
        return ars > 0 && usd >= 1;
      });

      if (prodsWithBoth.length > 0) {
        const totalArs = prodsWithBoth.reduce((acc, p) => acc + Number(p.precio), 0);
        const totalUsd = prodsWithBoth.reduce((acc, p) => acc + Number((p as any).precio_usd), 0);
        const rate = Math.round(totalArs / totalUsd);
        setDbDolarRate(rate);
      }

      const existing = parseCategoryRules(config);
      const rawCats = res.products.map((p) => (p.categoria ?? "").trim()).filter(Boolean);
      const baseCatsFromProds = rawCats.map(getBaseCategory);
      const existingCats = Object.keys(existing).map((k) => k.charAt(0).toUpperCase() + k.slice(1));

      const cats = [...new Set([...baseCatsFromProds, ...existingCats])].sort();
      setCategories(cats);

      const formRules: Record<string, CatRuleForm> = {};
      for (const cat of cats) {
        const key = normCat(cat);
        const ex = existing[key];
        formRules[key] = {
          displayName: cat,
          discountTiers: ex?.discountTiers?.length ? [...ex.discountTiers] : [],
          minType: ex?.minUnits ? "units" : ex?.minAmount ? "amount" : "none",
          minValue: String(ex?.minUnits ?? ex?.minAmount ?? ""),
        };
      }
      setRules(formRules);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al cargar.";
      if (categories.length === 0) setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading) {
      if (!userId) void navigate({ to: "/", replace: true });
      else void loadCategories(true);
    }
  }, [authLoading, userId]);

  /* ─── Handlers ──────────────────────────────────────── */

  const setRule = (key: string, patch: Partial<CatRuleForm>) =>
    setRules((prev): Record<string, CatRuleForm> => ({
      ...prev,
      [key]: { ...prev[key], ...patch } as CatRuleForm,
    }));

  const addTier = (key: string) =>
    setRule(key, { discountTiers: [...(rules[key]?.discountTiers ?? []), { units: 0, percent: 0 }] });

  const removeTier = (key: string, i: number) =>
    setRule(key, { discountTiers: (rules[key]?.discountTiers ?? []).filter((_, idx) => idx !== i) });

  const updateTier = (key: string, i: number, field: "units" | "percent", value: number) =>
    setRule(key, {
      discountTiers: (rules[key]?.discountTiers ?? []).map((t, idx) =>
        idx === i ? { ...t, [field]: value } : t,
      ),
    });

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      const ruleInputs: CategoryRuleInput[] = Object.values(rules).map((r) => ({
        category: r.displayName,
        discountTiers: r.discountTiers
          .filter((t) => t.units > 0 && t.percent > 0)
          .sort((a, b) => a.units - b.units),
        minType: r.minType,
        minValue: Number(r.minValue) || 0,
      }));
      const res = await upsertCategoryRules({
        data: {
          email: userEmail,
          token: userToken,
          rules: ruleInputs,
          dolarCotizacion: Number(dolarRate) || 1500,
          bankInfo: {
            alias: bankAlias,
            cbu: bankCbu,
            titular: bankTitular,
            banco: bankBanco,
            descuentoPct: Number(bankDiscountPct) || 7,
          },
          resendConfig: {
            apiKey: resendApiKey,
            from: resendFrom,
          },
        },
      });
      if (res.error) { setError(res.error); return; }
      setSuccessMsg("¡Configuración guardada correctamente!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestEmail() {
    setTestingEmail(true);
    setTestEmailMsg(null);
    try {
      // Guardar primero para que use la clave más reciente en la DB
      await handleSave();
      const res = await testAdminResendEmail({
        data: {
          email: userEmail,
          token: userToken,
          targetEmail: userEmail,
        },
      });
      setTestEmailMsg({ success: res.success, text: res.message });
    } catch (err) {
      setTestEmailMsg({
        success: false,
        text: err instanceof Error ? err.message : "Error al enviar email de prueba.",
      });
    } finally {
      setTestingEmail(false);
    }
  }

  /* ─── Guards ────────────────────────────────────────── */

  if (authLoading || !user || isAuthorized === false) return null;
  if (isAuthorized === null || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  /* ─── UI ─────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader config={storeData.config} />

      <main className="mx-auto max-w-[900px] px-3 py-4 sm:px-6 sm:py-8">
        <AdminHeader
          title="Configuración de Tienda"
          subtitle="Transferencias bancarias, cotizaciones y reglas de categoría."
          currentRoute="configuracion"
          actions={
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="btn-base bg-primary text-primary-foreground hover:opacity-90 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold sm:px-4 sm:py-2 sm:text-sm disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>{saving ? "Guardando..." : "Guardar todo"}</span>
            </button>
          }
        />

        {/* Mensajes */}
        {error && (
          <div className="mb-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
        )}
        {successMsg && (
          <div className="mb-6 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 font-semibold">
            ✓ {successMsg}
          </div>
        )}

        {/* Datos Bancarios para Transferencia */}
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-card p-3.5 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
              🏦 Datos de Transferencia Bancaria (Checkout con Descuento)
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Estos datos se mostrarán a los clientes al momento de pagar por transferencia en la web.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground">Alias</span>
              <input
                type="text"
                className="input-base"
                value={bankAlias}
                onChange={(e) => setBankAlias(e.target.value)}
                placeholder="ej: teimportamos.mp"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground">CBU / CVU</span>
              <input
                type="text"
                className="input-base font-mono"
                value={bankCbu}
                onChange={(e) => setBankCbu(e.target.value)}
                placeholder="ej: 00000031000..."
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground">Titular de la cuenta</span>
              <input
                type="text"
                className="input-base"
                value={bankTitular}
                onChange={(e) => setBankTitular(e.target.value)}
                placeholder="ej: Manuel Berasategui"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground">Banco / Billetera</span>
              <input
                type="text"
                className="input-base"
                value={bankBanco}
                onChange={(e) => setBankBanco(e.target.value)}
                placeholder="ej: Mercado Pago"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground">Descuento por Transferencia (%)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={50}
                  className="input-base w-24 font-bold text-emerald-600"
                  value={bankDiscountPct}
                  onChange={(e) => setBankDiscountPct(e.target.value)}
                />
                <span className="text-xs font-semibold text-muted-foreground">% OFF en checkout</span>
              </div>
            </label>
          </div>
        </div>

        {/* Configuración de Notificaciones por Email (Resend) */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-3.5 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-base font-bold flex items-center gap-2">
              ✉️ Notificaciones de Compras por Email (Resend)
            </h2>
            <button
              type="button"
              onClick={() => void handleTestEmail()}
              disabled={testingEmail || saving}
              className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
            >
              {testingEmail ? "Enviando prueba..." : "Enviar email de prueba"}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Configurá tu API Key de Resend para despachar las notificaciones de ventas a los administradores y al cliente comprador.
          </p>

          {testEmailMsg && (
            <div
              className={`mb-4 rounded-xl p-3 text-xs font-medium border ${
                testEmailMsg.success
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              }`}
            >
              {testEmailMsg.text}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground">Resend API Key (re_...)</span>
              <input
                type="password"
                className="input-base"
                value={resendApiKey}
                onChange={(e) => setResendApiKey(e.target.value)}
                placeholder="re_1234567890abcdef..."
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground">Remitente (From)</span>
              <input
                type="text"
                className="input-base"
                value={resendFrom}
                onChange={(e) => setResendFrom(e.target.value)}
                placeholder="Te Importamos <noreply@teimportamosarg.com>"
              />
            </label>
          </div>
        </div>

        {/* Cotización Dólar para valor inicial */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-3.5 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="text-base font-bold flex items-center gap-2">
              💵 Cotización del Dólar
            </h2>
            <div className="flex flex-wrap gap-2">
              {dbDolarRate !== null && (
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  🗄️ Cotización activa en Base de Datos: {money(dbDolarRate)}
                </span>
              )}
              {liveUsdt !== null && (
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  ⚡ Dólar Cripto / USDT Binance en vivo: {money(liveUsdt)}
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Al guardar un producto en dólares con precio ARS vacío, se usa automáticamente la cotización USDT Binance ({liveUsdt ? money(liveUsdt) : "en vivo"}) para la carga inicial hasta que tu sincronizador actualice la Base de Datos ({dbDolarRate ? money(dbDolarRate) : "cotización activa"}).
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">$</span>
            <input
              type="number"
              min={1}
              className="input-base w-36 font-bold"
              value={dolarRate}
              onChange={(e) => setDolarRate(e.target.value)}
              placeholder="1500"
            />
            <span className="text-xs font-semibold text-muted-foreground">ARS por USD (Resguardo manual)</span>
          </div>
        </div>

        {/* Tarjetas por categoría */}
        <div className="space-y-5">
          {categories.map((cat) => {
            const key = normCat(cat);
            const rule = rules[key];
            if (!rule) return null;

            return (
              <div key={key} className="rounded-2xl border border-border bg-card p-3.5 sm:p-5 space-y-4 sm:space-y-5">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-primary/70 shrink-0" />
                  <h2 className="text-base font-bold">{cat}</h2>
                </div>

                {/* ── Descuentos por cantidad ── */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Descuentos por cantidad (total de la categoría en carrito)
                    </label>
                    <button
                      type="button"
                      onClick={() => addTier(key)}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
                    >
                      <Plus className="h-3 w-3" /> Agregar
                    </button>
                  </div>

                  {rule.discountTiers.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Sin descuentos configurados.</p>
                  ) : (
                    <div className="space-y-2">
                      {rule.discountTiers.map((tier, i) => (
                        <div key={i} className="flex flex-wrap items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            className="input-base w-24"
                            value={tier.units || ""}
                            onChange={(e) => updateTier(key, i, "units", Number(e.target.value))}
                            placeholder="Unidades"
                          />
                          <span className="text-xs text-muted-foreground">unid. →</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            className="input-base w-24"
                            value={tier.percent || ""}
                            onChange={(e) => updateTier(key, i, "percent", Number(e.target.value))}
                            placeholder="% desc."
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                          <button
                            type="button"
                            onClick={() => removeTier(key, i)}
                            className="text-destructive hover:opacity-70 p-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Mínimo de compra ── */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                    Mínimo de compra
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(["none", "units", "amount"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setRule(key, { minType: opt, minValue: opt === "none" ? "" : rule.minValue })}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                          rule.minType === opt
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {opt === "none" ? "Sin mínimo" : opt === "units" ? "Mínimo unidades" : "Mínimo monto ($)"}
                      </button>
                    ))}
                  </div>

                  {rule.minType !== "none" && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="number"
                        min={1}
                        className="input-base w-40"
                        value={rule.minValue}
                        onChange={(e) => setRule(key, { minValue: e.target.value })}
                        placeholder={rule.minType === "units" ? "Ej: 3" : "Ej: 250000"}
                      />
                      <span className="text-xs text-muted-foreground">
                        {rule.minType === "units" ? "unidades" : "ARS"}
                      </span>
                      {rule.minValue && Number(rule.minValue) > 0 && (
                        <span className="text-xs font-semibold text-emerald-600">
                          → {rule.minType === "amount"
                            ? money(Number(rule.minValue))
                            : `${rule.minValue} unidades`}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {categories.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">
            No hay categorías de productos activas aún.
          </p>
        )}

        {/* Botón guardar inferior */}
        {categories.length > 0 && (
          <div className="mt-8 flex justify-end">
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="btn-base bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Guardando..." : "Guardar configuración"}
            </button>
          </div>
        )}
      </main>

      <SiteFooter config={storeData.config} />
    </div>
  );
}
