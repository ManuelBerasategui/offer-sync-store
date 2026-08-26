import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Copy, Check, Search, RefreshCw, MessageCircle, PackageCheck, DollarSign, ShoppingBag, Building2, CheckCircle2 } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { AdminHeader } from "@/components/AdminHeader";
import { storeQueryOptions } from "@/lib/store-query";
import { getAdminPaidOrders, updateOrderStatus, type AdminOrder } from "@/lib/orders.functions";
import { useAuth } from "@/hooks/useAuth";
import { money } from "@/lib/store";

export const Route = createFileRoute("/admin/ordenes")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(storeQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Panel de Órdenes Pagadas — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminOrdenesPage,
});

function AdminOrdenesPage() {
  const { data } = useSuspenseQuery(storeQueryOptions);
  const { config } = data;
  const { user, session, loading: authLoading } = useAuth();

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const userId = user?.id;

  const loadOrders = async (isInitial = false) => {
    if (isInitial || orders.length === 0) setLoading(true);
    setError("");
    try {
      const res = await getAdminPaidOrders({
        data: {
          email: user?.email ?? "",
          token: session?.access_token ?? "",
        },
      });
      if (res.error) {
        if (orders.length === 0) setError(res.error);
        if (res.error.toLowerCase().includes("acceso denegado")) {
          setIsAuthorized(false);
          void navigate({ to: "/", replace: true });
        }
      } else {
        setIsAuthorized(true);
        setOrders(res.orders ?? []);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al cargar las órdenes pagadas.";
      if (orders.length === 0) setError(msg);
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

  // Filtrado en tiempo real
  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const term = search.toLowerCase().trim();
    return orders.filter((o) => {
      const codeMatch = o.order_code.toLowerCase().includes(term);
      const nameMatch = o.nombre.toLowerCase().includes(term);
      const dniMatch = o.dni.toLowerCase().includes(term);
      const emailMatch = o.email.toLowerCase().includes(term);
      const cityMatch = o.ciudad.toLowerCase().includes(term);
      const itemMatch = o.items.some((i) => i.nombre.toLowerCase().includes(term));
      return codeMatch || nameMatch || dniMatch || emailMatch || cityMatch || itemMatch;
    });
  }, [orders, search]);

  // Métricas / KPIs
  const stats = useMemo(() => {
    const totalVentas = orders.reduce((sum, o) => sum + o.total, 0);
    const count = orders.length;
    const promedio = count > 0 ? Math.round(totalVentas / count) : 0;
    return { totalVentas, count, promedio };
  }, [orders]);

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
        setOrders((prev) =>
          prev.map((o) => (o.order_code === orderCode ? { ...o, estado: newStatus } : o)),
        );
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
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      void navigate({ to: "/", replace: true });
    }
  }, [authLoading, user, navigate]);

  if (authLoading || !user || isAuthorized === false) return null;

  // Mostramos una pantalla en blanco o spinner mientras validamos si es admin en el servidor
  if (isAuthorized === null) {
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
          title="Órdenes Pagadas"
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

        {/* Tarjetas de Métricas (KPIs) - Rejilla responsiva compacta */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="card-soft flex flex-col sm:flex-row items-center gap-2 sm:gap-4 p-2.5 sm:p-5 text-center sm:text-left">
            <div className="flex h-8 w-8 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-4 w-4 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">Recaudado</p>
              <p className="text-xs sm:text-2xl font-bold tracking-tight text-foreground truncate">{money(stats.totalVentas)}</p>
            </div>
          </div>

          <div className="card-soft flex flex-col sm:flex-row items-center gap-2 sm:gap-4 p-2.5 sm:p-5 text-center sm:text-left">
            <div className="flex h-8 w-8 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 text-primary">
              <PackageCheck className="h-4 w-4 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">Pedidos</p>
              <p className="text-xs sm:text-2xl font-bold tracking-tight text-foreground">{stats.count}</p>
            </div>
          </div>

          <div className="card-soft flex flex-col sm:flex-row items-center gap-2 sm:gap-4 p-2.5 sm:p-5 text-center sm:text-left">
            <div className="flex h-8 w-8 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-amber/10 text-amber">
              <ShoppingBag className="h-4 w-4 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">Promedio</p>
              <p className="text-xs sm:text-2xl font-bold tracking-tight text-foreground truncate">{money(stats.promedio)}</p>
            </div>
          </div>
        </div>

        {/* Buscador */}
        <div className="mt-8 flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 shadow-xs">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Buscar por cliente, DNI, email, ciudad o código de orden (TI-...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Mensajes de Estado */}
        {error && (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive">
            {error}
          </div>
        )}

        {loading && orders.length === 0 ? (
          <div className="py-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="mt-4 text-sm font-semibold text-muted-foreground">Cargando órdenes pagadas desde la base de datos...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="mt-8 rounded-xl border border-border bg-surface py-16 text-center">
            <PackageCheck className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-3 text-lg font-bold text-foreground">No hay órdenes pagadas para mostrar</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {search ? "No encontramos ninguna orden que coincida con tu búsqueda." : "Aún no se han registrado pagos completados."}
            </p>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-6">
            {filteredOrders.map((order) => {
              const waClient = getWaClientLink(order);
              return (
                <div key={order.id} className="card-soft overflow-hidden p-3.5 sm:p-6 border border-border shadow-sm transition-all hover:border-primary/50">
                  {/* Encabezado de la orden */}
                  <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="font-mono text-base font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">
                        {order.order_code}
                      </span>

                      {order.estado === "pagado" ? (
                        <span className="rounded-md bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                          ✓ Pagado
                        </span>
                      ) : (
                        <span className="rounded-md bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">
                          ⏳ Pendiente
                        </span>
                      )}

                      {order.metodo_pago && (
                        <span className="flex items-center gap-1 rounded-md bg-surface border border-border px-2 py-0.5 text-xs text-muted-foreground capitalize">
                          {order.metodo_pago === "transferencia" && <Building2 className="h-3 w-3 text-emerald-600" />}
                          {order.metodo_pago}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 justify-between sm:justify-end">
                      <span className="text-xs text-muted-foreground font-medium">
                        {formatFecha(order.created_at)}
                      </span>
                      <span className="text-xl font-extrabold text-foreground tabular-nums">
                        {money(order.total)}
                      </span>
                    </div>
                  </div>

                  {/* Cuerpo de la orden */}
                  <div className="mt-5 grid gap-6 md:grid-cols-2">
                    {/* Columna Cliente y Envío */}
                    <div className="flex flex-col justify-between rounded-lg bg-surface/50 p-4 border border-border/60">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                          Datos del Cliente y Envío
                        </h4>
                        <div className="space-y-1.5 text-sm">
                          <p className="font-bold text-foreground text-base">{order.nombre}</p>
                          <p className="text-muted-foreground">
                            <span className="font-semibold text-foreground">DNI:</span> {order.dni || "No especificado"}
                          </p>
                          <p className="text-muted-foreground">
                            <span className="font-semibold text-foreground">Email:</span> {order.email}
                          </p>
                          <p className="text-muted-foreground">
                            <span className="font-semibold text-foreground">Teléfono:</span> {order.telefono}
                          </p>

                          <div className="mt-3 pt-3 border-t border-border/60 text-xs leading-relaxed">
                            <p className="font-semibold text-foreground">
                              {order.ciudad}, {order.provincia} (CP: {order.codigo_postal})
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              <span className="font-bold text-foreground">Transporte:</span> {order.transporte}
                            </p>
                            <p className="text-muted-foreground">
                              <span className="font-bold text-foreground">Sucursal:</span> {order.sucursal_correo}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Acciones para el Cliente y Estado */}
                      <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-2">
                        {order.estado === "pendiente" ? (
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(order.order_code, "pagado")}
                            className="btn-base bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 flex items-center gap-1.5 shadow-sm"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Marcar como Pagado
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleStatusChange(order.order_code, "pendiente")}
                            className="btn-base border border-border bg-background hover:bg-surface text-xs font-semibold py-2 px-3 text-muted-foreground"
                          >
                            Revertir a Pendiente
                          </button>
                        )}

                        {waClient && (
                          <a
                            href={waClient}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-base bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] dark:text-[#25D366] text-xs font-semibold py-2 px-3 flex items-center gap-1.5"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            WhatsApp Cliente
                          </a>
                        )}

                        <button
                          onClick={() => copyShippingLabel(order)}
                          className="btn-base border border-border bg-background hover:bg-surface text-xs font-semibold py-2 px-3 flex items-center gap-1.5 text-foreground"
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
                    <div className="rounded-lg bg-surface/50 p-4 border border-border/60 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                          Productos Comprados ({order.items.reduce((acc, i) => acc + i.qty, 0)} unidades)
                        </h4>
                        <div className="divide-y divide-border/60">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="py-2.5 flex items-center justify-between text-sm">
                              <div className="pr-3">
                                <p className="font-semibold text-foreground leading-snug">{item.nombre}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.qty} x {money(item.unitPrice)}
                                </p>
                              </div>
                              <span className="font-bold text-foreground tabular-nums shrink-0">
                                {money(item.qty * item.unitPrice)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border flex justify-between items-center text-sm font-bold">
                        <span className="text-muted-foreground">Total de la Orden</span>
                        <span className="text-lg text-primary tabular-nums">{money(order.total)}</span>
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
