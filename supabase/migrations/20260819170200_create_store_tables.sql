CREATE TABLE public.products (
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
CREATE POLICY products_select_all ON public.products FOR SELECT USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;

CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  subtitulo text,
  imagen_url text,
  link text,
  activo text,
  precio text
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY banners_select_all ON public.banners FOR SELECT USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;

CREATE TABLE public.site_config (
  clave text PRIMARY KEY,
  valor text
);

ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY site_config_select_all ON public.site_config FOR SELECT USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_config TO authenticated;
GRANT ALL ON public.site_config TO service_role;
