
-- Enable RLS on products table if not already
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow public read access" ON products;
DROP POLICY IF EXISTS "Allow admin update access" ON products;
DROP POLICY IF EXISTS "Allow admin insert access" ON products;
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON products;
DROP POLICY IF EXISTS "Enable update for users based on email" ON products;

-- Create Read Policy (Public)
CREATE POLICY "Allow public read access"
ON products FOR SELECT
TO public
USING (true);

-- Create Update Policy (Admin Only)
CREATE POLICY "Allow admin update access"
ON products FOR UPDATE
TO authenticated
USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
)
WITH CHECK (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- Create Insert Policy (Admin Only)
CREATE POLICY "Allow admin insert access"
ON products FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);
;
