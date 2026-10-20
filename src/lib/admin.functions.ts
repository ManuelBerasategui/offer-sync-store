import { createServerFn } from "@tanstack/react-start";

import { checkAdmin } from "./admin-auth";

/**
 * ¿La sesión actual es de un administrador? La usa la página para mostrar el link al panel.
 * Responde con la misma lista que protege las funciones del admin (ADMIN_EMAILS en el servidor),
 * así los emails de admin no tienen que estar en el código del navegador.
 */
export const getIsAdmin = createServerFn({ method: "POST" })
  .validator((d: { token?: string }) => ({
    token: typeof d?.token === "string" ? d.token.slice(0, 4000) : undefined,
  }))
  .handler(async ({ data }): Promise<{ isAdmin: boolean }> => {
    if (!data.token) return { isAdmin: false };
    const auth = await checkAdmin(data.token);
    return { isAdmin: auth.ok };
  });
