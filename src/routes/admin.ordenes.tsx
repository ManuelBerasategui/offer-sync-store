import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Copy, Check, Search, RefreshCw, MessageCircle, PackageCheck, DollarSign, ShoppingBag, Building2, CheckCircle2, Clock } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { AdminHeader } from "@/components/AdminHeader";
import { storeQueryOptions } from "@/lib/store-query";
import { getAdminPaidOrders, getAdminReservedOrders, updateOrderStatus, type AdminOrder } from "@/lib/orders.functions";
import { useAuth } from "@/hooks/useAuth";
import { money, sanitizeUrl } from "@/lib/store";

export const Route = createFileRoute("/admin/ordenes")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(storeQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Panel de Órdenes — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminOrdenesPage,
});

type Tab = "pagadas" | "reservadas";
type SubFilter = "all" | "transferencia" | "tarjeta" | "mercadopago";

function AdminOrdenesPage() {
  const { data } = useSuspenseQuery(storeQueryOptions);
  const { config } = data;
  const { user, session, loading: authLoading } = useAuth();

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("reservadas");
  const [subFilter, setSubFilter] = useState<SubFilter>("all");

  // Estado independiente para cada tab
  const [paidOrders, setPaidOrders] = useState<AdminOrder[]>([]);
  const [reservedOrders, setReservedOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const userId = user?.id;
  const authPayload = { email: user?.email ?? "", token: session?.access_token ?? "" };

  const loadOrders = async (isInitial = false) => {
    if (isInitial || (paidOrders.length === 0 && reservedOrders.length === 0)) setLoading(true);
    setError("");
    try {
      const [paidRes, reservedRes] = await Promise.all([
        getAdminPaidOrders({ data: authPayload }),
        getAdminReservedOrders({ data: authPayload }),
      ]);

      if (paidRes.error) {
        if (paidRes.error.toLowerCase().includes("acceso denegado")) {
          setIsAuthorized(false);
          void navigate({ to: "/", replace: true });
          return;
        }
        setError(paidRes.error);
      } else {
        setIsAuthorized(true);
        setPaidOrders(paidRes.orders ?? []);
      }

      if (!reservedRes.error) {
        setReservedOrders(reservedRes.orders ?? []);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al cargar las órdenes.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!userId) {
        void navigate({ to: "/", replace: true });
      } else {
        void loadOrders(true);
      }
    }
  }, [authLoading, userId]);

  // Órdenes activas según tab seleccionado
  const activeOrders = tab === "pagadas" ? paidOrders : reservedOrders;

  // Conteos por método de pago para los filtros
  const methodCounts = useMemo(() => {
    const all = activeOrders.length;
    const transfer = activeOrders.filter((o) => (o.metodo_pago ?? "").toLowerCase() === "transferencia").length;
    const card = activeOrders.filter((o) => (o.metodo_pago ?? "").toLowerCase() === "tarjeta").length;
    const mp = activeOrders.filter((o) => (o.metodo_pago ?? "").toLowerCase() === "mercadopago").length;
    return { all, transfer, card, mp };
  }, [activeOrders]);

  // Filtrado en tiempo real por método y búsqueda
  const filteredOrders = useMemo(() => {
    let list = activeOrders;
    if (subFilter !== "all") {
      list = list.filter((o) => (o.metodo_pago ?? "").toLowerCase() === subFilter);
    }
    if (!search.trim()) return list;
    const term = search.toLowerCase().trim();
    return list.filter((o) => {
      const codeMatch = o.order_code.toLowerCase().includes(term);
      const nameMatch = o.nombre.toLowerCase().includes(term);
      const dniMatch = o.dni.toLowerCase().includes(term);
      const emailMatch = o.email.toLowerCase().includes(term);
      const cityMatch = o.ciudad.toLowerCase().includes(term);
      const itemMatch = o.items.some((i) => i.nombre.toLowerCase().includes(term));
      return codeMatch || nameMatch || dniMatch || emailMatch || cityMatch || itemMatch;
    });
  }, [activeOrders, subFilter, search]);

  // Métricas del tab activo
  const stats = useMemo(() => {
    const totalVentas = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const count = filteredOrders.length;
    const promedio = count > 0 ? Math.round(totalVentas / count) : 0;
    return { totalVentas, count, promedio };
  }, [filteredOrders]);

  const handleStatusChange = async (orderCode: string, newStatus: string) => {
    try {
      const res = await updateOrderStatus({
        data: {
          orderCode,
          estado: newStatus,
          token: session?.access_token ?? "",
          email: user?.email ?? "",
        },
      });
      if (res.status === "success") {
        // Actualiza el estado local en ambas listas
        const updater = (prev: AdminOrder[]) =>
          prev.map((o) => (o.order_code === orderCode ? { ...o, estado: newStatus } : o));
        setPaidOrders(updater);
        setReservedOrders(updater);
      }
    } catch (err) {
      console.error("Error actualizando orden:", err);
    }
  };

  const copyShippingLabel = (order: AdminOrder) => {
    const text = `DESTINATARIO: ${order.nombre}
DNI: ${order.dni}
TELÉFONO: ${order.telefono}
EMAIL: ${order.email}
DIRECCIÓN: ${order.ciudad}, ${order.provincia} (CP: ${order.codigo_postal})
TRANSPORTE: ${order.transporte}
SUCURSAL: ${order.sucursal_correo}
ORDEN: ${order.order_code}
TOTAL: ${money(order.total)}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(order.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const formatFecha = (iso: string) => {
    if (!iso) return "";
    try {
      const date = new Date(iso);
      return date.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const getWaClientLink = (order: AdminOrder) => {
    const phone = order.telefono.replace(/\D/g, "");
    if (!phone) return null;
    const cleanPhone = phone.startsWith("54") ? phone : `549${phone}`;
    const text = encodeURIComponent(
      `Hola ${order.nombre}! Te escribimos de Te importamos sobre tu pedido ${order.order_code}.`,
    );
    return sanitizeUrl(`https://wa.me/${cleanPhone}?text=${text}`);
  };

  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      void navigate({ to: "/", replace: true });
    }
  }, [authLoading, user, navigate]);

  if (!authLoading && (!user || isAuthorized === false)) {
    if (typeof window !== "undefined") {
      window.location.replace("/");
    }
    return null;
  }

  if (authLoading || isAuthorized === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader config={config} />

      <main className="mx-auto max-w-[1180px] px-3 py-4 sm:px-6 sm:py-8">
        <AdminHeader
          title="Órdenes"
          subtitle="Gestión de ventas y etiquetas de envío de la tienda."
          currentRoute="ordenes"
          actions={
            <button
              onClick={() => void loadOrders()}
              disabled={loading}
              className="btn-base border border-border bg-surface hover:border-primary flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground sm:px-4 sm:py-2 sm:text-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Actualizar</span>
            </button>
          }
        />

        {/* Tabs */}
        <div className="mt-4 flex gap-1 rounded-xl border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => { setTab("reservadas"); setSearch(""); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              tab === "reservadas"
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-4 w-4" />
            Pendientes / Reservadas
            {reservedOrders.length > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                tab === "reservadas" ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-muted text-muted-foreground"
              }`}>
                {reservedOrders.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setTab("pagadas"); setSearch(""); }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
              tab === "pagadas"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <PackageCheck className="h-4 w-4" />
            Pagadas
            {paidOrders.length > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                tab === "pagadas" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"
              }`}>
                {paidOrders.length}
              </span>
            )}
          </button>
        </div>

        {/* Sub-filtros por método de pago */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap">
          <button
            type="button"
            onClick={() => setSubFilter("all")}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
              subFilter === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-surface text-muted-foreground border-border hover:text-foreground hover:bg-muted/50"
            }`}
          >
            Todas ({methodCounts.all})
          </button>
          <button
            type="button"
            onClick={() => setSubFilter("transferencia")}
            className={`whitespace-nowrap flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
              subFilter === "transferencia"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-surface text-muted-foreground border-border hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Building2 className="h-3 w-3" />
            Transferencia ({methodCounts.transfer})
          </button>
          <button
            type="button"
            onClick={() => setSubFilter("tarjeta")}
            className={`whitespace-nowrap flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
              subFilter === "tarjeta"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-surface text-muted-foreground border-border hover:text-foreground hover:bg-muted/50"
            }`}
          >
            💳 Tarjeta ({methodCounts.card})
          </button>
          <button
            type="button"
            onClick={() => setSubFilter("mercadopago")}
            className={`whitespace-nowrap flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
              subFilter === "mercadopago"
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-surface text-muted-foreground border-border hover:text-foreground hover:bg-muted/50"
            }`}
          >
            🔵 Mercado Pago ({methodCounts.mp})
          </button>
        </div>

        {/* Tarjetas de Métricas (KPIs) */}
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4">
          <div className="card-soft flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-4 p-2.5 sm:p-5 text-center sm:text-left">
            <div className="flex h-7 w-7 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-3.5 w-3.5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                {tab === "pagadas" ? "Recaudado" : "Reservado"}
              </p>
              <p className="text-xs sm:text-2xl font-bold tracking-tight text-foreground truncate">{money(stats.totalVentas)}</p>
            </div>
          </div>

          <div className="card-soft flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-4 p-2.5 sm:p-5 text-center sm:text-left">
            <div className="flex h-7 w-7 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 text-primary">
              <PackageCheck className="h-3.5 w-3.5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">Pedidos</p>
              <p className="text-xs sm:text-2xl font-bold tracking-tight text-foreground">{stats.count}</p>
            </div>
          </div>

          <div className="card-soft flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-4 p-2.5 sm:p-5 text-center sm:text-left">
            <div className="flex h-7 w-7 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShoppingBag className="h-3.5 w-3.5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">Promedio</p>
              <p className="text-xs sm:text-2xl font-bold tracking-tight text-foreground truncate">{money(stats.promedio)}</p>
            </div>
          </div>
        </div>

        {/* Buscador */}
        <div className="mt-4 sm:mt-6 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 sm:px-4 sm:py-3 shadow-xs">
          <Search className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Buscar cliente, DNI, email o código TI-..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs font-bold text-muted-foreground hover:text-foreground shrink-0"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Mensajes de Estado */}
        {error && (
          <div className="mt-4 sm:mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive">
            {error}
          </div>
        )}

        {loading && activeOrders.length === 0 ? (
          <div className="py-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-sm font-semibold text-muted-foreground">
              Cargando órdenes desde la base de datos...
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="mt-6 rounded-xl border border-border bg-surface py-12 text-center">
            {tab === "reservadas" ? (
              <Clock className="mx-auto h-10 w-10 text-muted-foreground/50" />
            ) : (
              <PackageCheck className="mx-auto h-10 w-10 text-muted-foreground/50" />
            )}
            <h3 className="mt-3 text-base font-bold text-foreground">
              {tab === "reservadas" ? "No hay órdenes pendientes" : "No hay órdenes pagadas"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {search
                ? "No encontramos ninguna orden que coincida con tu búsqueda."
                : tab === "reservadas"
                  ? "No hay órdenes pendientes con el filtro seleccionado."
                  : "Aún no se han registrado pagos completados."}
            </p>
          </div>
        ) : (
          <div className="mt-4 sm:mt-6 flex flex-col gap-4 sm:gap-6">
            {filteredOrders.map((order) => {
              const waClient = getWaClientLink(order);
              return (
                <div
                  key={order.id}
                  className={`card-soft overflow-hidden p-3.5 sm:p-6 border shadow-sm transition-all hover:border-primary/50 ${
                    order.estado === "pendiente" ? "border-amber-500/30" : "border-border"
                  }`}
                >
                  {/* Encabezado de la orden */}
                  <div className="flex flex-col gap-2.5 border-b border-border pb-3 sm:pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-3">
                      <span className="font-mono text-sm sm:text-base font-bold text-primary bg-primary/10 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg">
                        {order.order_code}
                      </span>

                      {order.estado === "pagado" ? (
                        <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                          ✓ Pagado
                        </span>
                      ) : (
                        <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] sm:text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">
                          ⏳ Pendiente
                        </span>
                      )}

                      {order.metodo_pago && (
                        <span className="flex items-center gap-1 rounded-md bg-surface border border-border px-2 py-0.5 text-[11px] sm:text-xs text-muted-foreground capitalize">
                          {order.metodo_pago === "transferencia" && <Building2 className="h-3 w-3 text-emerald-600" />}
                          {order.metodo_pago === "tarjeta" && "💳 "}
                          {order.metodo_pago === "mercadopago" && "🔵 "}
                          {order.metodo_pago}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0">
                      <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                        {formatFecha(order.created_at)}
                      </span>
                      <span className="text-lg sm:text-xl font-extrabold text-foreground tabular-nums">
                        {money(order.total)}
                      </span>
                    </div>
                  </div>

                  {/* Cuerpo de la orden */}
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {/* Columna Cliente y Envío */}
                    <div className="flex flex-col justify-between rounded-xl bg-surface/50 p-3.5 sm:p-4 border border-border/60">
                      <div>
                        <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 sm:mb-3">
                          Datos del Cliente y Envío
                        </h4>
                        <div className="space-y-1 text-xs sm:text-sm">
                          <p className="font-bold text-foreground text-sm sm:text-base">{order.nombre}</p>
                          <p className="text-muted-foreground">
                            <span className="font-semibold text-foreground">DNI:</span> {order.dni || "No especificado"}
                          </p>
                          <p className="text-muted-foreground break-all">
                            <span className="font-semibold text-foreground">Email:</span> {order.email}
                          </p>
                          <p className="text-muted-foreground">
                            <span className="font-semibold text-foreground">Teléfono:</span> {order.telefono}
                          </p>

                          <div className="mt-2.5 pt-2.5 border-t border-border/60 text-xs leading-relaxed">
                            <p className="font-semibold text-foreground">
                              {order.ciudad}, {order.provincia} {order.codigo_postal ? `(CP: ${order.codigo_postal})` : ""}
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              <span className="font-bold text-foreground">Transporte:</span> {order.transporte}
                            </p>
                            {order.sucursal_correo && (
                              <p className="text-muted-foreground">
                                <span className="font-bold text-foreground">Sucursal:</span> {order.sucursal_correo}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Acciones para el Cliente y Estado */}
                      <div className="mt-3.5 pt-3 border-t border-border flex flex-col sm:flex-row flex-wrap gap-2">
                        {order.estado === "pendiente" ? (
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(order.order_code, "pagado")}
                            className="btn-base w-full sm:w-auto justify-center bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 flex items-center gap-1.5 shadow-sm"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Marcar como Pagado
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(order.order_code, "pendiente")}
                            className="btn-base w-full sm:w-auto justify-center border border-border bg-background hover:bg-surface text-xs font-semibold py-2 px-3 text-muted-foreground"
                          >
                            Revertir a Pendiente
                          </button>
                        )}

                        {waClient && (
                          <a
                            href={sanitizeUrl(waClient)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-base w-full sm:w-auto justify-center bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] dark:text-[#25D366] text-xs font-semibold py-2 px-3 flex items-center gap-1.5"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp Cliente
                          </a>
                        )}

                        <button
                          onClick={() => copyShippingLabel(order)}
                          className="btn-base w-full sm:w-auto justify-center border border-border bg-background hover:bg-surface text-xs font-semibold py-2 px-3 flex items-center gap-1.5 text-foreground"
                        >
                          {copiedId === order.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ¡Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              Copiar Datos de Envío
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Columna Ítems del Pedido */}
                    <div className="rounded-xl bg-surface/50 p-3.5 sm:p-4 border border-border/60 flex flex-col justify-between">
                      <div>
                        <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 sm:mb-3">
                          Productos Comprados ({order.items.reduce((acc, i) => acc + i.qty, 0)} u.)
                        </h4>
                        <div className="divide-y divide-border/60">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-0 text-xs sm:text-sm">
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground leading-snug break-words">{item.nombre}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {item.qty} x {money(item.unitPrice)}
                                </p>
                              </div>
                              <span className="font-bold text-foreground tabular-nums shrink-0 text-xs sm:text-sm sm:pl-2">
                                {money(item.qty * item.unitPrice)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3.5 pt-3 border-t border-border flex justify-between items-center text-xs sm:text-sm font-bold">
                        <span className="text-muted-foreground">Total</span>
                        <span className="text-base sm:text-lg text-primary tabular-nums">{money(order.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <SiteFooter config={config} />
    </div>
  );
}
