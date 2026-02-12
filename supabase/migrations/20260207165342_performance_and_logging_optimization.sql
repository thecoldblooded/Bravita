-- Performance Optimization: Adding Indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);

-- Logging Optimization: Enhanced admin function with audit trails
CREATE OR REPLACE FUNCTION public.admin_update_order_status(
    p_order_id UUID,
    p_new_status TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_old_status TEXT;
BEGIN
    -- Admin check
    IF NOT public.is_admin_user() THEN
        RAISE EXCEPTION 'Unauthorized: Admin permission required';
    END IF;

    -- Get old status for logging
    SELECT status INTO v_old_status FROM public.orders WHERE id = p_order_id;

    -- Validate status
    IF p_new_status NOT IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status: %', p_new_status;
    END IF;

    -- Update order
    UPDATE public.orders
    SET status = p_new_status, updated_at = NOW()
    WHERE id = p_order_id;

    -- Insert into audit log if update was successful
    IF FOUND THEN
        INSERT INTO public.admin_audit_log (admin_user_id, action, target_table, target_id, details)
        VALUES (
            auth.uid(), 
            'update_order_status', 
            'orders', 
            p_order_id, 
            jsonb_build_object('old_status', v_old_status, 'new_status', p_new_status)
        );
    END IF;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.admin_update_order_status IS 'Admin-only: Updates order status and logs the action for auditing.';
;
