-- Fix shipping_address_id to SET NULL when address is deleted
-- (address will be deleted due to CASCADE from profiles)

-- First drop the existing constraint
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_shipping_address_id_fkey;

-- Re-add with SET NULL (so order is preserved even if address is deleted)
ALTER TABLE public.orders 
ADD CONSTRAINT orders_shipping_address_id_fkey 
FOREIGN KEY (shipping_address_id) 
REFERENCES public.addresses(id) 
ON DELETE SET NULL;;
