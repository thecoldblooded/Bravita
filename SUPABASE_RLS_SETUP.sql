-- Supabase RLS Policies Setup
-- Run these SQL commands in your Supabase SQL Editor
-- https://app.supabase.com/project/[YOUR-PROJECT]/sql/new

-- ============================================
-- PROFILES TABLE RLS POLICIES
-- ============================================

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- SELECT: Users can see their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- INSERT: Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================
-- ADDRESSES TABLE RLS POLICIES
-- ============================================

-- Enable RLS on addresses table
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can insert own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can delete own addresses" ON addresses;

-- SELECT: Users can see their own addresses
CREATE POLICY "Users can view own addresses" ON addresses
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: Users can insert their own addresses
CREATE POLICY "Users can insert own addresses" ON addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own addresses
CREATE POLICY "Users can update own addresses" ON addresses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own addresses
CREATE POLICY "Users can delete own addresses" ON addresses
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- ORDERS TABLE RLS POLICIES (if exists)
-- ============================================

-- Enable RLS on orders table (uncomment if table exists)
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing orders policies if they exist (to avoid conflicts)
-- DROP POLICY IF EXISTS "Users can view own orders" ON orders;
-- DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
-- DROP POLICY IF EXISTS "Users can update own orders" ON orders;

-- SELECT: Users can see their own orders
-- CREATE POLICY "Users can view own orders" ON orders
--   FOR SELECT USING (auth.uid() = user_id);

-- INSERT: Users can create their own orders
-- CREATE POLICY "Users can insert own orders" ON orders
--   FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own orders
-- CREATE POLICY "Users can update own orders" ON orders
--   FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- VERIFY RLS IS ENABLED
-- ============================================

-- Check which policies are active
SELECT 
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
