-- Endurecimiento de seguridad (reglas de tablas / RLS).
-- Se puede correr más de una vez sin romper nada.

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

-- 2) Newsletter: los suscriptores eran legibles y modificables por cualquiera (USING (true)).
--    La desuscripción ya pasa por el servidor con service role, no necesita estas políticas.
DROP POLICY IF EXISTS "Allow public unsubscribe via token" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Allow public view subscriber by token" ON public.newsletter_subscribers;
REVOKE ALL ON public.newsletter_subscribers FROM anon, authenticated;
REVOKE ALL ON public.newsletter_campaigns FROM anon, authenticated;
REVOKE ALL ON public.newsletter_campaign_logs FROM anon, authenticated;

-- 3) Pedidos: un usuario logueado podía insertar pedidos propios con cualquier total o estado
--    ("pagado") directo contra la API. Los pedidos los crea solo el servidor (service role).
DROP POLICY IF EXISTS orders_insert_own ON public.orders;
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM anon, authenticated;

-- 4) Catálogo y configuración: solo lectura para el público. Las escrituras las hace el servidor.
REVOKE INSERT, UPDATE, DELETE ON public.products FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.product_variants FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.banners FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.site_config FROM anon, authenticated;

-- 5) Usos de cupón y precios: sin acceso público
REVOKE INSERT, UPDATE, DELETE ON public.coupon_usages FROM anon, authenticated;
REVOKE ALL ON public.pricing_settings FROM anon, authenticated;
