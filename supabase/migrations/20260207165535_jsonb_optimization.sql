-- Performance Optimization: Indexing JSONB Fields
-- This allows fast filtering and sorting by order total in the admin panel
CREATE INDEX IF NOT EXISTS idx_orders_total_decimal ON public.orders USING btree (((order_details->>'total')::decimal));

-- GIN index for general JSONB search capability
CREATE INDEX IF NOT EXISTS idx_orders_details_gin ON public.orders USING gin (order_details);
;
