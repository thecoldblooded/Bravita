-- ============================================
-- ORDERS TABLE SCHEMA UPDATE
-- Mock Payment System Extensions
-- ============================================

-- Add payment and shipping fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'credit_card';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address_id UUID REFERENCES addresses(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add comments for documentation
COMMENT ON COLUMN orders.payment_method IS 'credit_card or bank_transfer';
COMMENT ON COLUMN orders.payment_status IS 'pending, paid, failed';
COMMENT ON COLUMN orders.status IS 'pending, processing, shipped, delivered, cancelled';
COMMENT ON COLUMN orders.shipping_address_id IS 'Reference to delivery address';
COMMENT ON COLUMN orders.tracking_number IS 'Cargo tracking number';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_orders_updated_at ON orders;
CREATE TRIGGER trigger_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_orders_updated_at();

-- ============================================
-- ORDER STATUS HISTORY TABLE
-- Track order status changes
-- ============================================

CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE NOT NULL,
    status VARCHAR(50) NOT NULL,
    note TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for order_status_history
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own order history
DROP POLICY IF EXISTS "Users can view own order status history" ON order_status_history;
CREATE POLICY "Users can view own order status history"
ON order_status_history FOR SELECT
USING (
    order_id IN (SELECT id FROM orders WHERE user_id = auth.uid())
);

-- System can insert status history (via RPC)
DROP POLICY IF EXISTS "System can insert order status history" ON order_status_history;
CREATE POLICY "System can insert order status history"
ON order_status_history FOR INSERT
WITH CHECK (true);

-- ============================================
-- UPDATE ORDERS RLS POLICIES
-- ============================================

-- Allow users to update their own pending orders (for address changes)
DROP POLICY IF EXISTS "Users can update own pending orders" ON orders;
CREATE POLICY "Users can update own pending orders"
ON orders FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
