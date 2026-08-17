# Arreglar pagos, guardar datos de usuario y mejoras de checkout/producto

Trabajamos sobre el deploy definitivo: https://offer-sync-store.vercel.app/

## 1. "No pudimos registrar el pedido"

El error aparece cuando falla la creación del pedido en la base, antes de tocar Mercado Pago. No es un problema del procesador de pagos, es de escritura del pedido.

Posibles causas:

- En Vercel están cargadas las variables de Mercado Pago, pero el registro del pedido usa otras dos: la URL del backend y la clave de servicio (service role). Si falta alguna, el pedido no se guarda.
- El proyecto de backend nuevo puede no tener la tabla de pedidos con los permisos correctos.

Pasos:

1. Hacer que el error deje de ser genérico: mostrar/loguear el motivo real (falta de configuración vs. error de base vs. permisos), así se identifica en un intento.
2. Revisar en Vercel que estén cargadas las variables del backend nuevo (URL, clave pública y clave de servicio) además de las de Mercado Pago.
3. Verificar que en el backend nuevo existan las tablas de pedidos y perfiles con sus permisos; si falta algo, se aplica una migración.

## 2. Los datos del usuario no llegan a la base

Al registrarse, los datos (nombre, DNI, teléfono, provincia, ciudad, código postal, sucursal, transporte) se envían junto al alta de cuenta y un automatismo del backend los copia a la tabla de perfiles. Ese automatismo existe en el backend viejo; en el nuevo hay que recrearlo. El email y la contraseña viven en el sistema de cuentas del backend (la contraseña siempre encriptada, no se puede guardar en texto).

Pasos:

1. Recrear en el backend nuevo el automatismo que crea el perfil al registrarse, más los permisos de la tabla.
2. Al iniciar sesión y al confirmar un pedido, guardar/actualizar el perfil desde la app: así, incluso si el automatismo no corrió, el perfil queda completo.
3. Verificar con una cuenta de prueba que la fila aparezca en la tabla de perfiles.

## 3. Formulario de datos: aclaración y transporte

- Antes del campo DNI, texto chico: "Ahora te pedimos unos datos para hacer el envío directo a domicilio".
- Antes de la sucursal, un selector "Correo Argentino" / "Vía Cargo".
  - Correo Argentino → "Suc. Correo Argentino más cercana".
  - Vía Cargo → "Suc. Vía Cargo más cercana".
- Se aplica en el registro y en el checkout, y se guarda el transporte elegido junto al perfil y al pedido (requiere agregar una columna de transporte en ambas tablas).

## 4. Descuentos por cantidad en la página de producto

- Se saca el listado tipo "7u. + x% descuento" y la línea "-x% por N u.".
- Debajo de la foto, arriba del selector de cantidad, texto chico: "Llevá más, pagá menos!".
- Al elegir una cantidad que alcanza un descuento de la planilla: el precio original se muestra tachado, al lado el precio con descuento, y en chiquito, en naranja, el porcentaje aplicado.

## 5. Compra mínima para suplementos

Para productos de la categoría suplementos:

- "Agregar al carrito" funciona normal.
- "Comprar ya" abre un aviso: "La compra mínima para suplementos es de $250.000. Agregá más productos al carrito y llevate todo junto!" (se permite avanzar si el total ya alcanza los $250.000).
- En el carrito, si el total de suplementos no llega a $250.000, el pago se bloquea con el mismo aviso.

## Detalle técnico

- `src/lib/orders.functions.ts`: devolver el motivo del fallo (config faltante, error Postgres) en lugar de un texto único; log del error completo del lado servidor.
- Migración en el backend nuevo: función + trigger `handle_new_user`, tablas `profiles` y `orders` con GRANTs y RLS, nueva columna `transporte` en ambas.
- `src/hooks/useAuth.tsx`: upsert del perfil tras login/registro; incluir `transporte`.
- `src/routes/auth.tsx` y `src/components/CheckoutFlow.tsx`: nota informativa, selector de transporte con etiqueta dinámica de sucursal.
- `src/routes/producto.$id.tsx`: quitar la grilla de tiers, agregar "Llevá más, pagá menos!" y precio tachado + precio con descuento + % en naranja.
- `src/lib/store.ts`: helper `isSuplemento(product)` y mínimo `250000`; usarlo en `producto.$id.tsx`, `combo.$index.tsx` y `carrito.tsx` con un diálogo de aviso.
