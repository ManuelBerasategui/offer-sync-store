-- Agrega campos de precios a banners (ofertas del día / combos)
ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS precio_base numeric(14, 4),
  ADD COLUMN IF NOT EXISTS moneda_base text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS precio_usd numeric(14, 4),
  ADD COLUMN IF NOT EXISTS precio_actualizado_en timestamptz;

-- Para banners existentes que tienen precio en ARS:
UPDATE public.banners
SET
  precio_base = ROUND(CAST(REGEXP_REPLACE(precio, '[^\d]', '', 'g') AS numeric) / 1.07, 0),
  moneda_base = 'ARS'
WHERE precio IS NOT NULL
  AND REGEXP_REPLACE(precio, '[^\d]', '', 'g') <> ''
  AND (precio_base IS NULL OR precio_base = 0);

COMMENT ON COLUMN public.banners.precio_base IS 'Precio base del combo/oferta ingresado por el administrador sin recargo.';
COMMENT ON COLUMN public.banners.moneda_base IS 'Moneda del precio base del combo/oferta (USD o ARS).';
COMMENT ON COLUMN public.banners.precio_usd IS 'Precio en USD del combo con recargo incluido.';

NOTIFY pgrst, 'reload schema';
