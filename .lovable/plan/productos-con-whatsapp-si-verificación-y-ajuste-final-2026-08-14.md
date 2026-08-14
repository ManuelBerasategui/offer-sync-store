# Productos con Whatsapp = SI: verificación y ajuste final

## Estado actual (verificado)

La lógica ya está implementada:

- `src/lib/store.ts` lee la columna "Whatsapp" de la pestaña Productos (tolera mayúsculas y espacios).
- Tarjetas de producto (home y catálogo): ocultan el precio, muestran "Consultá el precio" y agregan el botón verde "Consultar por WhatsApp" junto a "Ver producto".
- Página de producto: si está en SI, no aparecen "Comprar ya" ni "Agregar al carrito"; en su lugar aparece solo "Consultar por WhatsApp".

En la planilla, hoy todas las filas de la columna "Whatsapp" están en `NO` (las tres de creatina están vacías), así que en la web todavía no se ve aplicado. No hace falta cambiar la lógica para que funcione: al poner `SI` en una fila, ese producto cambia solo.

## Ajuste pendiente

En la página de un producto marcado con `SI` todavía se muestra el selector de cantidad y la lista de descuentos por volumen, que no tienen sentido si no se puede comprar ahí.

- Ocultar el selector de cantidad y los tramos de descuento cuando el producto es solo consulta.
- Dejar el bloque de descripción, reseñas y el contacto de WhatsApp igual.

## Verificación

- Marcar temporalmente un producto con `SI` en la planilla y revisar en el navegador (vista celular y escritorio) que: la tarjeta no muestre precio y tenga el botón de WhatsApp, y que la página del producto no ofrezca comprar ni carrito.
- Volver la celda a su valor original si la marca fue solo para la prueba.

## Detalle técnico

- Envolver el bloque "Cantidad" y la lista de tramos de `src/routes/producto.$id.tsx` en la condición `!consultar`.
- Sin cambios de datos ni de backend.
