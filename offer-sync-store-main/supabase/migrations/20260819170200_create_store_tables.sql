CREATE TABLE IF NOT EXISTS public.products (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  categoria text,
  precio text,
  precio_oferta text,
  imagen_url text,
  descripcion text,
  destacado text,
  oferta text,
  stock text,
  descuento text,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS products_select_all ON public.products;
CREATE POLICY products_select_all ON public.products FOR SELECT USING (true);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  subtitulo text,
  imagen_url text,
  link text,
  activo text,
  precio text
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS banners_select_all ON public.banners;
CREATE POLICY banners_select_all ON public.banners FOR SELECT USING (true);
GRANT SELECT ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;

CREATE TABLE IF NOT EXISTS public.site_config (
  clave text PRIMARY KEY,
  valor text
);

ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS site_config_select_all ON public.site_config;
CREATE POLICY site_config_select_all ON public.site_config FOR SELECT USING (true);
GRANT SELECT ON public.site_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_config TO authenticated;
GRANT ALL ON public.site_config TO service_role;

NOTIFY pgrst, 'reload schema';
