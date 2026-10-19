-- Endurecimiento de seguridad (reglas de tablas / RLS).
-- Se puede correr más de una vez sin romper nada, y saltea las tablas que no existan.

-- 0) Tabla privada de usos del cupón (migración 20260831230000, que puede no estar aplicada)
CREATE TABLE IF NOT EXISTS public.coupon_usages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  user_email text NOT NULL DEFAULT '',
  coupon_code text NOT NULL,
  order_code text NOT NULL,
  discount_amount numeric NOT NULL DEFAULT 0,
  used_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.coupon_usages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS coupon_usages_select_own ON public.coupon_usages;
CREATE POLICY coupon_usages_select_own ON public.coupon_usages
  FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT SELECT ON public.coupon_usages TO authenticated;
GRANT ALL ON public.coupon_usages TO service_role;
CREATE INDEX IF NOT EXISTS idx_coupon_usages_code_user ON public.coupon_usages (coupon_code, user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_code_email ON public.coupon_usages (coupon_code, user_email);

-- 1) Usos del cupón guardados en site_config (pública): copiarlos a coupon_usages (privada)
--    y después borrarlos de site_config. Esas filas exponían emails y números de pedido.
DO $$
DECLARE
  r record;
  parts text[];
  v_code text;
  v_ident text;
  v_payload jsonb;
  v_order text;
  v_email text;
  v_user uuid;
BEGIN
  FOR r IN SELECT clave, valor FROM public.site_config WHERE clave LIKE 'coupon\_usage\_%' LOOP
    parts := regexp_match(r.clave, '^coupon_usage_([^_]+)_(.+)$');
    CONTINUE WHEN parts IS NULL;
    v_code := upper(parts[1]);
    v_ident := parts[2];

    BEGIN
      v_payload := r.valor::jsonb;
    EXCEPTION WHEN others THEN
      v_payload := '{}'::jsonb;
    END;

    v_order := COALESCE(NULLIF(v_payload->>'orderCode', ''), 'legacy-' || v_ident);
    v_email := lower(COALESCE(NULLIF(v_payload->>'email', ''),
                              CASE WHEN v_ident LIKE '%@%' THEN v_ident ELSE '' END));
    v_user := NULL;
    IF v_ident ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      SELECT u.id INTO v_user FROM auth.users u WHERE u.id = v_ident::uuid;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.coupon_usages cu
      WHERE cu.coupon_code = v_code
        AND (cu.order_code = v_order
             OR (v_user IS NOT NULL AND cu.user_id = v_user)
             OR (v_email <> '' AND cu.user_email = v_email))
    ) THEN
      INSERT INTO public.coupon_usages (user_id, user_email, coupon_code, order_code, discount_amount)
      VALUES (
        v_user,
        v_email,
        v_code,
        v_order,
        COALESCE(NULLIF(v_payload->>'discount', '')::numeric, 0)
      );
    END IF;
  END LOOP;
END $$;

DELETE FROM public.site_config WHERE clave LIKE 'coupon\_usage\_%';

-- 2..5) Permisos. Cada sentencia se aplica solo si la tabla existe en esta base.
DO $$
DECLARE
  stmt record;
BEGIN
  FOR stmt IN
    SELECT * FROM (VALUES
      -- 2) Newsletter: los suscriptores eran legibles y modificables por cualquiera (USING (true)).
      --    La desuscripción ya pasa por el servidor con service role.
      ('newsletter_subscribers', 'DROP POLICY IF EXISTS "Allow public unsubscribe via token" ON public.newsletter_subscribers'),
      ('newsletter_subscribers', 'DROP POLICY IF EXISTS "Allow public view subscriber by token" ON public.newsletter_subscribers'),
      ('newsletter_subscribers', 'REVOKE ALL ON public.newsletter_subscribers FROM anon, authenticated'),
      ('newsletter_campaigns', 'REVOKE ALL ON public.newsletter_campaigns FROM anon, authenticated'),
      ('newsletter_campaign_logs', 'REVOKE ALL ON public.newsletter_campaign_logs FROM anon, authenticated'),
      -- 3) Pedidos: un usuario logueado podía insertar pedidos propios con cualquier total o estado.
      --    Los pedidos los crea solo el servidor (service role). Ver los propios sigue permitido.
      ('orders', 'DROP POLICY IF EXISTS orders_insert_own ON public.orders'),
      ('orders', 'REVOKE INSERT, UPDATE, DELETE ON public.orders FROM anon, authenticated'),
      -- 4) Catálogo y configuración: solo lectura para el público.
      ('products', 'REVOKE INSERT, UPDATE, DELETE ON public.products FROM anon, authenticated'),
      ('product_variants', 'REVOKE INSERT, UPDATE, DELETE ON public.product_variants FROM anon, authenticated'),
      ('banners', 'REVOKE INSERT, UPDATE, DELETE ON public.banners FROM anon, authenticated'),
      ('site_config', 'REVOKE INSERT, UPDATE, DELETE ON public.site_config FROM anon, authenticated'),
      -- 5) Usos de cupón y precios: sin acceso público de escritura
      ('coupon_usages', 'REVOKE INSERT, UPDATE, DELETE ON public.coupon_usages FROM anon, authenticated'),
      ('pricing_settings', 'REVOKE ALL ON public.pricing_settings FROM anon, authenticated')
    ) AS t(tabla, sql)
  LOOP
    IF to_regclass('public.' || stmt.tabla) IS NOT NULL THEN
      EXECUTE stmt.sql;
    ELSE
      RAISE NOTICE 'Tabla public.% no existe: se saltea "%"', stmt.tabla, stmt.sql;
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
