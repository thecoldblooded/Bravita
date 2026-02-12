
-- 1. Enable pg_net if not enabled
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        CREATE EXTENSION IF NOT EXISTS pg_net;
    END IF;
END $$;

-- 2. Create the trigger function in public schema (safer)
CREATE OR REPLACE FUNCTION public.handle_user_confirmation_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when email_confirmed_at transitions from NULL to NOT NULL
    IF (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) THEN
        PERFORM net.http_post(
            url := 'https://xpmbnznsmsujjuwumfiw.supabase.co/functions/v1/send-welcome-email',
            headers := '{"Content-Type": "application/json", "x-bravita-secret": "bravita-welcome-secret-2026"}'::jsonb,
            body := jsonb_build_object('user_id', NEW.id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create it on auth.users
DROP TRIGGER IF EXISTS on_auth_user_confirmed_email ON auth.users;

CREATE TRIGGER on_auth_user_confirmed_email
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_confirmation_email();
;
