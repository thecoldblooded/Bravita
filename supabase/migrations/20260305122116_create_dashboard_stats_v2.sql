-- Enhanced dashboard stats RPC for comprehensive admin analytics
-- Returns extended data: order status distribution, top products, recent activity
SET ROLE "postgres";

CREATE OR REPLACE FUNCTION public.get_dashboard_stats_v2(start_date timestamp with time zone, end_date timestamp with time zone)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_total_revenue numeric;
    v_order_count int;
    v_cancelled_count int;
    v_new_member_count int;
    v_active_product_count int;
    v_daily_sales json;
    v_order_status_distribution json;
    v_top_products json;
    v_recent_orders json;
    v_recent_cancellations json;
    v_recent_members json;
    is_admin_user boolean;
BEGIN
    -- Check if user is admin
    SELECT is_admin INTO is_admin_user FROM profiles WHERE id = auth.uid();

    IF is_admin_user IS NOT TRUE THEN
        RAISE EXCEPTION 'Unauthorized access';
    END IF;

    -- 1. Aggregate stats (active orders)
    SELECT
        COALESCE(SUM((order_details->>'total')::numeric), 0),
        COUNT(*)
    INTO v_total_revenue, v_order_count
    FROM orders
    WHERE created_at >= start_date AND created_at <= end_date
    AND status != 'cancelled';

    -- 2. Cancelled count
    SELECT COUNT(*)
    INTO v_cancelled_count
    FROM orders
    WHERE created_at >= start_date AND created_at <= end_date
    AND status = 'cancelled';

    -- 3. New member count
    SELECT COUNT(*)
    INTO v_new_member_count
    FROM profiles
    WHERE created_at >= start_date AND created_at <= end_date;

    -- 4. Active product count
    SELECT COUNT(*)
    INTO v_active_product_count
    FROM products
    WHERE is_active = true;

    -- 5. Daily sales breakdown (excluding cancelled)
    SELECT json_agg(t) INTO v_daily_sales
    FROM (
        SELECT
            date_trunc('day', created_at) as date,
            COUNT(*) as count,
            SUM((order_details->>'total')::numeric) as revenue
        FROM orders
        WHERE created_at >= start_date AND created_at <= end_date
        AND status != 'cancelled'
        GROUP BY 1
        ORDER BY 1
    ) t;

    -- 6. Order status distribution
    SELECT json_agg(t) INTO v_order_status_distribution
    FROM (
        SELECT
            status,
            COUNT(*) as count
        FROM orders
        WHERE created_at >= start_date AND created_at <= end_date
        GROUP BY status
        ORDER BY count DESC
    ) t;

    -- 7. Top 5 products by quantity sold
    SELECT json_agg(t) INTO v_top_products
    FROM (
        SELECT
            item->>'product_name' as product_name,
            SUM((item->>'quantity')::int) as total_quantity,
            SUM((item->>'subtotal')::numeric) as total_revenue
        FROM orders,
             jsonb_array_elements(order_details->'items') as item
        WHERE created_at >= start_date AND created_at <= end_date
        AND status != 'cancelled'
        GROUP BY item->>'product_name'
        ORDER BY total_quantity DESC
        LIMIT 5
    ) t;

    -- 8. Recent 5 orders (non-cancelled)
    SELECT json_agg(t) INTO v_recent_orders
    FROM (
        SELECT
            o.id,
            p.full_name,
            (o.order_details->>'total')::numeric as total,
            o.status,
            o.payment_method,
            o.created_at
        FROM orders o
        LEFT JOIN profiles p ON o.user_id = p.id
        WHERE o.status != 'cancelled'
        ORDER BY o.created_at DESC
        LIMIT 5
    ) t;

    -- 9. Recent 5 cancellations
    SELECT json_agg(t) INTO v_recent_cancellations
    FROM (
        SELECT
            o.id,
            p.full_name,
            (o.order_details->>'total')::numeric as total,
            o.cancellation_reason,
            o.created_at
        FROM orders o
        LEFT JOIN profiles p ON o.user_id = p.id
        WHERE o.status = 'cancelled'
        ORDER BY o.updated_at DESC
        LIMIT 5
    ) t;

    -- 10. Recent 5 registered members
    SELECT json_agg(t) INTO v_recent_members
    FROM (
        SELECT
            id,
            full_name,
            email,
            created_at
        FROM profiles
        ORDER BY created_at DESC
        LIMIT 5
    ) t;

    RETURN json_build_object(
        'total_revenue', v_total_revenue,
        'order_count', v_order_count,
        'cancelled_count', v_cancelled_count,
        'new_member_count', v_new_member_count,
        'active_product_count', v_active_product_count,
        'daily_sales', COALESCE(v_daily_sales, '[]'::json),
        'order_status_distribution', COALESCE(v_order_status_distribution, '[]'::json),
        'top_products', COALESCE(v_top_products, '[]'::json),
        'recent_orders', COALESCE(v_recent_orders, '[]'::json),
        'recent_cancellations', COALESCE(v_recent_cancellations, '[]'::json),
        'recent_members', COALESCE(v_recent_members, '[]'::json)
    );
END;
$function$;

-- Grant execute to authenticated only (matching existing pattern)
REVOKE ALL ON FUNCTION public.get_dashboard_stats_v2(timestamp with time zone, timestamp with time zone) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats_v2(timestamp with time zone, timestamp with time zone) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats_v2(timestamp with time zone, timestamp with time zone) TO authenticated;
