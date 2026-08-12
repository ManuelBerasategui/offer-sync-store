import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/gracias")({
  head: () => ({
    meta: [
      { title: "¡Gracias por tu compra! — Te importamos" },
      {
        name: "description",
        content: "Recibimos tu pedido de productos importados. Te contactamos para coordinar el envío.",
      },
      { property: "og:title", content: "¡Gracias por tu compra! — Te importamos" },
      { property: "og:description", content: "Pedido confirmado. Coordinamos el envío por WhatsApp." },
    ],
  }),
  component: GraciasPage,
});

function GraciasPage() {
  const cart = useCart();
  useEffect(() => {
    cart.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-center">
      <div className="max-w-md">
        <h1 className="text-4xl">¡Gracias por tu compra!</h1>
        <p className="mt-4 text-muted-foreground">
          Recibimos tu pedido. Te escribimos para coordinar el envío.
        </p>
        <Link to="/catalogo" className="btn-base grad-urgente mt-8 text-primary-foreground">
          Seguir comprando
        </Link>
      </div>
    </main>
  );
}
