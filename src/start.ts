import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

import { handleImageProxy } from "./lib/image-proxy";

const imageProxyMiddleware = createMiddleware().server(async ({ next, request }) => {
  if (request) {
    const url = new URL(request.url);
    if (url.pathname === "/api/img") {
      return await handleImageProxy(request);
    }
  }
  return await next();
});

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === 'serverFn',
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [imageProxyMiddleware, errorMiddleware, csrfMiddleware],
}));
