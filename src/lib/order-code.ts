/**
 * Código de pedido: "TI-AAMMDD-XXXXXXXX" con 8 caracteres aleatorios criptográficos.
 * Antes eran 4 caracteres de Math.random (~1,7 millones por día): se podían adivinar códigos
 * ajenos y, con muchos pedidos por día, chocaban entre sí.
 */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // sin 0/O ni 1/I para que se lean bien

export function makeOrderCode(date = new Date()): string {
  const stamp = `${String(date.getFullYear()).slice(2)}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const rand = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `TI-${stamp}-${rand}`;
}

/** true si el error de Supabase es por código duplicado (unique violation). */
export function isDuplicateError(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505";
}
