# 🚀 BRAVITA - ACİL GÜVENLİK ONARIMI UYGULAMA KILAVUZU

**⚠️ KRİTİK: Bu adımları HEMEN uygulayın!**

---

## 📋 HIZLI ÖZET

**Tespit Edilen Kritik Sorunlar:**
1. ❌ Orders tablosu RLS yok → Herkes başkasının siparişlerini görebilir
2. ❌ Profiles tablosu `is_admin` kolonu eksik → Admin sistemi çalışmıyor
3. ❌ Admin API fonksiyonları backend kontrolsüz → Güvenlik açığı
4. ⚠️ SQL Injection riski (düşük)

**Çözüm Süresi:** 15 dakika  
**Gereksinimler:** Supabase erişimi

---

## ⚡ ACİL UYGULAMA ADIMLARI

### Adım 1: Supabase SQL Editor'ı Aç

1. https://supabase.com/dashboard adresine git
2. Bravita projesini seç
3. Sol menüden **"SQL Editor"** sekmesine tıkla
4. **"New query"** butonuna tıkla

---

### Adım 2: Güvenlik Yamalarını Uygula

**Dosya:** `supabase/migrations/20260206_CRITICAL_SECURITY_FIX.sql`

1. Yukarıdaki SQL dosyasının **TAMAMINI** kopyala
2. Supabase SQL Editor'a yapıştır
3. **"Run"** (F5) butonuna tıkla
4. ✅ Başarılı mesajını kontrol et:
   ```
   CRITICAL SECURITY FIX APPLIED SUCCESSFULLY
   ```

**⚠️ HATA ALINIRSA:**
- Hatayı kopyala ve development ekibine ilet
- Önceki migration'lar çalışmamış olabilir

---

### Adım 3: İlk Admin Kullanıcıyı Oluştur

**YENİ SQL QUERY:**

```sql
-- Kendi email adresinizi yazın:
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'ADMIN_EMAIL_BURAYA@example.com';

-- Kontrol et:
SELECT id, email, is_admin, full_name 
FROM public.profiles 
WHERE is_admin = true;
```

**Beklenen Sonuç:**
```
id                                   | email               | is_admin | full_name
-------------------------------------|---------------------|----------|------------
abc123...                            | admin@bravita.com   | true     | Admin User
```

✅ `is_admin = true` görünüyorsa başarılı!

---

### Adım 4: RLS Politikalarını Doğrula

**YENİ SQL QUERY:**

```sql
-- Orders tablosu RLS kontrolü
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'orders';
```

**Beklenen Sonuç:** En az 2 policy görünmeli:
- `Admins can view all orders`
- `Users can view own orders`

**⚠️ Eğer policy görünmüyorsa:**
- Adım 2'yi tekrar çalıştır
- Hata mesajlarını kontrol et

---

### Adım 5: Admin Paneline Giriş Testi

1. Tarayıcıda: `https://bravita.com`
2. Admin email ile **login** yap
3. URL'yi değiştir: `https://bravita.com/admin`
4. ✅ Admin Dashboard görünmeli
5. **"Siparişler"** sekmesine git
6. ✅ TÜM siparişleri görebildiğini doğrula

**❌ "Access Denied" hatası alıyorsan:**
- Adım 3'ü kontrol et (is_admin = true mi?)
- Logout/login yap (cache temizlenir)
- Browser Developer Tools → Application → Local Storage → Clear

---

### Adım 6: Normal Kullanıcı Testi (Önemli!)

1. **Logout** yap
2. Normal kullanıcı hesabıyla **login** yap
3. URL'yi değiştir: `https://bravita.com/admin`
4. ✅ **"Access Denied"** mesajı görünmeli
5. ✅ Siparişlerimde sadece **kendi siparişlerimi** görebildiğimi doğrula

**❌ Başkasının siparişlerini görüyorsan:**
- RLS düzgün uygulanmamış
- Supabase Dashboard → Authentication → Policies kontrol et
- Adım 2'yi tekrar çalıştır

---

## 🔐 GÜVENLİK DOĞRULAMAlari

### Test 1: RLS Bypass Denemesi (Penetration Test)

**Browser Console'da çalıştır (F12):**

```javascript
// Normal kullanıcı olarak:
const { data, error } = await supabase.from('orders').select('*');
console.log('Görünen siparişler:', data?.length);
// ✅ SADECE kendi siparişlerin görünmeli
// ❌ Başkasının siparişi görünüyorsa RLS YOK!
```

