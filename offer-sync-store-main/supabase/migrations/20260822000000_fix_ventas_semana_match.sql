-- Mejora la funcion refresh_ventas_semana para matchear por productId (campo nuevo en items)
-- y como fallback por prefijo del nombre del producto (para ordenes antiguas sin productId).
--
-- Problema anterior: los items del carrito tienen nombre como
-- "After shave Azul (Presentacion: 100 ml)" o "Zapatilla Nike Azul (Talle: 42)"
-- que nunca matcheaban exactamente con p.nombre = "After shave Azul".
--
-- Solucion:
--   1. Primer intento: match por (item->>'productId') = p.id::text  (ordenes nuevas)
--   2. Fallback:       match cuando p.nombre es prefijo del nombre del item (ordenes antiguas)

CREATE OR REPLACE FUNCTION public.refresh_ventas_semana()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  -- Resetea todos a 0 antes de recalcular
  UPDATE public.products SET ventas_semana = 0;

  -- PASO 1: match por productId (campo explicito guardado en el JSON del item)
  UPDATE public.products p
  SET ventas_semana = ventas_semana + agg.total_qty
  FROM (
    SELECT
      item->>'productId' AS product_id,
      SUM((item->>'qty')::integer) AS total_qty
    FROM public.orders o,
         jsonb_array_elements(o.items) AS item
    WHERE o.created_at >= now() - interval '7 days'
      AND o.estado = 'pagado'
      AND (item->>'qty') IS NOT NULL
      AND (item->>'productId') IS NOT NULL
      AND (item->>'productId') <> ''
    GROUP BY item->>'productId'
  ) agg
  WHERE p.id::text = agg.product_id;

  -- PASO 2: fallback por prefijo de nombre (ordenes sin productId para no doble contar)
  UPDATE public.products p
  SET ventas_semana = ventas_semana + agg.total_qty
  FROM (
    SELECT
      item->>'nombre' AS nombre_item,
      SUM((item->>'qty')::integer) AS total_qty
    FROM public.orders o,
         jsonb_array_elements(o.items) AS item
    WHERE o.created_at >= now() - interval '7 days'
      AND o.estado = 'pagado'
      AND (item->>'qty') IS NOT NULL
      AND (item->>'nombre') IS NOT NULL
      AND (
        (item->>'productId') IS NULL
        OR (item->>'productId') = ''
      )
    GROUP BY item->>'nombre'
  ) agg
  WHERE trim(lower(agg.nombre_item)) LIKE (trim(lower(p.nombre)) || '%')
    AND trim(lower(agg.nombre_item)) != '';
END;
$func$;

GRANT EXECUTE ON FUNCTION public.refresh_ventas_semana() TO service_role;
