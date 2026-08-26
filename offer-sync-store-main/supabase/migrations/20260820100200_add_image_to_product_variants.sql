ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS imagen_url text;

COMMENT ON COLUMN public.product_variants.imagen_url IS
  'Imagen específica de la variante. Si está vacía, se usa la imagen principal del producto.';

NOTIFY pgrst, 'reload schema';
