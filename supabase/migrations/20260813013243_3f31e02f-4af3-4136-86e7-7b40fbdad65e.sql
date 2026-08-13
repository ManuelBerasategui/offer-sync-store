CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nombre text NOT NULL DEFAULT '',
  dni text NOT NULL DEFAULT '',
  telefono text NOT NULL DEFAULT '',
  provincia text NOT NULL DEFAULT '',
  ciudad text NOT NULL DEFAULT '',
  codigo_postal text NOT NULL DEFAULT '',
  sucursal_correo text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_code text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  nombre text NOT NULL DEFAULT '',
  dni text NOT NULL DEFAULT '',
  telefono text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  provincia text NOT NULL DEFAULT '',
  ciudad text NOT NULL DEFAULT '',
  codigo_postal text NOT NULL DEFAULT '',
  sucursal_correo text NOT NULL DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL DEFAULT 0,
  metodo_pago text NOT NULL DEFAULT 'mercadopago',
  estado text NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_own" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, dni, telefono, provincia, ciudad, codigo_postal, sucursal_correo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nombre', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'dni', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'telefono', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'provincia', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'ciudad', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'codigo_postal', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'sucursal_correo', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();