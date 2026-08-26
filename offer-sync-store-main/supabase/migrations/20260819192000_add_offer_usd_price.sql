ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS precio_oferta_usd numeric(14, 6);

COMMENT ON COLUMN public.products.precio_oferta_usd IS 'Precio de oferta base en USDT. Si está vacío, el primer sync lo calcula a partir del precio de oferta actual en ARS.';
