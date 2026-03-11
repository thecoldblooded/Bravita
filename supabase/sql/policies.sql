-- ============================================
-- BRAVITA - SUPABASE ROW LEVEL SECURITY (RLS)
-- ============================================
-- Bu SQL dosyası Supabase SQL Editor'da çalıştırılmalıdır.
-- Tüm tablolar için RLS politikalarını tanımlar.
-- ============================================

-- =====================
-- PROFILES TABLE
-- =====================

-- RLS'yi etkinleştir
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Mevcut politikaları temizle (varsa)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Kullanıcı sadece kendi profilini görebilir
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = id);

-- Kullanıcı sadece kendi profilini güncelleyebilir
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Kullanıcı kendi profilini oluşturabilir (signup sırasında)
CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Profil silme devre dışı (soft delete tercih edilir)
-- CREATE POLICY "Users can delete own profile" 
-- ON profiles FOR DELETE 
-- USING (auth.uid() = id);


-- =====================
-- ADDRESSES TABLE
-- =====================

-- RLS'yi etkinleştir
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- Mevcut politikaları temizle (varsa)
DROP POLICY IF EXISTS "Users can view own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can insert own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can update own addresses" ON addresses;
DROP POLICY IF EXISTS "Users can delete own addresses" ON addresses;

-- Kullanıcı sadece kendi adreslerini görebilir
CREATE POLICY "Users can view own addresses" 
ON addresses FOR SELECT 
USING (auth.uid() = user_id);

-- Kullanıcı sadece kendi adını ekleyebilir
CREATE POLICY "Users can insert own addresses" 
ON addresses FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Kullanıcı sadece kendi adreslerini güncelleyebilir
CREATE POLICY "Users can update own addresses" 
ON addresses FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Kullanıcı sadece kendi adreslerini silebilir
CREATE POLICY "Users can delete own addresses" 
ON addresses FOR DELETE 
USING (auth.uid() = user_id);


-- =====================
-- ORDERS TABLE (Gelecek için hazırlık)
-- =====================

-- Eğer orders tablosu varsa:
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can view own orders" 
-- ON orders FOR SELECT 
-- USING (auth.uid() = user_id);

-- CREATE POLICY "Users can insert own orders" 
-- ON orders FOR INSERT 
-- WITH CHECK (auth.uid() = user_id);

-- Siparişler güncellenemez (immutable)
-- Siparişler silinemez (audit trail için)


-- =====================
-- DOĞRULAMA
-- =====================

-- Tüm politikaları listele
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
