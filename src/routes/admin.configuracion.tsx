import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { Plus, X, Save, Settings2 } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { AdminHeader } from "@/components/AdminHeader";
import { storeQueryOptions } from "@/lib/store-query";
import { useAuth } from "@/hooks/useAuth";
import {
  getAdminProducts,
  upsertCategoryRules,
  testAdminResendEmail,
  getCouponUsagesSummary,
  type CategoryRuleInput,
} from "@/lib/products.functions";
import {
  getCampaignsSummary,
  createNewsletterCampaign,
  sendNextCampaignBatch,
  sendCampaignTestEmail,
  type CampaignSummary,
} from "@/lib/newsletter.functions";
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
  const queryClient = useQueryClient();

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

  // Cupón Promocional
  const [couponActive, setCouponActive] = useState<boolean>(
    (config["promo_cupon_activo"] ?? "SI").toUpperCase() === "SI",
  );
  const [couponCode, setCouponCode] = useState<string>(
    config["promo_cupon_codigo"] ?? "TEIMPORTAMOS",
  );
  const [couponDiscountPct, setCouponDiscountPct] = useState<string>(
    config["promo_cupon_descuento_pct"] ?? "5",
  );
  const [couponUsageCount, setCouponUsageCount] = useState<number | null>(null);
  const [testEmailTarget, setTestEmailTarget] = useState<string>("");

  // Estado para Campañas de Email por Tandas
  const [newsletterSummary, setNewsletterSummary] = useState<CampaignSummary | null>(null);
  const [batchSize, setBatchSize] = useState<number>(50);
  const [sendingBatch, setSendingBatch] = useState<boolean>(false);
  const [testCampaignEmail, setTestCampaignEmail] = useState<string>("manuelberasategui1@gmail.com");
  const [sendingCampaignTest, setSendingCampaignTest] = useState<boolean>(false);
  const [batchMsg, setBatchMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [showNewCampaignModal, setShowNewCampaignModal] = useState<boolean>(false);
  const [creatingCampaign, setCreatingCampaign] = useState<boolean>(false);
  const [campaignForm, setCampaignForm] = useState({
    subject: "",
    headline: "",
    content: "",
    cta_text: "Ver Ofertas en la Tienda",
    cta_url: "https://teimportamosarg.com/catalogo",
    coupon_code: "",
  });

  async function loadNewsletterData() {
    try {
      const summary = await getCampaignsSummary();
      setNewsletterSummary(summary);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetch("https://dolarapi.com/v1/dolares/cripto")
      .then((res) => res.json())
      .then((data: { venta?: number }) => {
        if (data?.venta) setLiveUsdt(Math.round(data.venta));
      })
      .catch(() => { });
    
    void loadNewsletterData();
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

      // Cargar usos registrados del cupón y newsletter
      getCouponUsagesSummary({ data: { email, token } })
        .then((res) => {
          if (typeof res?.count === "number") setCouponUsageCount(res.count);
        })
        .catch(() => { });

      void loadNewsletterData();

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

      // Mapeo canónico de nombres
      const canonicalNames: Record<string, string> = {
        "mates": "Mates",
        "perfumes arabes": "Perfumes Árabes",
        "perfumes disenador": "Perfumes Diseñador",
        "suplementos": "Suplementación",
        "tecnologia": "Tecnología",
        "zapatillas": "Zapatillas",
      };

      const catMap = new Map<string, string>();
      for (const c of [...baseCatsFromProds, ...Object.keys(existing)]) {
        const norm = normCat(c);
        if (norm === "perfumes" || norm === "perfume" || norm === "suplementacion" || norm === "mate") continue;
        if (!catMap.has(norm)) {
          const canonical = canonicalNames[norm] ?? (c.charAt(0).toUpperCase() + c.slice(1));
          catMap.set(norm, canonical);
        }
      }

      const catList = Array.from(catMap.values());
      setCategories(catList);

      const initialRules: Record<string, CatRuleForm> = {};
      for (const [norm, disp] of catMap.entries()) {
        const r = existing[norm];
        initialRules[disp] = {
          displayName: disp,
          discountTiers: r?.discountTiers?.length
            ? r.discountTiers.map((t) => ({ units: t.units, percent: t.percent }))
            : [],
          minType: r?.minType ?? "none",
          minValue: r?.minValue ? String(r.minValue) : "",
        };
      }
      setRules(initialRules);
    } catch (err) {
      if (categories.length === 0) {
        setError(err instanceof Error ? err.message : "Error al cargar categorías.");
      }
    } finally {
      setLoading(false);
    }
  }

  const initialLoadedRef = useRef(false);

  useEffect(() => {
    if (!authLoading) {
      if (!userId) {
        void navigate({ to: "/", replace: true });
      } else if (!initialLoadedRef.current) {
        initialLoadedRef.current = true;
        void loadCategories(true);
      }
    }
  }, [authLoading, userId, navigate]);

  function handleAddTier(cat: string) {
    setRules((prev) => {
      const cur = prev[cat];
      if (!cur) return prev;
      return {
        ...prev,
        [cat]: {
          ...cur,
          discountTiers: [...cur.discountTiers, { units: 1, percent: 5 }],
        },
      };
    });
  }

  function handleRemoveTier(cat: string, idx: number) {
    setRules((prev) => {
      const cur = prev[cat];
      if (!cur) return prev;
      return {
        ...prev,
        [cat]: {
          ...cur,
          discountTiers: cur.discountTiers.filter((_, i) => i !== idx),
        },
      };
    });
  }

  function handleTierChange(
    cat: string,
    idx: number,
    field: keyof TierForm,
    val: number
  ) {
    setRules((prev) => {
      const cur = prev[cat];
      if (!cur) return prev;
      const updated = cur.discountTiers.map((t, i) =>
        i === idx ? { ...t, [field]: val } : t
      );
      return { ...prev, [cat]: { ...cur, discountTiers: updated } };
    });
  }

  function handleMinTypeChange(cat: string, minType: CatRuleForm["minType"]) {
    setRules((prev) => {
      const cur = prev[cat];
      if (!cur) return prev;
      return { ...prev, [cat]: { ...cur, minType } };
    });
  }

  function handleMinValueChange(cat: string, minValue: string) {
    setRules((prev) => {
      const cur = prev[cat];
      if (!cur) return prev;
      return { ...prev, [cat]: { ...cur, minValue } };
    });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccessMsg("");
    try {
      const ruleInputs: CategoryRuleInput[] = Object.entries(rules).map(([_, r]) => ({
        category: r.displayName,
        discountTiers: r.discountTiers
          .map((t) => ({ units: Number(t.units) || 0, percent: Number(t.percent) || 0 }))
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
          couponConfig: {
            activo: couponActive,
            codigo: couponCode,
            descuentoPct: Number(couponDiscountPct) || 5,
          },
        },
      });
      if (res.error) { setError(res.error); return; }
      // Invalidar la cache para que el próximo F5 lea los nuevos valores
      void queryClient.invalidateQueries({ queryKey: ["store"] });
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
      const target = testEmailTarget.trim() || userEmail;
      const res = await testAdminResendEmail({
        data: {
          email: userEmail,
          token: userToken,
          targetEmail: target,
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

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    setCreatingCampaign(true);
    setError("");
    try {
      const res = await createNewsletterCampaign({ data: campaignForm });
      if (res.success) {
        setShowNewCampaignModal(false);
        setCampaignForm({
          subject: "",
          headline: "",
          content: "",
          cta_text: "Ver Ofertas en la Tienda",
          cta_url: "https://teimportamosarg.com/catalogo",
          coupon_code: "",
        });
        setBatchMsg({
          success: true,
          text: "¡Campaña creada con éxito! Ya podés enviar la primera tanda.",
        });
        await loadNewsletterData();
      } else {
        setError(res.error || "Error al crear la campaña.");
      }
    } catch (err: any) {
      setError(err?.message || "Error al crear la campaña.");
    } finally {
      setCreatingCampaign(false);
    }
  }

  async function handleSendBatch(campaignId: string) {
    setSendingBatch(true);
    setBatchMsg(null);
    try {
      const res = await sendNextCampaignBatch({
        data: {
          campaignId,
          batchSize,
        },
      });
      setBatchMsg({
        success: res.success,
        text: res.message || (res.success ? "Tanda enviada correctamente." : res.error || "Error al enviar tanda."),
      });
      await loadNewsletterData();
    } catch (err: any) {
      setBatchMsg({
        success: false,
        text: err?.message || "Error al procesar la tanda.",
      });
    } finally {
      setSendingBatch(false);
    }
  }

  async function handleSendCampaignTest(campaignId: string) {
    if (!testCampaignEmail.trim()) {
      setBatchMsg({ success: false, text: "Ingresá un correo de prueba válido." });
      return;
    }
    setSendingCampaignTest(true);
    setBatchMsg(null);
    try {
      const res = await sendCampaignTestEmail({
        data: {
          campaignId,
          targetEmail: testCampaignEmail.trim(),
        },
      });
      setBatchMsg({
        success: res.success,
        text: res.message || res.error || "Email de prueba enviado.",
      });
    } catch (err: any) {
      setBatchMsg({
        success: false,
        text: err?.message || "Error al enviar email de prueba.",
      });
    } finally {
      setSendingCampaignTest(false);
    }
  }

  /* ─── Guards ────────────────────────────────────────── */

  if (!authLoading && (!user || isAuthorized === false)) {
    if (typeof window !== "undefined") {
      window.location.replace("/");
    }
    return null;
  }

  if (authLoading || isAuthorized === null || loading) {
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

        {/* Cupón Promocional de Lanzamiento (Switch ON/OFF) */}
        <div className="mb-6 rounded-2xl border border-primary/30 bg-card p-3.5 sm:p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎟️</span>
              <div>
                <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
                  Cupón Promocional de Lanzamiento
                </h2>
                <p className="text-xs text-muted-foreground">
                  Válido 1 sola vez por cuenta registrada. Podés desactivarlo manualmente en cualquier momento.
                </p>
              </div>
            </div>

            {/* Switch Toggle Button */}
            <div className="flex items-center gap-3 bg-surface border border-border px-3 py-1.5 rounded-xl">
              <span className="text-xs font-semibold text-foreground">
                {couponActive ? "🟢 Cupón ACTIVO" : "⚪ Cupón APAGADO"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={couponActive}
                onClick={() => setCouponActive(!couponActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${couponActive ? "bg-primary" : "bg-muted"
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${couponActive ? "translate-x-5" : "translate-x-0"
                    }`}
                />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground">Código del cupón</span>
              <input
                type="text"
                className="input-base font-mono uppercase font-bold tracking-wider text-primary"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="TEIMPORTAMOS"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-muted-foreground">Descuento (%)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={90}
                  className="input-base w-24 font-bold text-primary"
                  value={couponDiscountPct}
                  onChange={(e) => setCouponDiscountPct(e.target.value)}
                />
                <span className="text-xs font-semibold text-muted-foreground">% OFF en el total</span>
              </div>
            </label>

            <div className="rounded-xl border border-border/80 bg-surface/50 p-2.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Canjes registrados:</span>
              <span className="text-sm font-bold text-foreground tabular-nums">
                {couponUsageCount !== null ? `${couponUsageCount} cuenta${couponUsageCount !== 1 ? "s" : ""}` : "—"}
              </span>
            </div>
          </div>
        </div>

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
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Configurá tu API Key de Resend para despachar las notificaciones de ventas a los administradores y la confirmación de compra al cliente.
          </p>

          {testEmailMsg && (
            <div
              className={`mb-4 rounded-xl p-3 text-xs font-medium border ${testEmailMsg.success
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-destructive/10 text-destructive border-destructive/20"
                }`}
            >
              {testEmailMsg.text}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
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

          {/* Probador de envío a destinatario */}
          <div className="flex flex-wrap items-end gap-2 pt-3 border-t border-border/60">
            <label className="flex flex-col gap-1 flex-1 min-w-[220px]">
              <span className="text-xs font-semibold text-muted-foreground">Probar envío de confirmación de compra a:</span>
              <input
                type="email"
                className="input-base"
                value={testEmailTarget}
                onChange={(e) => setTestEmailTarget(e.target.value)}
                placeholder={userEmail || "cliente@ejemplo.com"}
              />
            </label>
            <button
              type="button"
              onClick={() => void handleTestEmail()}
              disabled={testingEmail || saving}
              className="rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors shrink-0"
            >
              {testingEmail ? "Enviando prueba..." : "Enviar email de prueba al cliente"}
            </button>
          </div>

          {/* Registro del último envío */}
          {(config["last_email_error"] || config["last_email_success"]) && (
            <div className="mt-3 space-y-1.5 pt-2 border-t border-border/40 text-[11px]">
              {config["last_email_success"] && (
                <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Último envío exitoso: {config["last_email_success"]}
                </p>
              )}
              {config["last_email_error"] && (
                <p className="text-destructive font-mono bg-destructive/10 p-2 rounded-lg break-all">
                  ⚠️ Último error de Resend: {config["last_email_error"]}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Campañas de Email por Tandas y Desuscripción ── */}
        <div className="mb-6 rounded-2xl border border-primary/30 bg-card p-3.5 sm:p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">📧</span>
              <div>
                <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
                  Campañas de Email Promocionales (Envíos por Tandas)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Enviá ofertas a tus clientes registrados respetando el límite diario de Resend (100/día) con tracking anti-duplicados y desuscripción obligatoria.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-surface border border-border px-3 py-1.5 rounded-xl text-xs">
              <span className="text-muted-foreground">Suscriptores:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {newsletterSummary?.activeSubscribersCount ?? "—"} activos
              </span>
              {newsletterSummary && newsletterSummary.unsubscribedCount > 0 && (
                <span className="text-muted-foreground">
                  ({newsletterSummary.unsubscribedCount} desuscritos)
                </span>
              )}
            </div>
          </div>

          {batchMsg && (
            <div
              className={`my-3 rounded-xl p-3 text-xs font-medium border ${
                batchMsg.success
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-destructive/10 text-destructive border-destructive/20"
              }`}
            >
              {batchMsg.text}
            </div>
          )}

          {/* Campaña Activa */}
          {newsletterSummary?.activeCampaign ? (
            <div className="mt-4 rounded-xl border border-border/80 bg-surface/50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Campaña Activa en Curso
                  </span>
                  <h3 className="text-sm font-bold text-foreground mt-1">
                    {newsletterSummary.activeCampaign.subject}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Título: &quot;{newsletterSummary.activeCampaign.headline}&quot;
                    {newsletterSummary.activeCampaign.coupon_code ? ` • Cupón: ${newsletterSummary.activeCampaign.coupon_code}` : ""}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNewCampaignModal(true)}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground underline"
                >
                  + Reemplazar con nueva campaña
                </button>
              </div>

              {/* Barra de Progreso de Tandas */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Progreso de entrega:</span>
                  <span className="text-foreground">
                    {newsletterSummary.activeCampaign.sent_count} / {newsletterSummary.activeCampaign.total_target} enviados
                    ({Math.round((newsletterSummary.activeCampaign.sent_count / Math.max(1, newsletterSummary.activeCampaign.total_target)) * 100)}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round((newsletterSummary.activeCampaign.sent_count / Math.max(1, newsletterSummary.activeCampaign.total_target)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Controles de Envío por Tanda */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Tamaño de tanda:</span>
                  <div className="flex gap-1">
                    {[30, 50, 80].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setBatchSize(sz)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                          batchSize === sz
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground">correos por día</span>
                </div>

                <button
                  type="button"
                  onClick={() => void handleSendBatch(newsletterSummary.activeCampaign!.id)}
                  disabled={sendingBatch || newsletterSummary.pendingInActiveCampaign <= 0}
                  className="btn-base bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2 text-xs font-bold px-4 py-2 disabled:opacity-50"
                >
                  <span>
                    {sendingBatch
                      ? "Enviando tanda..."
                      : newsletterSummary.pendingInActiveCampaign <= 0
                        ? "✅ Todos los clientes alcanzados"
                        : `🚀 Enviar tanda de hoy (${Math.min(batchSize, newsletterSummary.pendingInActiveCampaign)} correos)`}
                  </span>
                </button>
              </div>

              {/* Sección de Prueba a Email Específico */}
              <div className="flex flex-wrap items-end gap-2 pt-3 border-t border-border/60 bg-muted/30 -mx-4 -mb-3 p-3.5 rounded-b-xl">
                <label className="flex flex-col gap-1 flex-1 min-w-[220px]">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    🧪 Probar campaña antes de enviar (sin afectar a clientes):
                  </span>
                  <input
                    type="email"
                    className="input-base text-xs"
                    value={testCampaignEmail}
                    onChange={(e) => setTestCampaignEmail(e.target.value)}
                    placeholder="manuelberasategui1@gmail.com"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void handleSendCampaignTest(newsletterSummary.activeCampaign!.id)}
                  disabled={sendingCampaignTest}
                  className="rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors shrink-0"
                >
                  {sendingCampaignTest ? "Enviando prueba..." : "Enviar prueba a mi correo"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center space-y-3">
              <p className="text-xs text-muted-foreground">
                No hay ninguna campaña activa en este momento. Podés crear una para promocionar nuevos productos o descuentos.
              </p>
              <button
                type="button"
                onClick={() => setShowNewCampaignModal(true)}
                className="btn-base bg-primary text-primary-foreground hover:opacity-90 text-xs font-bold px-4 py-2 inline-flex items-center gap-2"
              >
                + Crear Nueva Campaña Promocional
              </button>
            </div>
          )}

          {/* Formulario / Modal para Crear Campaña */}
          {showNewCampaignModal && (
            <div className="mt-4 rounded-xl border border-primary/40 bg-card p-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="text-sm font-bold text-foreground">Redactar Nueva Campaña de Email</h3>
                <button
                  type="button"
                  onClick={() => setShowNewCampaignModal(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕ Cerrar
                </button>
              </div>

              <form onSubmit={handleCreateCampaign} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-muted-foreground">Asunto del Email *</span>
                    <input
                      type="text"
                      required
                      className="input-base"
                      value={campaignForm.subject}
                      onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                      placeholder="ej: 🔥 ¡Llegaron novedades a Te Importamos! 20% OFF"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-muted-foreground">Título Principal (dentro del correo) *</span>
                    <input
                      type="text"
                      required
                      className="input-base"
                      value={campaignForm.headline}
                      onChange={(e) => setCampaignForm({ ...campaignForm, headline: e.target.value })}
                      placeholder="ej: Nuevos ingresos de electrónica y perfumería"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1">
                  <span className="font-semibold text-muted-foreground">Mensaje / Oferta *</span>
                  <textarea
                    required
                    rows={4}
                    className="input-base resize-y"
                    value={campaignForm.content}
                    onChange={(e) => setCampaignForm({ ...campaignForm, content: e.target.value })}
                    placeholder="Escribí el cuerpo del correo. Podés usar párrafos separados para que se vea limpio."
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-muted-foreground">Cupón opcional</span>
                    <input
                      type="text"
                      className="input-base font-mono uppercase font-bold text-primary"
                      value={campaignForm.coupon_code}
                      onChange={(e) => setCampaignForm({ ...campaignForm, coupon_code: e.target.value.toUpperCase() })}
                      placeholder="ej: PROMO10"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-muted-foreground">Texto del Botón CTA</span>
                    <input
                      type="text"
                      className="input-base"
                      value={campaignForm.cta_text}
                      onChange={(e) => setCampaignForm({ ...campaignForm, cta_text: e.target.value })}
                      placeholder="Ver Ofertas en la Tienda"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="font-semibold text-muted-foreground">Enlace del Botón (URL)</span>
                    <input
                      type="url"
                      className="input-base"
                      value={campaignForm.cta_url}
                      onChange={(e) => setCampaignForm({ ...campaignForm, cta_url: e.target.value })}
                      placeholder="https://teimportamosarg.com/catalogo"
                    />
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewCampaignModal(false)}
                    className="px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingCampaign}
                    className="btn-base bg-primary text-primary-foreground font-bold hover:opacity-90 disabled:opacity-50"
                  >
                    {creatingCampaign ? "Guardando..." : "Activar Campaña"}
                  </button>
                </div>
              </form>
            </div>
          )}
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
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${rule.minType === opt
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
