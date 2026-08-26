-- Aplica un recargo del 7% al campo precio_usd de todos los productos existentes
-- y tambien al precio_oferta_usd cuando exista.
-- Se redondea a 2 decimales.

UPDATE public.products
SET precio_usd = ROUND(precio_usd * 1.07, 2)
WHERE precio_usd IS NOT NULL AND precio_usd > 0;

UPDATE public.products
SET precio_oferta_usd = ROUND(precio_oferta_usd * 1.07, 2)
WHERE precio_oferta_usd IS NOT NULL AND precio_oferta_usd > 0;
