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
