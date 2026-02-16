-- Fix database drift manually detected
-- Drops obsoleted functions and ensures site_settings columns match remote schema

-- 1. Drop obsoleted functions that were causing confusion
DROP FUNCTION IF EXISTS public.is_admin CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at CASCADE;

-- 2. Ensure site_settings has all observed columns (vat_rate, shipping_cost, etc.)
-- These were found in the remote DB but missing from known migrations
ALTER TABLE public.site_settings 
ADD COLUMN IF NOT EXISTS vat_rate NUMERIC DEFAULT 0.20,
ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 49.90,
ADD COLUMN IF NOT EXISTS free_shipping_threshold NUMERIC DEFAULT 1500.00;

COMMENT ON COLUMN public.site_settings.vat_rate IS 'Default VAT rate percentage (0.20 = 20%)';
COMMENT ON COLUMN public.site_settings.shipping_cost IS 'Standard shipping cost';
COMMENT ON COLUMN public.site_settings.free_shipping_threshold IS 'Minimum cart total for free shipping';

-- 3. Fix support_tickets category check constraint drift
-- Remote DB was missing 'general' in the allowed values
ALTER TABLE public.support_tickets 
DROP CONSTRAINT IF EXISTS support_tickets_category_check;

ALTER TABLE public.support_tickets 
ADD CONSTRAINT support_tickets_category_check 
CHECK (category IN ('order_issue', 'product_info', 'delivery', 'other', 'general'));
