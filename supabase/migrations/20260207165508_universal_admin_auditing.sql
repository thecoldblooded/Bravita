-- Universal Admin Auditing Function
CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS TRIGGER AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    -- Check if the user is an admin
    IF auth.uid() IS NOT NULL THEN
        SELECT is_admin INTO v_is_admin FROM public.profiles WHERE id = auth.uid();

        IF v_is_admin = TRUE THEN
            INSERT INTO public.admin_audit_log (admin_user_id, action, target_table, target_id, details)
            VALUES (
                auth.uid(), 
                TG_OP, 
                TG_TABLE_NAME, 
                COALESCE(NEW.id, OLD.id), 
                jsonb_build_object(
                    'old_data', (CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END),
                    'new_data', (CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END)
                )
            );
        END IF;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers to products
DROP TRIGGER IF EXISTS tr_audit_products ON public.products;
CREATE TRIGGER tr_audit_products
    AFTER INSERT OR UPDATE OR DELETE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

-- Apply triggers to orders (for direct updates like tracking number)
DROP TRIGGER IF EXISTS tr_audit_orders_direct ON public.orders;
CREATE TRIGGER tr_audit_orders_direct
    AFTER UPDATE OR DELETE ON public.orders
    FOR EACH ROW 
    WHEN (pg_trigger_depth() = 0) -- Avoid double logging during RPC calls that already log
    EXECUTE FUNCTION public.log_admin_action();

-- Apply triggers to promo_codes
DROP TRIGGER IF EXISTS tr_audit_promo_codes ON public.promo_codes;
CREATE TRIGGER tr_audit_promo_codes
    AFTER INSERT OR UPDATE OR DELETE ON public.promo_codes
    FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();
;
