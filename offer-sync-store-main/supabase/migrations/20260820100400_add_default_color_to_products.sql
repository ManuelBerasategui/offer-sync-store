ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS color_predeterminado text;

COMMENT ON COLUMN public.products.color_predeterminado IS
  'Color inicial del producto. Si es NULL, el producto no usa variantes de color.';

NOTIFY pgrst, 'reload schema';
