
CREATE OR REPLACE FUNCTION public.handle_user_confirmation_email()
RETURNS TRIGGER AS $$
BEGIN
    -- Case 1: UPDATE (Email confirmed after signup)
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) THEN
            PERFORM net.http_post(
                url := 'https://xpmbnznsmsujjuwumfiw.supabase.co/functions/v1/send-welcome-email',
                headers := '{"Content-Type": "application/json", "x-bravita-secret": "bravita-welcome-secret-2026"}'::jsonb,
                body := jsonb_build_object('user_id', NEW.id)
            );
        END IF;
    -- Case 2: INSERT (New user signed up with auto-confirmed email)
    ELSIF (TG_OP = 'INSERT') THEN
        IF (NEW.email_confirmed_at IS NOT NULL) THEN
            PERFORM net.http_post(
                url := 'https://xpmbnznsmsujjuwumfiw.supabase.co/functions/v1/send-welcome-email',
                headers := '{"Content-Type": "application/json", "x-bravita-secret": "bravita-welcome-secret-2026"}'::jsonb,
                body := jsonb_build_object('user_id', NEW.id)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger to include INSERT
DROP TRIGGER IF EXISTS on_auth_user_confirmed_email ON auth.users;

CREATE TRIGGER on_auth_user_confirmed_email
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_confirmation_email();
;
