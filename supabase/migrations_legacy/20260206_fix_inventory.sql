-- Drop previous trigger to enable clean update
DROP TRIGGER IF EXISTS trigger_manage_inventory ON orders;
DROP FUNCTION IF EXISTS manage_inventory();

-- Create the refined inventory management function
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
    is_new_delivered boolean; /* Changed 'removed' to 'delivered' for clarity */
    is_old_delivered boolean;
    is_new_neutral boolean;
    is_old_neutral boolean;
BEGIN
    -- Determine operation type and statuses
    IF (TG_OP = 'INSERT') THEN
        old_status := NULL;
        new_status := NEW.status;
    ELSE
        old_status := OLD.status;
        new_status := NEW.status;
    END IF;

    -- 1. Active / Reserved Group
    -- Includes: Pending, Processing, Preparing AND SHIPPED (Kargoda)
    -- Logic: Items are effectively 'Reserved'. They are not Sellable, but still in 'Total'.
    is_new_active := lower(new_status) IN ('pending', 'processing', 'preparing', 'shipped', 
                                           'beklemede', 'işleniyor', 'hazırlanıyor', 'kargoda');
    is_old_active := lower(old_status) IN ('pending', 'processing', 'preparing', 'shipped', 
                                           'beklemede', 'işleniyor', 'hazırlanıyor', 'kargoda');
    
    -- 2. Delivered / Finalized Group
    -- Includes: Delivered, Teslim Edildi
    -- Logic: Items are permanently gone. Removed from Total.
    is_new_delivered := lower(new_status) IN ('delivered', 'teslim edildi');
    is_old_delivered := lower(old_status) IN ('delivered', 'teslim edildi');

    -- 3. Neutral / Cancelled Group
    is_new_neutral := NOT is_new_active AND NOT is_new_delivered;
    is_old_neutral := NOT is_old_active AND NOT is_old_delivered;

    -- Loop through items
    IF NEW.order_details->'items' IS NOT NULL THEN
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.order_details->'items')
        LOOP
            qty := (item->>'quantity')::int;
            prod_id := (item->>'product_id')::uuid;
            prod_name := item->>'product_name';

            -- Robust Product Finding
            target_pid := NULL;
            BEGIN
                IF prod_id IS NOT NULL THEN
                    SELECT id FROM products WHERE id = prod_id INTO target_pid;
                END IF; 
                IF target_pid IS NULL AND prod_name IS NOT NULL THEN
                    SELECT id FROM products WHERE name = prod_name LIMIT 1 INTO target_pid;
                END IF;
            EXCEPTION WHEN OTHERS THEN
                IF prod_name IS NOT NULL THEN
                    SELECT id FROM products WHERE name = prod_name LIMIT 1 INTO target_pid;
                END IF;
            END;

            IF target_pid IS NOT NULL THEN
                
                ------------------------------------------------------------------
                -- LOGIC MATRIX
                -- DB Columns: stock = Sellable, reserved_stock = Reserved
                -- Frontend Total = stock + reserved_stock
                ------------------------------------------------------------------

                IF (TG_OP = 'INSERT') THEN
                    -- New Order (Active): Decrement Sellable, Increment Reserved.
                    IF is_new_active THEN
                        UPDATE products 
                        SET reserved_stock = COALESCE(reserved_stock, 0) + qty,
                            stock = GREATEST(0, stock - qty)
                        WHERE id = target_pid;
                    
                    ELSIF is_new_delivered THEN
                        -- Insert as Delivered (Rare): Decrement Sellable immediately.
                        UPDATE products SET stock = GREATEST(0, stock - qty) WHERE id = target_pid;
                    END IF;

                ELSIF (TG_OP = 'UPDATE') THEN
                    
                    IF new_status IS DISTINCT FROM old_status THEN
                        
                        -- 1. Active (Reserved) -> Delivered (Gone)
                        -- Remove from Reserved. 
                        -- Sellable stays same (was already deducted). 
                        -- Total drops (because Reserved drops).
                        IF is_old_active AND is_new_delivered THEN
                            UPDATE products 
                            SET reserved_stock = GREATEST(0, COALESCE(reserved_stock, 0) - qty)
                            WHERE id = target_pid;

                        -- 2. Active (Reserved) -> Cancelled (Neutral)
                        -- Remove from Reserved. Add back to Sellable.
                        -- Total stays same.
                        ELSIF is_old_active AND is_new_neutral THEN
                            UPDATE products 
                            SET reserved_stock = GREATEST(0, COALESCE(reserved_stock, 0) - qty),
                                stock = stock + qty
                            WHERE id = target_pid;

                        -- 3. Delivered (Gone) -> Cancelled (Returned)
                        -- Add back to Sellable. Total increases.
                        ELSIF is_old_delivered AND is_new_neutral THEN
                            UPDATE products SET stock = stock + qty WHERE id = target_pid;

                        -- 4. Cancelled -> Active (Re-order)
                        -- Move from Sellable to Reserved.
                        ELSIF is_old_neutral AND is_new_active THEN
                             UPDATE products 
                             SET reserved_stock = COALESCE(reserved_stock, 0) + qty,
                                 stock = GREATEST(0, stock - qty)
                             WHERE id = target_pid;

                        -- 5. Cancelled -> Delivered (Direct)
                        -- Determine from Sellable.
                        ELSIF is_old_neutral AND is_new_delivered THEN
                             UPDATE products SET stock = GREATEST(0, stock - qty) WHERE id = target_pid;

                        -- 6. Delivered -> Active (Oops, not delivered yet)
                        -- Add back to Reserved. Sellable stays same. Total increases.
                        ELSIF is_old_delivered AND is_new_active THEN
                             UPDATE products SET reserved_stock = COALESCE(reserved_stock, 0) + qty WHERE id = target_pid;
                        END IF;

                    END IF;
                END IF;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create Trigger
CREATE TRIGGER trigger_manage_inventory
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION manage_inventory();

-- Reset Data State (Preserve correct counts)
-- Total Depo: 1000
-- Active Orders (Processing/Pending/Kargoda): 35 items
-- Sellable: 965
-- Reserved: 35
UPDATE products 
SET stock = 965, 
    reserved_stock = 35 
WHERE name = 'Bravita Multivitamin';
