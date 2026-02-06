# 📘 BRAVITA - KULLANIM KILAVUZU

**Platform:** E-Ticaret Web Sitesi (Multivitamin/Multimineral Takviye Satışı)  
**Hedef Kitle:** Bireysel ve Kurumsal Müşteriler  
**Dil:** Türkçe / İngilizce (i18n destekli)

---

## 📑 İÇİNDEKİLER

1. [Normal Kullanıcı Rehberi](#normal-kullanıcı-rehberi)
2. [Admin Kullanıcı Rehberi](#admin-kullanıcı-rehberi)
3. [Teknik Özellikler](#teknik-özellikler)
4. [Sık Sorulan Sorular](#sık-sorulan-sorular)
5. [Sorun Giderme](#sorun-giderme)

---

## 👤 NORMAL KULLANICI REHBERİ

### 1. Kayıt Olma (Sign Up)

#### Yöntem 1: Email + Şifre
1. Ana sayfada **"Giriş Yap"** butonuna tıkla
2. **"Hesabınız yok mu? Kaydolun"** linkine tıkla
3. Email ve şifre gir (şifre min. 8 karakter)
4. **"Kaydol"** butonuna tıkla
5. Email adresine gelen doğrulama linkine tıkla
6. ✅ Kayıt tamamlandı!

#### Yöntem 2: Google OAuth
1. Ana sayfada **"Google ile Giriş Yap"** butonuna tıkla
2. Google hesabını seç
3. İzinleri onayla
4. ✅ Otomatik giriş yapıldı!

**⚠️ NOT:** Google ile giriş yapanların email adresi otomatik doğrulanır.

---

### 2. Profil Tamamlama (Complete Profile)

İlk giriş sonrası profil tamamlama **ZORUNLUDUR**:

1. **Kullanıcı Tipi Seçimi:**
   - 👤 **Bireysel Kullanıcı:** Ad, Soyad gereklidir
   - 🏢 **Kurumsal Kullanıcı:** Şirket adı gereklidir

2. **Telefon Numarası:**
   - Türkiye formatı: `(5XX) XXX-XXXX`
   - Kargo takibi için kullanılır
   - ⚠️ Şu an OTP doğrulama aktif değil (planlı)

3. **Teslimat Adresi:**
   - Cadde/Sokak/Bina
   - Şehir
   - Posta Kodu
   - Varsayılan adres olarak işaretlenebilir

4. **"Profili Kaydet"** butonuna tıkla
5. ✅ Profil tamamlandı, alışveriş yapabilirsiniz!

**📌 İPUCU:** Profil bilgileri daha sonra **"Profilim"** sayfasından güncellenebilir.

---

### 3. Ürün İnceleme ve Sepete Ekleme

#### Ana Sayfa Bölümleri:

1. **Hero (Karşılama):**
   - Ana ürün görseli (Bravita şişesi)
   - Animasyonlu ip efekti (GSAP)
   - "Sepete Ekle" butonu

2. **Product Showcase:**
   - Detaylı ürün bilgileri
   - Frame-by-frame animasyon (scroll ile)
   - İçerik: 14 vitamin + 11 mineral

3. **Benefits (Faydalar):**
   - ✅ Enerji artışı
   - ✅ Bağışıklık desteği
   - ✅ Mental performans

4. **Ingredients (İçerik):**
   - Vitamin C, D, B12, vb.
   - Demir, Kalsiyum, Magnezyum

5. **Usage (Kullanım):**
   - Günde 1 kapsül
   - Yemekle birlikte
   - 30 günlük kullanım

#### Sepete Ekleme:
1. Miktar seç (1-99 adet)
2. **"Sepete Ekle (₺600)"** butonuna tıkla
3. 🛒 Sağ üst köşede sepet ikonu güncellenir
4. **"Sepeti Görüntüle"** → Checkout sayfasına git

---

### 4. Ödeme (Checkout)

#### Sipariş Özeti:
- **Ürünler:** Bravita x [Miktar]
- **Ara Toplam:** ₺600 x Miktar
- **KDV (%20):** Otomatik hesaplanır
- **Promosyon Kodu:** İndirim uygulanabilir
- **Toplam:** Son tutar

#### Ödeme Yöntemleri:

1. **💳 Kredi Kartı (Manuel):**
   - Kart numarası: 16 haneli
   - Son kullanma: MM/YY
   - CVV: 3 haneli
   - ⚠️ **GÜVENLİK:** Kart bilgileri ASLA kaydedilmez!
   - ⚠️ **NOT:** Şu an gerçek ödeme entegrasyonu YOK (demo mod)

2. **🏦 Havale/EFT:**
   - Sipariş onaylandıktan sonra hesap bilgileri gösterilir
   - Dekont yükleme zorunlu (planlı)

3. **💵 Kapıda Ödeme:**
   - Kargo görevlisine nakit/kart ile ödeme
   - Ek ücret olabilir

#### Fatura Bilgileri:
- Bireysel: TC Kimlik No (opsiyonel)
- Kurumsal: Vergi No + Vergi Dairesi (zorunlu)

#### Teslimat Adresi:
- Varsayılan adres otomatik seçilir
- Farklı adres eklenebilir
- **"Yeni Adres Ekle"** ile adres defterine kaydedilir

#### Son Adım:
1. **"Siparişi Onayla"** butonuna tıkla
2. ✅ Sipariş oluşturuldu!
3. 📧 Email onayı gönderilir
4. 📱 SMS onayı gönderilir (planlı)

---

### 5. Sipariş Takibi (Order History)

**Erişim:** Profil → **"Siparişlerim"** sekmesi

#### Sipariş Durumları:
- 🟡 **Pending (Beklemede):** Ödeme bekleniyor
- 🔵 **Processing (Hazırlanıyor):** Kargoya hazırlanıyor
- 📦 **Shipped (Kargoda):** Yolda
- ✅ **Delivered (Teslim Edildi):** Tamamlandı
- ❌ **Cancelled (İptal Edildi):** İptal edildi

#### Sipariş Detayları:
- Sipariş No: `UUID format`
- Tarih: `07 Şubat 2025, 14:30`
- Toplam Tutar: `₺720 (KDV dahil)`
- Ürünler: `Bravita x 1`
- Teslimat Adresi: `Tam adres`
- Ödeme Yöntemi: `Kredi Kartı`
- Kargo Takip No: *(Varsa)*

#### Filtreler:
- **Tümü:** Tüm siparişler
- **Beklemede:** Sadece pending
- **Tamamlandı:** Sadece delivered

---

### 6. Profil Yönetimi

**Erişim:** Sağ üst köşe → Kullanıcı ikonu → **"Profilim"**

#### Sekmeler:

##### 📝 Bilgilerim:
- Ad Soyad / Şirket Adı
- Email (değiştirilemez)
- Telefon
- Kullanıcı Tipi (değiştirilemez)
- **"Bilgileri Güncelle"** butonu

##### 📍 Adres Defterim:
- Kayıtlı tüm adresler
- **"Yeni Adres Ekle"** butonu
- Düzenle/Sil butonları
- ⭐ Varsayılan adres işaretleme

##### 🔐 Şifre Değiştir:
- Mevcut şifre
- Yeni şifre (min. 8 karakter)
- Yeni şifre tekrar
- **"Şifreyi Güncelle"** butonu

##### 📦 Siparişlerim:
- Sipariş geçmişi (yukarıda detaylandırıldı)

---

### 7. Çıkış Yapma (Logout)

1. Sağ üst köşe → Kullanıcı ikonu
2. **"Çıkış Yap"** butonuna tıkla
3. ✅ Oturum kapatıldı

---

## 👨‍💼 ADMİN KULLANICI REHBERİ

### 1. Admin Paneline Erişim

**URL:** `https://bravita.com/admin`

**Gereksinimler:**
- ✅ Giriş yapılmış olmalı
- ✅ `profiles.is_admin = true` olmalı

**⚠️ GÜVENLİK:**
- Admin yetkisi SADECE veritabanından verilebilir
- Frontend'den admin ataması MÜMKÜN DEĞİL (güvenlik önlemi)

#### İlk Admin Kullanıcı Oluşturma:
```sql
-- Supabase SQL Editor'da çalıştır:
UPDATE profiles SET is_admin = true WHERE email = 'admin@bravita.com';
```

---

### 2. Admin Dashboard

#### İstatistikler (30 Gün):
- 📊 **Toplam Sipariş:** Son 30 gündeki sipariş sayısı
- 💰 **Toplam Gelir:** KDV dahil ciro
- 👥 **Yeni Kullanıcılar:** Kayıt olan kullanıcı sayısı
- 📈 **Büyüme Oranı:** Önceki aya göre % değişim

#### Grafik (Planned):
- Günlük gelir trendi
- Aylık karşılaştırma

---

### 3. Sipariş Yönetimi

**Erişim:** Admin Panel → **"Siparişler"** sekmesi

#### Tüm Siparişleri Görüntüle:
- **Tablo Kolonları:**
  - Sipariş No (UUID kısa gösterim)
  - Müşteri Adı
  - Email
  - Tarih
  - Toplam
  - Durum
  - İşlemler

#### Filtreler:
- **Arama:** Sipariş No, müşteri adı, email
- **Durum:** Pending, Processing, Shipped, Delivered, Cancelled
- **Tarih Aralığı:** Başlangıç - Bitiş tarihi
- **Sıralama:** Tarihe göre (yeni → eski)

#### Sipariş Detayları:
1. Sipariş satırına tıkla → **"Detayları Görüntüle"**
2. **Bilgiler:**
   - Müşteri bilgileri (ad, email, telefon)
   - Teslimat adresi (tam adres)
   - Ürünler (miktar, birim fiyat)
   - Ödeme bilgileri (yöntem, tutar)
   - Fatura bilgileri

#### Sipariş Durumu Güncelleme:
1. **"Durumu Güncelle"** dropdown'ını aç
2. Yeni durum seç:
   - **Processing:** Ödeme onaylandı, hazırlanıyor
   - **Shipped:** Kargoya verildi (kargo takip no ekle)
   - **Delivered:** Müşteriye teslim edildi
   - **Cancelled:** İptal edildi (sebep notu ekle)
3. **"Güncelle"** butonuna tıkla
4. ✅ Müşteriye email/SMS bildirimi gönderilir (planlı)

#### Kargo Takip No Ekleme:
1. Sipariş detayına git
2. **"Kargo Takip No Ekle"** inputuna takip numarasını gir
3. **"Kaydet"** butonuna tıkla
4. ✅ Müşteri siparişlerinde takip no görünür

---

### 4. Kullanıcı Yönetimi

**Erişim:** Admin Panel → **"Kullanıcılar"** sekmesi (planlı)

#### Tüm Kullanıcıları Görüntüle:
- **Tablo Kolonları:**
  - Ad Soyad
  - Email
  - Telefon
  - Kullanıcı Tipi (Bireysel/Kurumsal)
  - Kayıt Tarihi
  - Admin Durumu
  - İşlemler

#### Kullanıcı Detayları:
- Profil bilgileri (tam)
- Adres defteri
- Sipariş geçmişi (direkt erişim)
- Toplam harcama

#### Admin Yetkisi Ver/Kaldır:
1. Kullanıcı satırında **"Admin Yap"** butonuna tıkla
2. ⚠️ **ONAY:** "Bu kullanıcıya admin yetkisi vermek istediğinize emin misiniz?"
3. **"Evet"** butonuna tıkla
4. ✅ `profiles.is_admin = true` olarak güncellendi
5. 🔐 **GÜVENLİK:** Kendi admin yetkini kaldıramazsın!

#### Kullanıcı Askıya Alma (Planned):
- **"Suspend User"** butonu
- Geçici hesap dondurma
- Sebep notu ekleme

---

### 5. Ürün Yönetimi (Planned)

**Erişim:** Admin Panel → **"Ürünler"** sekmesi

#### Özellikler:
- Yeni ürün ekleme
- Fiyat güncelleme
- Stok yönetimi
- Ürün görseli yükleme
- Ürün açıklaması düzenleme
- Aktif/Pasif yapma

---

### 6. Promosyon Kodu Yönetimi (Planned)

**Erişim:** Admin Panel → **"Promosyonlar"** sekmesi

#### Özellikler:
- Yeni promo kod oluşturma
- İndirim oranı (% veya TL)
- Geçerlilik tarihi (başlangıç - bitiş)
- Kullanım limiti (tek kullanım / sınırsız)
- Minimum sepet tutarı
- Aktif/Pasif yapma

#### Örnek Promo Kodlar:
- `SUMMER2024`: %15 indirim
- `WELCOME10`: İlk sipariş %10 indirim
- `BULK50`: 50+ adet alımlarda %20 indirim

---

### 7. Raporlar ve Analizler (Planned)

#### Satış Raporları:
- Günlük/Haftalık/Aylık satış grafikleri
- En çok satan ürünler
- Müşteri segmentasyonu (bireysel vs kurumsal)
- Bölgesel satış analizi

#### Finansal Raporlar:
- Gelir raporu (KDV dahil/hariç)
- Ödeme yöntemi dağılımı
- İade/İptal oranı

#### Müşteri Analizleri:
- Yeni müşteri kazanımı
- Müşteri yaşam boyu değeri (CLV)
- Churn rate (müşteri kaybı)

---

### 8. Güvenlik ve Denetim Logları

**Erişim:** Admin Panel → **"Audit Logs"** sekmesi (planned)

#### Loglanacak İşlemler:
- ✅ Sipariş durumu değişiklikleri
- ✅ Admin yetkisi verme/kaldırma
- ✅ Ürün fiyat değişiklikleri
- ✅ Promo kod oluşturma/silme
- ✅ Kullanıcı askıya alma

#### Log Detayları:
- **Admin:** Kimin yaptığı
- **İşlem:** Ne yapıldı
- **Hedef:** Hangi sipariş/kullanıcı/ürün
- **Tarih:** Ne zaman
- **IP Adresi:** Nereden
- **Detaylar:** JSON formatında değişiklikler

#### GDPR Compliance:
- Tüm admin işlemleri loglanır
- 12 ay saklama süresi
- Kullanıcı talep ederse silinir

---

## 🔧 TEKNİK ÖZELLİKLER

### Frontend Stack:
- **Framework:** React 18.3 + TypeScript 5.6
- **Bundler:** Vite 6.0
- **Router:** React Router v6
- **State:** Context API (Auth, Cart)
- **Forms:** React Hook Form + Zod validation
- **Styling:** Tailwind CSS 3.4
- **UI Components:** shadcn/ui (Radix UI Primitives)
- **Animations:** 
  - Framer Motion (page transitions, micro-interactions)
  - GSAP 3.12 (scroll-triggered animations)
  - Lenis (smooth scroll)
- **Icons:** Lucide React
- **i18n:** i18next (Türkçe/İngilizce)

### Backend Stack:
- **BaaS:** Supabase
- **Database:** PostgreSQL 15
- **Auth:** Supabase Auth (JWT)
  - Email/Password
  - Google OAuth 2.0
- **Storage:** Supabase Storage (ürün görselleri)
- **Functions:** PostgreSQL RPC Functions
- **Realtime:** Supabase Realtime (sipariş bildirimleri)
- **Security:** Row Level Security (RLS)

### Güvenlik Katmanları:
1. **Client-Side:**
   - React XSS koruması (automatic escaping)
   - Input validation (Zod schemas)
   - Route guards (AuthGuard, AdminGuard)
   - CSRF token (Supabase JWT)

2. **Network:**
   - HTTPS only (SSL/TLS)
   - Supabase API Gateway
   - Rate limiting (Supabase built-in)

3. **Database:**
   - Row Level Security (RLS)
   - Parametreli sorgular (SQL injection koruması)
   - Admin RPC functions (backend kontrolü)
   - Audit logging

4. **Authentication:**
   - JWT tokens (1 saat TTL)
   - Refresh tokens (autoRefreshToken)
   - Password hashing (bcrypt)
   - Email verification

---

## ❓ SIK SORULAN SORULAR (FAQ)

### Genel:

**S: Ürünün fiyatı nedir?**  
C: Bravita Multivitamin 30 kapsül ₺600 (KDV dahil ₺720).

**S: Kargo ücretsiz mi?**  
C: 500 TL ve üzeri siparişlerde kargo ücretsiz (planlı).

**S: Geri iade mümkün mü?**  
C: 14 gün içinde iade edilebilir (ambalaj açılmamışsa).

### Hesap:

**S: Şifremi unuttum, ne yapmalıyım?**  
C: Giriş sayfasında "Şifremi Unuttum" linkine tıklayın. Email adresinize sıfırlama linki gönderilir.

**S: Email adresimi değiştirebilir miyim?**  
C: Hayır, güvenlik nedeniyle email değiştirilemez. Yeni hesap oluşturmanız gerekir.

**S: Google ile giriş yaptım ama şifre değiştiremiyorum.**  
C: OAuth kullanıcıları şifre kullanmaz. Google hesabınızdan yönetilir.

### Sipariş:

**S: Siparişimi iptal edebilir miyim?**  
C: "Pending" veya "Processing" aşamasındaysa iptal edilebilir. Müşteri hizmetleriyle iletişime geçin.

**S: Kargo ne kadar sürer?**  
C: İstanbul içi 1-2 gün, Türkiye geneli 2-5 gün.

**S: Promosyon kodu nasıl kullanılır?**  
C: Checkout sayfasında "Promosyon Kodu" alanına girin ve "Uygula" butonuna tıklayın.

### Admin:

**S: Nasıl admin olabilirim?**  
C: Admin yetkisi SADECE mevcut adminler tarafından verilebilir. Talep etmek için iletişime geçin.

**S: Admin paneli mobilde çalışır mı?**  
C: Evet, responsive tasarım. Tablet ve masaüstü daha rahat kullanım sağlar.

---

## 🛠️ SORUN GİDERME

### Yaygın Hata Mesajları:

#### "Profile incomplete. Please complete your profile."
- **Sebep:** Profil bilgileri eksik.
- **Çözüm:** "Complete Profile" sayfasından tüm zorunlu alanları doldurun.

#### "Invalid promo code"
- **Sebep:** Promo kod geçersiz, süresi dolmuş veya kullanılmış.
- **Çözüm:** Kodu kontrol edin, büyük/küçük harf duyarlı değil.

#### "Email already exists"
- **Sebep:** Bu email ile zaten kayıtlı hesap var.
- **Çözüm:** "Giriş Yap" sayfasından giriş yapın veya şifrenizi sıfırlayın.

#### "Insufficient stock"
- **Sebep:** İstenen miktarda stok yok.
- **Çözüm:** Miktarı azaltın veya stok güncellemesini bekleyin.

#### "Access Denied - Admin Only"
- **Sebep:** Admin paneline erişim yetkisi yok.
- **Çözüm:** Normal kullanıcı hesabısınız. Yetkiye ihtiyacınız varsa iletişime geçin.

### Performans İyileştirmeleri:

#### Yavaş sayfa yüklenmesi:
- Tarayıcı cache'ini temizleyin (Ctrl+Shift+Delete)
- Reklamlar engelliyici devre dışı bırakın
- Farklı tarayıcı deneyin (Chrome, Firefox önerilir)

#### Animasyonlar takıyor:
- Donanım hızlandırmayı etkinleştirin:
  - Chrome: `chrome://settings/` → Gelişmiş → Sistem → "Kullanılabilir olduğunda donanım hızlandırmayı kullan"
- GPU olmayan cihazlarda animasyonlar devre dışı bırakılabilir (settings - planned)

---

## 📞 İLETİŞİM VE DESTEK

**Email:** support@bravita.com  
**Telefon:** +90 (212) 555-0100  
**Çalışma Saatleri:** Pazartesi - Cuma, 09:00 - 18:00

**Acil Güvenlik Bildirimi:**  
security@bravita.com (24/7)

---

**Bu kılavuz düzenli olarak güncellenmektedir.**  
**Son güncelleme:** 6 Şubat 2026  
**Versiyon:** 1.0.0
