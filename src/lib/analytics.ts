import type { PostHog } from "posthog-js";

/**
 * Medición de comportamiento (PostHog): embudo, eventos, grabación de sesiones y tests A/B.
 *
 * - Se activa solo si existe VITE_POSTHOG_KEY (la "Project API key" pública de PostHog,
 *   pensada para ir en el navegador: solo permite enviar eventos, no leerlos).
 * - Las páginas /admin no se registran.
 * - No se envían datos personales (email, DNI, dirección): solo eventos y montos.
 */

type Props = Record<string, string | number | boolean | null | undefined>;

const KEY = import.meta.env["VITE_POSTHOG_KEY"] as string | undefined;
const HOST =
  (import.meta.env["VITE_POSTHOG_HOST"] as string | undefined) || "https://us.i.posthog.com";

let client: PostHog | null = null;
let loading = false;
const queue: Array<[string, Props | undefined]> = [];

function isAdminUrl(url: unknown): boolean {
  if (typeof url !== "string") return false;
  try {
    return new URL(url).pathname.startsWith("/admin");
  } catch {
    return false;
  }
}

export function initAnalytics(): void {
  if (typeof window === "undefined" || !KEY || client || loading) return;
  loading = true;
  void import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(KEY, {
        api_host: HOST,
        // Registra cada cambio de ruta de la SPA como $pageview / $pageleave
        capture_pageview: "history_change",
        capture_pageleave: true,
        // Solo visitantes anónimos salvo que en el futuro se llame a identify()
        person_profiles: "identified_only",
        session_recording: {
          maskAllInputs: true,
        },
        before_send: (event) => {
          if (!event) return null;
          const url = event.properties?.["$current_url"];
          return isAdminUrl(url) ? null : event;
        },
      });
      client = posthog;
      for (const [name, props] of queue.splice(0)) posthog.capture(name, props);
    })
    .catch(() => {
      // Si PostHog no carga (bloqueador de anuncios, red), la tienda sigue funcionando igual
    })
    .finally(() => {
      loading = false;
    });
}

/** Registra un evento del embudo. Nunca lanza errores. */
export function track(name: string, props?: Props): void {
  if (typeof window === "undefined" || !KEY) return;
  try {
    if (client) client.capture(name, props);
    else if (queue.length < 50) queue.push([name, props]);
  } catch {
    // La medición nunca debe romper la tienda
  }
}
