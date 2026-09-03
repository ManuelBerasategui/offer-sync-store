import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { MailCheck, MailX, CheckCircle, AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react";
import { unsubscribeByToken, resubscribeByToken } from "@/lib/newsletter.functions";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { useSuspenseQuery } from "@tanstack/react-query";
import { storeQueryOptions } from "@/lib/store-query";

const unsubscribeSearchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute("/desuscribir")({
  validateSearch: unsubscribeSearchSchema,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(storeQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Desuscripción de ofertas — Te Importamos" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DesuscribirPage,
});

function DesuscribirPage() {
  const { token } = Route.useSearch();
  const { data } = useSuspenseQuery(storeQueryOptions);
  const { config } = data;

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "resubscribed">("idle");
  const [email, setEmail] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No se proporcionó un enlace de desuscripción válido.");
      return;
    }

    // Auto-procesar desuscripción
    const processUnsubscribe = async () => {
      setStatus("loading");
      try {
        const res = await unsubscribeByToken({ data: { token } });
        if (res.success) {
          setStatus("success");
          setEmail(res.email || "");
        } else {
          setStatus("error");
          setErrorMessage(res.error || "El enlace no es válido o ya caducó.");
        }
      } catch {
        setStatus("error");
        setErrorMessage("Ocurrió un error al procesar la solicitud.");
      }
    };

    void processUnsubscribe();
  }, [token]);

  const handleResubscribe = async () => {
    if (!token) return;
    setStatus("loading");
    try {
      const res = await resubscribeByToken({ data: { token } });
      if (res.success) {
        setStatus("resubscribed");
      } else {
        setStatus("error");
        setErrorMessage(res.error || "No se pudo reactivar la suscripción.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Error al reactivar la suscripción.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SiteHeader config={config} />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 text-center shadow-lg">
          {status === "loading" && (
            <div className="py-8 space-y-4">
              <RefreshCw className="w-10 h-10 text-primary animate-spin mx-auto" />
              <h1 className="text-xl font-bold">Procesando tu solicitud...</h1>
              <p className="text-sm text-muted-foreground">Un momento por favor.</p>
            </div>
          )}

          {status === "success" && (
            <div className="py-4 space-y-4">
              <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
                <MailX className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Te has desuscrito</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                El correo {email ? <strong className="text-foreground">{email}</strong> : "asociado"} ya no recibirá emails promocionales ni ofertas de Te Importamos.
              </p>
              <div className="pt-4 space-y-3">
                <button
                  type="button"
                  onClick={handleResubscribe}
                  className="w-full py-2.5 px-4 rounded-xl border border-input bg-background hover:bg-muted text-sm font-medium transition"
                >
                  ¿Fue un error? Volver a suscribirme
                </button>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md hover:opacity-90 transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Volver a la Tienda
                </Link>
              </div>
            </div>
          )}

          {status === "resubscribed" && (
            <div className="py-4 space-y-4">
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                <MailCheck className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">¡Suscripción reactivada!</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Volverás a recibir nuestras ofertas exclusivas y novedades de importación.
              </p>
              <div className="pt-4">
                <Link
                  to="/catalogo"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md hover:opacity-90 transition"
                >
                  Ver Catálogo de Productos
                </Link>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="py-4 space-y-4">
              <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h1 className="text-xl font-bold text-foreground">Enlace no válido</h1>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              <div className="pt-4">
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-input bg-background hover:bg-muted text-sm font-medium transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Ir al inicio
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <SiteFooter config={config} />
    </div>
  );
}
