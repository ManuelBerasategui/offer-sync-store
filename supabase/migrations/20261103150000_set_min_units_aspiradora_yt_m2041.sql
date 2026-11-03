-- Mínimo de compra propio de 15 unidades para la Mini Aspiradora YT-M2041.
-- metadata.moq_min_units reemplaza el mínimo de la categoría (ver productMinUnitsOf en src/lib/store.ts).
UPDATE public.products
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('moq_min_units', '15')
WHERE nombre ILIKE '%YT-M2041%';
