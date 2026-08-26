-- Agrega campos de precio base y moneda base a products y product_variants
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS precio_base numeric(14, 4),
  ADD COLUMN IF NOT EXISTS moneda_base text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS precio_oferta_base numeric(14, 4),
  ADD COLUMN IF NOT EXISTS moneda_oferta_base text;

ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS precio_base numeric(14, 4),
  ADD COLUMN IF NOT EXISTS moneda_base text DEFAULT 'USD';

-- Actualización retroactiva de productos existentes:
-- 1. Si tienen precio_usd, calculamos precio_base = precio_usd / 1.07 (redondeado a 2 decimales)
UPDATE public.products
SET
  precio_base = ROUND(precio_usd / 1.07, 2),
  moneda_base = 'USD'
WHERE precio_usd IS NOT NULL AND precio_usd > 0;

-- 2. Si tienen precio_oferta_usd, calculamos precio_oferta_base
UPDATE public.products
SET
  precio_oferta_base = ROUND(precio_oferta_usd / 1.07, 2),
  moneda_oferta_base = 'USD'
WHERE precio_oferta_usd IS NOT NULL AND precio_oferta_usd > 0;

-- 3. Si solo tenían precio en ARS sin USD
UPDATE public.products
SET
  precio_base = ROUND(CAST(REGEXP_REPLACE(precio, '[^\d]', '', 'g') AS numeric) / 1.07, 0),
  moneda_base = 'ARS'
WHERE (precio_usd IS NULL OR precio_usd = 0)
  AND precio IS NOT NULL
  AND REGEXP_REPLACE(precio, '[^\d]', '', 'g') <> '';

-- 4. Variantes de producto existentes
UPDATE public.product_variants
SET
  precio_base = ROUND(precio_usd / 1.07, 2),
  moneda_base = 'USD'
WHERE precio_usd IS NOT NULL AND precio_usd > 0;

UPDATE public.product_variants
SET
  precio_base = ROUND(precio / 1.07, 0),
  moneda_base = 'ARS'
WHERE (precio_usd IS NULL OR precio_usd = 0)
  AND precio IS NOT NULL AND precio > 0;

COMMENT ON COLUMN public.products.precio_base IS 'Precio base ingresado por el administrador sin recargo.';
COMMENT ON COLUMN public.products.moneda_base IS 'Moneda del precio base ingresado (USD o ARS).';
COMMENT ON COLUMN public.product_variants.precio_base IS 'Precio base de la variante sin recargo.';

NOTIFY pgrst, 'reload schema';
