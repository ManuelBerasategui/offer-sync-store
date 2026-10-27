-- Endurecimiento de seguridad (2). Se puede correr más de una vez.

-- 1) refresh_ventas_semana() es SECURITY DEFINER y por defecto cualquiera (anon) la podía ejecutar
-- como RPC, forzando un UPDATE de toda la tabla products a voluntad. Solo la usa el cron del
-- servidor (service role), así que se le quita el permiso al público.
-- Se puede correr más de una vez; si la función no existe, no hace nada.
DO $$
BEGIN
  IF to_regprocedure('public.refresh_ventas_semana()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.refresh_ventas_semana() FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.refresh_ventas_semana() TO service_role;
  ELSE
    RAISE NOTICE 'public.refresh_ventas_semana() no existe: nada que hacer';
  END IF;
END $$;

-- 2) El registro del último email enviado (site_config es pública) guardaba el email del cliente y el
-- número de pedido. El código nuevo lo guarda enmascarado; acá se borra el que quedó guardado.
DELETE FROM public.site_config WHERE clave IN ('last_email_success', 'last_email_error');
