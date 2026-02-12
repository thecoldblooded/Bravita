-- Create a table to track failed promo code attempts
CREATE TABLE IF NOT EXISTS public.promo_code_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    ip_address TEXT,
    attempt_timestamp TIMESTAMPTZ DEFAULT now()
);

-- Index for faster cleanup and checking
CREATE INDEX IF NOT EXISTS idx_promo_attempts_timestamp ON public.promo_code_attempts (attempt_timestamp);
CREATE INDEX IF NOT EXISTS idx_promo_attempts_user ON public.promo_code_attempts (user_id);

-- Updated verify_promo_code with rate limiting
CREATE OR REPLACE FUNCTION public.verify_promo_code(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_promo RECORD;
    v_now timestamptz := now();
    v_user_id UUID := auth.uid();
    v_failed_count integer;
    v_lockout_minutes integer := 10;
    v_max_attempts integer := 5;
BEGIN
    -- 1. Check rate limit (brute force protection)
    -- We check attempts in the last 10 minutes
    SELECT count(*) INTO v_failed_count
    FROM promo_code_attempts
    WHERE user_id = v_user_id
    AND attempt_timestamp > v_now - (v_lockout_minutes || ' minutes')::interval;

    IF v_failed_count >= v_max_attempts THEN
        RETURN jsonb_build_object(
            'valid', false, 
            'message', 'Çok fazla hatalı deneme. Lütfen ' || v_lockout_minutes || ' dakika sonra tekrar deneyin.'
        );
    END IF;

    -- 2. Lookup promo code
    SELECT * INTO v_promo
    FROM promo_codes
    WHERE code ILIKE p_code
    AND is_active = true;

    -- 3. Handle failure
    IF v_promo IS NULL THEN
        -- Log failed attempt
        INSERT INTO promo_code_attempts (user_id) VALUES (v_user_id);
        
        RETURN jsonb_build_object('valid', false, 'message', 'Promosyon kodu geçerli değil');
    END IF;

    -- 4. Check dates
    IF v_promo.start_date IS NOT NULL AND v_promo.start_date > v_now THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Promosyon kodu henüz başlamadı');
    END IF;

    IF v_promo.end_date IS NOT NULL AND v_promo.end_date < v_now THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Promosyon kodu süresi doldu');
    END IF;

    -- 5. Check usage limits
    IF v_promo.usage_limit > 0 AND v_promo.usage_count >= v_promo.usage_limit THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Promosyon kodu kullanım limiti doldu');
    END IF;

    -- 6. Clean up old attempts for this user upon success (optional, but keeps table small)
    DELETE FROM promo_code_attempts WHERE user_id = v_user_id;

    -- 7. Success
    RETURN jsonb_build_object(
        'valid', true,
        'message', 'Promosyon kodu geçerli',
        'discount_type', v_promo.discount_type,
        'discount_value', v_promo.discount_value,
        'min_order_amount', v_promo.min_order_amount,
        'max_discount_amount', v_promo.max_discount_amount
    );
END;
$function$;

-- Cleanup cron-like task (to be run periodically or handled by Supabase)
-- DELETE FROM public.promo_code_attempts WHERE attempt_timestamp < now() - interval '24 hours';
;
