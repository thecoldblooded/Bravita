
-- Resolve database drift for storage and realtime settings.
-- Add missing storage bucket and realtime publication configurations.

BEGIN;

-- 1. Ensure 'public-assets' bucket exists
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('public-assets', 'public-assets', true, false, null, null)
ON CONFLICT (id) DO NOTHING;

-- 2. Add 'orders' table to supabase_realtime publication
-- This enables realtime subscription for updates on orders table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'orders'
    AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END;
$$;

COMMIT;
