-- Fix function search_path security issue
ALTER FUNCTION public.handle_user_confirmation_email() 
SET search_path = public, pg_temp;;
