import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, X, Save, Settings2 } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { storeQueryOptions } from "@/lib/store-query";
import { useAuth } from "@/hooks/useAuth";
import {
  getAdminProducts,
  upsertCategoryRules,
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

  const userEmail = user?.email ?? "";
  const userToken = session?.access_token ?? "";

  async function loadCategories() {
    setLoading(true);
    setError("");
    try {
      const res = await getAdminProducts({ data: { email: userEmail, token: userToken } });
      if (res.error) {
        setError(res.error);
        if (res.error.toLowerCase().includes("acceso denegado")) {
          setIsAuthorized(false);
          void navigate({ to: "/", replace: true });
        }
        return;
      }
      setIsAuthorized(true);

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
      setError(err instanceof Error ? err.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading) {
      if (!user) void navigate({ to: "/", replace: true });
      else void loadCategories();
    }
  }, [authLoading, user, session]);

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
        },
      });
      if (res.error) { setError(res.error); return; }
      setSuccessMsg("¡Configuración guardada!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
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

      <main className="mx-auto max-w-[900px] px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              Panel Admin
            </span>
            <h1 className="mt-2 text-2xl font-bold">Configuración de Categorías</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Descuentos por cantidad y mínimos de compra según categoría.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/productos" className="btn-base bg-muted text-foreground hover:bg-muted/70 text-sm">
              ← Productos
            </Link>
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="btn-base bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? "Guardando..." : "Guardar todo"}
            </button>
          </div>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mb-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
        )}
        {successMsg && (
          <div className="mb-6 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 font-semibold">
            ✓ {successMsg}
          </div>
        )}

        {/* Cotización Dólar para valor inicial */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-bold mb-1 flex items-center gap-2">
            💵 Cotización del Dólar (Cálculo inicial)
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Cuando creás o editás un producto en dólares y dejás el precio en ARS vacío, se calculará al instante como <code className="bg-muted px-1 py-0.5 rounded text-[11px]">USD × Cotización</code> para que nunca se publique a $20 ARS.
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
            <span className="text-xs font-semibold text-muted-foreground">ARS por USD</span>
          </div>
        </div>

        {/* Tarjetas por categoría */}
        <div className="space-y-5">
          {categories.map((cat) => {
            const key = normCat(cat);
            const rule = rules[key];
            if (!rule) return null;

            return (
              <div key={key} className="rounded-2xl border border-border bg-card p-5 space-y-5">
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
