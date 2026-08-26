-- Agrega el contador de ventas semanales a la tabla products.
-- La función refresh_ventas_semana() parsea el JSONB items de orders
-- y matchea por nombre (único campo disponible en el JSON de pedidos).
-- pg_cron la ejecuta cada hora automáticamente.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ventas_semana integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.products.ventas_semana IS
  'Unidades vendidas en los últimos 7 días. Se actualiza automáticamente cada hora vía pg_cron.';

-- ─── Función que recalcula las ventas semanales ─────────────────────────────
CREATE OR REPLACE FUNCTION public.refresh_ventas_semana()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Resetea todos a 0 antes de recalcular
  UPDATE public.products SET ventas_semana = 0;

  -- Suma qty de cada item en órdenes de los últimos 7 días (excluye canceladas)
  UPDATE public.products p
  SET ventas_semana = agg.total_qty
  FROM (
    SELECT
      item ->> 'nombre' AS nombre,
      SUM((item ->> 'qty')::integer) AS total_qty
    FROM public.orders o,
         jsonb_array_elements(o.items) AS item
    WHERE o.created_at >= now() - interval '7 days'
      AND o.estado = 'pagado'
      AND (item ->> 'qty') IS NOT NULL
      AND (item ->> 'nombre') IS NOT NULL
    GROUP BY item ->> 'nombre'
  ) agg
  WHERE trim(lower(p.nombre)) = trim(lower(agg.nombre));
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_ventas_semana() TO service_role;

-- ─── Cron job: cada hora en el minuto 5 ────────────────────────────────────
SELECT cron.schedule(
  'refresh-ventas-semana-hourly',
  '5 * * * *',
  'SELECT public.refresh_ventas_semana();'
);
