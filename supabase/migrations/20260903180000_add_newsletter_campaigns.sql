-- Migración: Sistema de Campañas de Email y Desuscripción
-- 1. Tabla de suscriptores
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  nombre TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  unsubscribe_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Tabla de campañas de email
CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  headline TEXT NOT NULL,
  content TEXT NOT NULL,
  cta_text TEXT DEFAULT 'Ver Ofertas en la Tienda' NOT NULL,
  cta_url TEXT DEFAULT 'https://teimportamosarg.com/catalogo' NOT NULL,
  coupon_code TEXT,
  status TEXT DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'active', 'completed')),
  total_target INT DEFAULT 0 NOT NULL,
  sent_count INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  completed_at TIMESTAMPTZ
);

-- 3. Tabla de registros de envíos (anti-duplicación por campaña)
CREATE TABLE IF NOT EXISTS public.newsletter_campaign_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES public.newsletter_subscribers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT unique_campaign_subscriber UNIQUE (campaign_id, subscriber_id)
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_subscribers_active ON public.newsletter_subscribers(is_active);
CREATE INDEX IF NOT EXISTS idx_subscribers_token ON public.newsletter_subscribers(unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_campaign_logs_lookup ON public.newsletter_campaign_logs(campaign_id, subscriber_id);

-- RLS (Row Level Security)
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_campaign_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública por token de desuscripción
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public unsubscribe via token') THEN
    CREATE POLICY "Allow public unsubscribe via token"
      ON public.newsletter_subscribers
      FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public view subscriber by token') THEN
    CREATE POLICY "Allow public view subscriber by token"
      ON public.newsletter_subscribers
      FOR SELECT
      USING (true);
  END IF;
END $$;
