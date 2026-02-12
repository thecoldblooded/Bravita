-- Allow everyone to read active promo codes (for the marquee)
CREATE POLICY "Public can view active promo codes"
ON public.promo_codes
FOR SELECT
TO public
USING (is_active = true);;
