/**
 * Escape de texto para insertarlo en HTML (emails). Evita que datos que escribe el cliente
 * (nombre, dirección, nombre de producto) se interpreten como etiquetas o links (CWE-79/CWE-80).
 */
const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "`": "&#96;",
};

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"'`]/g, (c) => HTML_ESCAPES[c] ?? c);
}

/**
 * JSON para meter dentro de un <script> (JSON-LD). JSON.stringify no escapa "<", así que un nombre
 * de producto con "</script><script>…" cerraría el bloque y ejecutaría código en la página.
 */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
