DROP POLICY IF EXISTS "Enable read access for all users" ON public.installment_rates;
DROP POLICY IF EXISTS "Users read installment rates" ON public.installment_rates;

CREATE POLICY "Allow public read access to installment rates"
ON public.installment_rates
FOR SELECT
TO public
USING (true);;
