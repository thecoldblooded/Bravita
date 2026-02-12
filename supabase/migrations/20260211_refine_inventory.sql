-- Ensure reserved_stock column exists and has default 0
ALTER TABLE products ADD COLUMN IF NOT EXISTS reserved_stock INTEGER DEFAULT 0;
UPDATE products SET reserved_stock = 0 WHERE reserved_stock IS NULL;

-- Redefine the function with logic comments
CREATE OR REPLACE FUNCTION manage_inventory() RETURNS TRIGGER AS $$
DECLARE
    item jsonb;
    qty int;
    prod_id uuid;
    prod_name text;
    target_pid uuid;
    old_status text;
    new_status text;
    is_new_active boolean;
    is_old_active boolean;
    is_new_delivered boolean;
    is_old_delivered boolean;
    is_new_cancelled boolean; /* New: Explicit cancelled check */
    is_old_cancelled boolean;
BEGIN
    -- Determine statuses
    IF (TG_OP = 'INSERT') THEN
        old_status := NULL;
        new_status := NEW.status;
    ELSE
        old_status := OLD.status;
        new_status := NEW.status;
    END IF;

    -- 1. Active / Reserved (In Progress)
    -- Includes: Pending, Processing, Preparing, Shipped
    is_new_active := lower(new_status) IN ('pending', 'processing', 'preparing', 'shipped', 
                                           'beklemede', 'işleniyor', 'hazırlanıyor', 'kargoda');
    is_old_active := lower(old_status) IN ('pending', 'processing', 'preparing', 'shipped', 
                                           'beklemede', 'işleniyor', 'hazırlanıyor', 'kargoda');
    
    -- 2. Delivered (Completed / Deducted from Total)
    is_new_delivered := lower(new_status) IN ('delivered', 'teslim edildi');
    is_old_delivered := lower(old_status) IN ('delivered', 'teslim edildi');

    -- 3. Cancelled (Returned to Sellable)
    is_new_cancelled := lower(new_status) IN ('cancelled', 'iptal edildi', 'iade edildi');
    is_old_cancelled := lower(old_status) IN ('cancelled', 'iptal edildi', 'iade edildi');

    -- Loop through items
    IF NEW.order_details->'items' IS NOT NULL THEN
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.order_details->'items')
        LOOP
            qty := (item->>'quantity')::int;
            prod_id := (item->>'product_id')::uuid;
            
            -- Find Product
            SELECT id INTO target_pid FROM products WHERE id = prod_id;

            IF target_pid IS NOT NULL THEN
                
                -- LOGIC: 
                -- stock = Sellable (Available to buy)
                -- reserved_stock = Reserved (In active orders)
                -- Total = stock + reserved_stock

                IF (TG_OP = 'INSERT') THEN
                    -- New Order: Reserve items.
                    -- Sellable decreases, Reserved increases. Total stays same.
                    IF is_new_active THEN
                        UPDATE products 
                        SET stock = GREATEST(0, stock - qty),
                            reserved_stock = COALESCE(reserved_stock, 0) + qty
                        WHERE id = target_pid;
                    
                    ELSIF is_new_delivered THEN
                         -- Insert as delivered (e.g. migration?): Remove from Sellable directly.
                         UPDATE products SET stock = GREATEST(0, stock - qty) WHERE id = target_pid;
                    END IF;

                ELSIF (TG_OP = 'UPDATE') THEN
                    IF new_status IS DISTINCT FROM old_status THEN
                        
                        -- 1. Active -> Delivered
                        -- Item leaves warehouse. Removed from Reserved.
                        -- Sellable stays same (was already removed).
                        -- Total decreases.
                        IF is_old_active AND is_new_delivered THEN
                            UPDATE products 
                            SET reserved_stock = GREATEST(0, COALESCE(reserved_stock, 0) - qty)
                            WHERE id = target_pid;

                        -- 2. Active -> Cancelled
                        -- Order cancelled. Move from Reserved back to Sellable.
                        -- Total stays same.
                        ELSIF is_old_active AND is_new_cancelled THEN
                            UPDATE products 
                            SET reserved_stock = GREATEST(0, COALESCE(reserved_stock, 0) - qty),
                                stock = stock + qty
                            WHERE id = target_pid;

                        -- 3. Delivered -> Cancelled (Return)
                        -- Item returned. Add to Sellable.
                        -- Total increases.
                        ELSIF is_old_delivered AND is_new_cancelled THEN
                            UPDATE products 
                            SET stock = stock + qty 
                            WHERE id = target_pid;

                         -- 4. Cancelled -> Active (Re-activation)
                         -- Move from Sellable to Reserved.
                        ELSIF is_old_cancelled AND is_new_active THEN
                            UPDATE products 
                            SET stock = GREATEST(0, stock - qty),
                                reserved_stock = COALESCE(reserved_stock, 0) + qty
                            WHERE id = target_pid;
                            
                        -- 5. Cancelled -> Delivered (Direct)
                        -- Remove from Sellable.
                        ELSIF is_old_cancelled AND is_new_delivered THEN
                            UPDATE products 
                            SET stock = GREATEST(0, stock - qty)
                            WHERE id = target_pid;

                    END IF;
                END IF;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure Trigger exists
DROP TRIGGER IF EXISTS trigger_manage_inventory ON orders;
CREATE TRIGGER trigger_manage_inventory
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION manage_inventory();
