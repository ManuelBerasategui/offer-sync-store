UPDATE public.pricing_settings
SET rounding_increment = 10,
    updated_at = now()
WHERE id = true;
