-- Endurecimiento de seguridad (3). Se puede correr más de una vez sin romper nada.

-- 1) Tabla privada para claves y registros internos del servidor.
--    Sin políticas de RLS y sin permisos para anon/authenticated: solo la lee el service role.
CREATE TABLE IF NOT EXISTS public.app_secrets (
  clave text PRIMARY KEY,
  valor text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_secrets FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON public.app_secrets FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON public.app_secrets FROM authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT ALL ON public.app_secrets TO service_role';
  END IF;
END $$;

-- 2) La clave de Resend y el registro del último email estaban en site_config, que es pública
--    (la lee cualquier visitante). Se copian a app_secrets y se borran de site_config.
--    Si ya había un valor en app_secrets (cargado desde el panel), no se pisa.
INSERT INTO public.app_secrets (clave, valor)
SELECT clave, valor
FROM public.site_config
WHERE clave IN ('resend_api_key', 'resend_from', 'last_email_success', 'last_email_error')
  AND coalesce(valor, '') <> ''
ON CONFLICT (clave) DO NOTHING;

DELETE FROM public.site_config
WHERE clave IN ('resend_api_key', 'resend_from', 'last_email_success', 'last_email_error');

-- 3) Aunque alguien vuelva a guardar algo privado en site_config, el público no lo puede leer.
--    Mismo criterio que isPrivateConfigKey() en src/lib/store.ts.
DROP POLICY IF EXISTS site_config_select_all ON public.site_config;
DROP POLICY IF EXISTS site_config_select_public ON public.site_config;
CREATE POLICY site_config_select_public ON public.site_config
  FOR SELECT
  USING (
    clave NOT LIKE 'coupon\_usage\_%'
    AND clave NOT LIKE 'last\_email\_%'
    AND clave NOT LIKE 'resend\_%'
    AND clave <> 'promo_cupon_codigo'
    AND clave !~* '(api[_-]?key|secret|token|password|passwd|private|access[_-]?key)'
  );

-- 4) Un cupón, un uso por cuenta y por email: índices únicos. El servidor registra el uso ANTES
--    de crear el pedido, así dos pedidos simultáneos no pueden usar el mismo cupón.
--    Si ya hubiera usos repetidos guardados, no se borra nada: se avisa y se saltea el índice.
DO $$
BEGIN
  IF to_regclass('public.coupon_usages') IS NULL THEN
    RAISE NOTICE 'public.coupon_usages no existe: se saltean los índices';
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.coupon_usages
    WHERE user_id IS NOT NULL
    GROUP BY coupon_code, user_id HAVING count(*) > 1
  ) THEN
    RAISE WARNING 'Hay usos repetidos del cupón por cuenta: no se creó uq_coupon_usages_code_user';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uq_coupon_usages_code_user
      ON public.coupon_usages (coupon_code, user_id) WHERE user_id IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.coupon_usages
    WHERE user_email <> ''
    GROUP BY coupon_code, lower(user_email) HAVING count(*) > 1
  ) THEN
    RAISE WARNING 'Hay usos repetidos del cupón por email: no se creó uq_coupon_usages_code_email';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uq_coupon_usages_code_email
      ON public.coupon_usages (coupon_code, lower(user_email)) WHERE user_email <> '';
  END IF;
END $$;

-- 5) TRUNCATE no respeta RLS: anon/authenticated no deben tenerlo en ninguna tabla.
--    TRIGGER y REFERENCES tampoco los necesitan.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
      EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.%I FROM anon', t.tablename);
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
      EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.%I FROM authenticated', t.tablename);
    END IF;
  END LOOP;
END $$;
