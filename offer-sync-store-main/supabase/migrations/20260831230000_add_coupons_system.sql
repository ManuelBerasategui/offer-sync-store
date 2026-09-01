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
CREATE POLICY coupon_usages_select_own ON public.coupon_usages FOR SELECT TO authenticated USING (user_id = auth.uid());
GRANT SELECT ON public.coupon_usages TO authenticated;
GRANT ALL ON public.coupon_usages TO service_role;

INSERT INTO public.site_config (clave, valor)
VALUES
  ('promo_cupon_activo', 'SI'),
  ('promo_cupon_codigo', 'TEIMPORTAMOS'),
  ('promo_cupon_descuento_pct', '5')
ON CONFLICT (clave) DO NOTHING;

NOTIFY pgrst, 'reload schema';
