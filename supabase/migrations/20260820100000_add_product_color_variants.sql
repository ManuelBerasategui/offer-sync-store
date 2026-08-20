-- Variantes opcionales de color. Un producto sin registros en esta tabla se
-- comporta exactamente igual que hasta ahora.
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color text NOT NULL CHECK (btrim(color) <> ''),
  precio numeric NOT NULL CHECK (precio >= 0),
  stock text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, color)
);

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx
  ON public.product_variants(product_id);

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_variants_select_all ON public.product_variants
  FOR SELECT USING (true);

GRANT SELECT ON public.product_variants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;

COMMENT ON TABLE public.product_variants IS
  'Colores opcionales por producto. precio es el precio final de esa variante en ARS.';

NOTIFY pgrst, 'reload schema';
