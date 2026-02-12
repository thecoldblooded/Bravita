-- Update handle_user_confirmation_email to NOT set profile_complete = true
-- Profile completion happens on the complete_profile page, not automatically
CREATE OR REPLACE FUNCTION public.handle_user_confirmation_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Case 1: UPDATE (Email confirmed after signup)
    IF (TG_OP = 'UPDATE') THEN
        IF (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) THEN
            -- Update profile with user metadata now that email is confirmed
            -- BUT keep profile_complete = false - user must complete profile manually
            UPDATE public.profiles
            SET 
                phone = COALESCE(NEW.raw_user_meta_data->>'phone', phone),
                full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
                user_type = COALESCE(NEW.raw_user_meta_data->>'user_type', user_type, 'individual'),
                company_name = COALESCE(NEW.raw_user_meta_data->>'company_name', company_name),
                -- profile_complete stays false - controlled by complete_profile page
                updated_at = NOW()
            WHERE id = NEW.id;
            
            -- Send welcome email
            PERFORM net.http_post(
                url := 'https://xpmbnznsmsujjuwumfiw.supabase.co/functions/v1/send-welcome-email',
                headers := '{"Content-Type": "application/json", "x-bravita-secret": "bravita-welcome-secret-2026"}'::jsonb,
                body := jsonb_build_object('user_id', NEW.id)
            );
        END IF;
    -- Case 2: INSERT (New user signed up with auto-confirmed email, e.g. OAuth)
    ELSIF (TG_OP = 'INSERT') THEN
        IF (NEW.email_confirmed_at IS NOT NULL) THEN
            -- Update profile with user metadata
            -- BUT keep profile_complete = false - user must complete profile manually
            UPDATE public.profiles
            SET 
                phone = COALESCE(NEW.raw_user_meta_data->>'phone', phone),
                full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
                user_type = COALESCE(NEW.raw_user_meta_data->>'user_type', user_type, 'individual'),
                company_name = COALESCE(NEW.raw_user_meta_data->>'company_name', company_name),
                -- profile_complete stays false - controlled by complete_profile page
                updated_at = NOW()
            WHERE id = NEW.id;
            
            -- Send welcome email
            PERFORM net.http_post(
                url := 'https://xpmbnznsmsujjuwumfiw.supabase.co/functions/v1/send-welcome-email',
                headers := '{"Content-Type": "application/json", "x-bravita-secret": "bravita-welcome-secret-2026"}'::jsonb,
                body := jsonb_build_object('user_id', NEW.id)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$function$;;
