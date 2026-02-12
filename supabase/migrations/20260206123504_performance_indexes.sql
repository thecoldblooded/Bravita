-- Fix performance issues: Add missing indexes for foreign keys
-- Addresses "Unindexed foreign keys" warnings for table promo_logs

CREATE INDEX IF NOT EXISTS idx_promo_logs_order_id ON public.promo_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_promo_logs_promo_code_id ON public.promo_logs(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_logs_user_id ON public.promo_logs(user_id);
;
