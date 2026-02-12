
-- 1. Add reserved_stock column
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS reserved_stock INTEGER DEFAULT 0;

-- 2. Update the Insert Trigger (New Order -> Reserve Stock)
CREATE OR REPLACE FUNCTION deduct_stock_on_order()
RETURNS TRIGGER AS $$
DECLARE
    item jsonb;
    product_id uuid;
    quantity int;
    current_stock int;
    product_name text;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.order_details->'items')
    LOOP
        product_id := (item->>'product_id')::uuid;
        quantity := (item->>'quantity')::int;

        SELECT stock, name INTO current_stock, product_name 
        FROM products 
        WHERE id = product_id
        FOR UPDATE;

        IF current_stock < quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product: % (Available: %, Requested: %)', product_name, current_stock, quantity;
        END IF;

        -- Decrease Available, Increase Reserved
        UPDATE products
        SET 
            stock = stock - quantity,
            reserved_stock = reserved_stock + quantity
        WHERE id = product_id;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Create Status Change Trigger (Delivery/Cancel logic)
CREATE OR REPLACE FUNCTION manage_stock_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
    item jsonb;
    product_id uuid;
    quantity int;
BEGIN
    -- Only run if status changed
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- CASE: Delivered (Item leaves warehouse)
    IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.order_details->'items')
        LOOP
            product_id := (item->>'product_id')::uuid;
            quantity := (item->>'quantity')::int;

            -- Decrease Reserved (Physical deduction happened)
            UPDATE products
            SET reserved_stock = reserved_stock - quantity
            WHERE id = product_id;
        END LOOP;
    END IF;

    -- CASE: Cancelled (Item returns to stock)
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.order_details->'items')
        LOOP
            product_id := (item->>'product_id')::uuid;
            quantity := (item->>'quantity')::int;

            -- Increase Available, Decrease Reserved
            -- Note: If it was already delivered, we might need different logic (Return). 
            -- But usually Cancel happens before Delivery. 
            -- If Cancelled AFTER Delivery (Return), we should probably Increase Stock but NOT decrease reserved (since reserved was already 0).
            -- Validating via OLD status:
            
            IF OLD.status = 'delivered' THEN
                -- Return from customer
                UPDATE products SET stock = stock + quantity WHERE id = product_id;
            ELSE
                -- Cancelled before delivery (was reserved)
                UPDATE products 
                SET 
                    stock = stock + quantity,
                    reserved_stock = reserved_stock - quantity
                WHERE id = product_id;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger for Status Change
DROP TRIGGER IF EXISTS trigger_manage_stock_status ON orders;
CREATE TRIGGER trigger_manage_stock_status
AFTER UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION manage_stock_on_status_change();
;
