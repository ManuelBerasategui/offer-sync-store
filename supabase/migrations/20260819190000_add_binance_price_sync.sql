ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS precio_usd numeric(14, 6),
  ADD COLUMN IF NOT EXISTS precio_actualizado_en timestamptz;

CREATE TABLE IF NOT EXISTS public.pricing_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  enabled boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'binance_p2p_usdt_ars',
  markup_percentage numeric(7, 3) NOT NULL DEFAULT 0,
  rounding_increment integer NOT NULL DEFAULT 10 CHECK (rounding_increment > 0),
  last_rate numeric(14, 4),
  last_rate_at timestamptz,
  last_source_payload jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.pricing_settings (id, rounding_increment)
VALUES (true, 10)
ON CONFLICT (id) DO UPDATE SET rounding_increment = EXCLUDED.rounding_increment;

ALTER TABLE public.pricing_settings ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.pricing_settings TO service_role;

COMMENT ON COLUMN public.products.precio_usd IS 'Precio base en USDT. Si está vacío, el primer sync lo calcula a partir del precio actual en ARS.';
COMMENT ON COLUMN public.pricing_settings.rounding_increment IS 'El precio final siempre se redondea hacia arriba a este múltiplo en ARS.';
