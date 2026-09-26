-- Reduce la frecuencia del cron de ventas_semana de cada hora a cada 6 horas.
-- Impacto: 24 ejecuciones/día → 4 ejecuciones/día (-83% de log ingestion por este job).
-- Los datos de ventas de los últimos 7 días no cambian significativamente en 6 horas,
-- por lo que esta reducción no afecta la experiencia del usuario.

SELECT cron.unschedule('refresh-ventas-semana-hourly');

SELECT cron.schedule(
  'refresh-ventas-semana-6h',
  '5 */6 * * *',
  'SELECT public.refresh_ventas_semana();'
);