**Admin kullanıcı olarak:**
```javascript
const { data } = await supabase.from('orders').select('*');
console.log('Görünen siparişler:', data?.length);
// ✅ TÜM siparişleri görebilmeli
```

---

### Test 2: Admin Yetkisi Manipülasyonu

**Browser Console (F12):**

```javascript
// Normal kullanıcı olarak dene:
localStorage.setItem("user_is_admin", "true");
location.reload();
// ✅ Admin paneline ERİŞEMEMEN gerekiyor
// ❌ Erişiyorsan GÜVENLİK AÇIĞI VAR!
```

**Beklenen Sonuç:** 
- Backend'den gelen `is_admin` değeri her zaman üstün gelir
- localStorage manipülasyonu işe yaramaz

---

### Test 3: SQL Injection Denemesi

**Admin Panel → Siparişler → Arama:**

```
Arama kutusuna yaz: '; DROP TABLE orders; --
```

**Beklenen Sonuç:**
- ✅ Arama yapılır, tablo silinmez
- ✅ Hata mesajı görünmez
- ❌ "Table orders does not exist" hatası alıyorsan ACİL EKİBE BİLDİR!

---

## 📊 BAŞARILI KURULUM KONTROL LİSTESİ

- [ ] SQL migration başarıyla çalıştı
- [ ] `profiles` tablosunda `is_admin` kolonu var
- [ ] İlk admin kullanıcı oluşturuldu (`is_admin = true`)
- [ ] Admin paneline giriş yapılabiliyor
- [ ] Admin tüm siparişleri görebiliyor
- [ ] Normal kullanıcı admin paneline erişemiyor
- [ ] Normal kullanıcı sadece kendi siparişlerini görebiliyor
- [ ] RLS policies aktif (`pg_policies` tablosunda görünüyor)
- [ ] Admin RPC fonksiyonları çalışıyor
- [ ] localStorage manipulation işe yaramıyor
- [ ] SQL Injection koruması aktif

✅ **Tüm maddeler işaretliyse güvenlik yamaları başarıyla uygulanmıştır!**

---

## 🚨 HATA ÇÖZÜMLEME

### Hata: "column is_admin does not exist"

**Sebep:** Migration çalışmamış.

**Çözüm:**
```sql
-- Manuel kolon ekle:
ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
```

---

### Hata: "permission denied for table orders"

**Sebep:** RLS bloke ediyor, admin bypass yok.

**Çözüm:**
```sql
-- Admin bypass policy ekle:
CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
```

---

### Hata: Admin panelinde "Access Denied"

**Sebep 1:** `is_admin = false` veya NULL

**Çözüm:**
```sql
-- Kontrol et:
SELECT email, is_admin FROM profiles WHERE email = 'YOUR_EMAIL';

-- Düzelt:
UPDATE profiles SET is_admin = true WHERE email = 'YOUR_EMAIL';
```

**Sebep 2:** Cache problemi

**Çözüm:**
1. Logout yap
2. Browser cache temizle (Ctrl+Shift+Delete)
3. Tekrar login yap

---

### Hata: "function is_admin_user() does not exist"

**Sebep:** RPC function oluşturulmamış.

**Çözüm:**
- Adım 2'yi tekrar çalıştır
- **"Run"** butonuna basıldığından emin ol

---

## 📞 ACİL DESTEK

**Teknik Sorunlar:**
- Email: tech@bravita.com
- Slack: #bravita-security-alerts

**Güvenlik İhlalleri:**
- Email: security@bravita.com (⚠️ 24/7)
- Telefon: +90 (212) 555-0911

---

## 📝 SONRAKI ADIMLAR (Optional)

### Kısa Vade (1 Hafta):
- [ ] Email verification zorunlu kıl (checkout'ta)
- [ ] Rate limiting ekle (brute force koruması)
- [ ] Audit logging aktifleştir

### Orta Vade (1 Ay):
- [ ] 2FA ekle (admin kullanıcılar için)
- [ ] CAPTCHA ekle (login, checkout)
- [ ] WAF entegrasyonu (Cloudflare)

### Uzun Vade (3 Ay):
- [ ] Penetration test otomasyonu (OWASP ZAP)
- [ ] GDPR compliance audit
- [ ] ISO 27001 sertifikasyonu (planlı)

---

**Migration Tarihi:** 6 Şubat 2026  
**Versiyon:** 1.0.0-security-fix  
**Durum:** 🚨 URGENT - DEPLOY ASAP
