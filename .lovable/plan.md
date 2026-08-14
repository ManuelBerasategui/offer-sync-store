# Activar el pago con tarjeta en la página

Sí, esa clave sirve: es la Public Key de prueba de Mercado Pago y es pública por diseño, así que puede vivir en el código del sitio (no es un dato secreto). Con ella se activa el formulario de tarjeta dentro de la página, en modo de prueba (no se cobra dinero real).

## Qué se hace

- Se usa la Public Key `TEST-9af6f77e-...` en el formulario de tarjeta, con la variable de entorno como opción prioritaria si más adelante querés cambiarla sin tocar el código.
- En el paso 2 del checkout (después de completar los datos de envío) va a aparecer el formulario real de tarjeta: número, vencimiento, código de seguridad, titular, DNI y cuotas.
- Debajo sigue el botón "Pagar con Mercado Pago" como alternativa.
- Si el pago con tarjeta se aprueba o queda pendiente, se redirige a "Gracias por tu compra" con el número de pedido.
- Si la tarjeta es rechazada, se muestra el motivo y se puede reintentar o usar Mercado Pago.

## Prueba

Con las tarjetas de prueba de Mercado Pago (por ejemplo Visa 4509 9535 6623 3704, cualquier código de 3 dígitos y vencimiento futuro). Cuando pases el token y la key de producción (`APP_USR-...`), los pagos pasan a ser reales sin cambiar nada más.

## Detalle técnico

- `src/components/CardPaymentForm.tsx`: la constante de la key pasa a ser `import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY ?? "TEST-9af6f77e-2e08-4ef5-924b-b67d9c0ba75d"`, y se muestran errores del brick de forma legible.
- El cobro sigue haciéndose server-side en `payOrderWithCard` (`src/lib/orders.functions.ts`) con el access token privado ya guardado.
