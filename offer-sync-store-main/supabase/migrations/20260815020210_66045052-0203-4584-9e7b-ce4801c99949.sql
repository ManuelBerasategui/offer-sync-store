ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS transporte text NOT NULL DEFAULT 'Correo Argentino';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS transporte text NOT NULL DEFAULT 'Correo Argentino';

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, nombre, dni, telefono, provincia, ciudad, codigo_postal, transporte, sucursal_correo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nombre', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'dni', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'telefono', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'provincia', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'ciudad', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'codigo_postal', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'transporte', ''), 'Correo Argentino'),
    COALESCE(NEW.raw_user_meta_data ->> 'sucursal_correo', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

DROP POLICY IF EXISTS orders_insert_own ON public.orders;
CREATE POLICY orders_insert_own ON public.orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
