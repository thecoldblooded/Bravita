
-- Function to deduct stock based on order items
CREATE OR REPLACE FUNCTION deduct_stock_on_order()
RETURNS TRIGGER AS $$
DECLARE
    item jsonb;
    product_id uuid;
    quantity int;
    current_stock int;
    product_name text;
BEGIN
    -- Loop through items in the order_details->'items' array
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.order_details->'items')
    LOOP
        product_id := (item->>'product_id')::uuid;
        quantity := (item->>'quantity')::int;

        -- Get current stock and name for locking and checking
        SELECT stock, name INTO current_stock, product_name 
        FROM products 
        WHERE id = product_id
        FOR UPDATE; -- Lock the row to prevent race conditions

        IF current_stock < quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product: % (Available: %, Requested: %)', product_name, current_stock, quantity;
        END IF;

        -- Deduct stock
        UPDATE products
        SET stock = stock - quantity
        WHERE id = product_id;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to ensure clean slate
DROP TRIGGER IF EXISTS trigger_deduct_stock ON orders;

-- Create Trigger
CREATE TRIGGER trigger_deduct_stock
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION deduct_stock_on_order();

-- Secure Dashboard Stats RPC
CREATE OR REPLACE FUNCTION get_dashboard_stats(start_date timestamptz, end_date timestamptz)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_revenue numeric;
    order_count int;
    daily_sales json;
    is_admin_user boolean;
BEGIN
    -- Check if user is admin
    SELECT is_admin INTO is_admin_user FROM profiles WHERE id = auth.uid();
    
    IF is_admin_user IS NOT TRUE THEN
        RAISE EXCEPTION 'Unauthorized access';
    END IF;

    -- Calculate aggregate stats
    SELECT 
        COALESCE(SUM((order_details->>'total')::numeric), 0),
        COUNT(*)
    INTO total_revenue, order_count
    FROM orders
    WHERE created_at >= start_date AND created_at <= end_date
    AND status != 'cancelled';

    -- Calculate daily sales breakdown
    SELECT json_agg(t) INTO daily_sales
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

    RETURN json_build_object(
        'total_revenue', total_revenue,
        'order_count', order_count,
        'daily_sales', COALESCE(daily_sales, '[]'::json)
    );
END;
$$;
;
