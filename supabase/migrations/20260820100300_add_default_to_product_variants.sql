ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS es_predeterminada boolean NOT NULL DEFAULT false;

-- Solo puede haber un color predeterminado por producto.
CREATE UNIQUE INDEX IF NOT EXISTS product_variants_one_default_per_product_idx
  ON public.product_variants(product_id)
  WHERE es_predeterminada;

COMMENT ON COLUMN public.product_variants.es_predeterminada IS
  'Color seleccionado inicialmente en la ficha del producto.';

NOTIFY pgrst, 'reload schema';
