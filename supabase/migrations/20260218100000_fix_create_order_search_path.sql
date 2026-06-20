-- Migration: Fix create_order function search_path security
-- Created: 2026-02-18 10:00:00

-- Detects functions where the search_path parameter is not set.
-- Function `public.create_order` has a role mutable search_path
ALTER FUNCTION public.create_order(JSONB, UUID, TEXT, TEXT) SET search_path = '';
