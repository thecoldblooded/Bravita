-- Fix database drift manually detected
-- Drops obsoleted functions and ensures site_settings columns match remote schema

-- 1. Drop obsoleted functions that were causing confusion
DROP FUNCTION IF EXISTS public.is_admin CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at CASCADE;

-- 2. Ensure site_settings has all observed columns (vat_rate, shipping_cost, etc.)
-- These were found in the remote DB but missing from known migrations
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS vat_rate NUMERIC DEFAULT 20.0,
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 49.90,
ADD COLUMN IF NOT EXISTS free_shipping_threshold NUMERIC DEFAULT 1500.0;

COMMENT ON COLUMN public.site_settings.vat_rate IS 'Default VAT rate percentage';
COMMENT ON COLUMN public.site_settings.shipping_cost IS 'Standard shipping cost';
COMMENT ON COLUMN public.site_settings.free_shipping_threshold IS 'Minimum cart total for free shipping';
