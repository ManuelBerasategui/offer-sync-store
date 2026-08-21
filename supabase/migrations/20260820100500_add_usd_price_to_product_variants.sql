ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS precio_usd numeric(14, 6),
  ADD COLUMN IF NOT EXISTS precio_actualizado_en timestamptz;

COMMENT ON COLUMN public.product_variants.precio_usd IS
  'Precio base de la variante en USDT. El sincronizador actualiza precio en ARS cada 15 minutos.';

NOTIFY pgrst, 'reload schema';
