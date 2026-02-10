# 🔒 Bravita E-Ticaret Platformu — Kapsamlı Güvenlik Denetim Raporu

**Tarih:** 10 Şubat 2026  
**Son Güncelleme:** 10 Şubat 2026 — Düzeltmeler Uygulandı  
**Denetçi:** Antigravity Security Auditor  
**Kapsam:** Tüm frontend, backend (Edge Functions), veritabanı (Supabase/PostgreSQL), bağımlılıklar  
**Metodoloji:** OWASP Top 10:2025, Supply Chain Security, Attack Surface Mapping  

---

## 📊 Yönetici Özeti

| Kategori | Sonuç |
|----------|-------|
| **Toplam Bulgu** | 14 |
| **🔴 Kritik** | 2 |
| **🟠 Yüksek** | 3 |
| **🟡 Orta** | 5 |
| **🔵 Düşük** | 4 |
| **NPM Güvenlik Açığı** | 0 (Temiz ✅) |
| **Bağımlılık Sayısı** | 826 (508 prod, 243 dev, 135 optional) |

---

## 🔴 KRİTİK BULGULAR (Acil Müdahale Gerekli)

### [C-01] ~~CAPTCHA Bypass — `skip_captcha_token` Hardcoded Fallback~~ ✅ DÜZELTİLDİ

**Durum:** ✅ **DÜZELTİLDİ** (10 Şubat 2026)

**Dosyalar:**
- `src/components/auth/SignupForm.tsx`
- `src/components/auth/LoginForm.tsx`

**Uygulanan Düzeltme:**
`skip_captcha_token` fallback değerleri tüm form'lardan kaldırıldı. Artık `captchaToken!` (non-null assertion) kullanılıyor. Early return guard'lar zaten captcha olmadan submission'ı engelliyor.

---

### [C-02] ~~CORS Wildcard (`*`) — Tüm Edge Functions'larda~~ ✅ DÜZELTİLDİ

**Durum:** ✅ **DÜZELTİLDİ** (10 Şubat 2026)

**Dosyalar:**
- `supabase/functions/sync-to-billionmail/index.ts`
- `supabase/functions/send-welcome-email/index.ts`
- `supabase/functions/send-order-email/index.ts`

**Uygulanan Düzeltme:**
Statik `corsHeaders` yerine dinamik `getCorsHeaders(req)` fonksiyonu eklendi. CORS origin artık sadece `bravita.com.tr` ve `www.bravita.com.tr` domain'lerine izin veriyor. `Access-Control-Allow-Methods: POST, OPTIONS` eklendi.

---

## 🟠 YÜKSEK SEVİYE BULGULAR

### [H-01] ~~Test/Debug Kodu Üretimde — `test_user_orders` localStorage~~ ✅ DÜZELTİLDİ

**Durum:** ✅ **DÜZELTİLDİ** (10 Şubat 2026)

**Dosya:** `src/lib/admin.ts`

**Uygulanan Düzeltme:**
`getLocalOrders()` helper fonksiyonu ve tüm `test-user-id-12345` bypass blokları kaldırıldı:
- `getAllOrders`: ~60 satır test bypass kaldırıldı
- `getOrderById`: ~17 satır test bypass kaldırıldı
- `updateOrderStatus`: ~21 satır test bypass kaldırıldı
- `updateTrackingNumber`: ~12 satır test bypass kaldırıldı
- `getOrderStatusHistory`: ~15 satır mock history kaldırıldı
- `getDashboardStats`: ~18 satır mock stats kaldırıldı

---

### [H-02] CSP Policy'de `unsafe-eval` ve `unsafe-inline`

**Dosya:** `index.html` (satır 50-51)

**Açıklama:**  
Content Security Policy'de `'unsafe-eval'` ve `'unsafe-inline'` direktifleri bulunuyor:

```html
script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' 'unsafe-eval' blob: ...
```

**Etki:**
- XSS saldırıları CSP tarafından engellenemez
- Kötü niyetli inline script çalıştırılabilir
- `eval()` fonksiyonu engellenemez

**Risk Skoru:** 7.0/10

**Düzeltme:**
- Üretimde `unsafe-inline` yerine `nonce-based` veya `hash-based` CSP kullanın
- `unsafe-eval` tamamen kaldırılmalı (LordIcon gibi kütüphaneler için alternatif aranmalı)

---

### [H-03] ~~Şifre Politikası Yetersiz — Minimum 6 Karakter~~ ✅ DÜZELTİLDİ

**Durum:** ✅ **DÜZELTİLDİ** (10 Şubat 2026)

**Dosya:** `src/pages/UpdatePassword.tsx`

**Uygulanan Düzeltme:**
Şifre politikası güçlendirildi — min 8 karakter + büyük harf + küçük harf + rakam + özel karakter zorunluluğu eklendi.

---

## 🟡 ORTA SEVİYE BULGULAR

### [M-01] `dangerouslySetInnerHTML` Kullanımı

**Dosya:** `src/components/ui/chart.tsx` (satır 70)

**Açıklama:**  
React'ın `dangerouslySetInnerHTML` kullanılıyor. İçerik sanitize edilmezse XSS riski taşır.

**Risk Skoru:** 5.5/10  
**Düzeltme:** İçeriğin statik ve güvenli olduğunu doğrulayın. Dinamik veri geliyorsa DOMPurify kullanın.

---

### [M-02] `innerHTML` Kullanımı

**Dosya:** `src/components/ui/LordIcon.tsx` (satır 126)

**Açıklama:**
```typescript
currentContainer.innerHTML = "";
```

Bu özel durumda boş string atanıyor, bu nedenle düşük risk. Ancak pattern olarak dikkat edilmelidir.

**Risk Skoru:** 3.0/10

---

### [M-03] `SECURITY DEFINER` Fonksiyonlar — Dikkatli İnceleme Gerekli

**Dosyalar:**
- `supabase/migrations/20260210_site_settings.sql` (satır 40)
- `supabase/migrations/20260208_security_audit_fixes.sql` (satır 12)
- `supabase/migrations/20260206_CRITICAL_SECURITY_FIX.sql` (satır 139, 185, 212, 239)
- `supabase/functions/create_order.sql` (satır 13)
- `supabase/checkout_function.sql` (satır 14)

**Açıklama:**  
8 adet `SECURITY DEFINER` fonksiyon tespit edildi. Bu fonksiyonlar, tanımlayan kullanıcının (genellikle superuser) yetkileriyle çalışır.

**Etki:**
- Yanlış yapılandırılmışsa privilege escalation riski
- RLS bypass edilebilir

**Risk Skoru:** 5.0/10  
**Düzeltme:** Her fonksiyonun input validasyonu yaptığından ve gereksiz yere SECURITY DEFINER kullanmadığından emin olun.

---

### [M-04] Aşırı `console.log/error` Kullanımı — Bilgi Sızıntısı

**Etkilenen Dosyalar:** 50+ farklı dosyada aktif `console.log`, `console.error`, `console.warn` çağrısı

**Açıklama:**  
Üretim build'inde 100+ console çağrısı bulunuyor. Bunlar kullanıcı verilerini, hata detaylarını ve iç sistem bilgilerini tarayıcı konsoluna sızdırabilir.

**Risk Skoru:** 4.5/10  
**Düzeltme:** Vite config'e `drop: ['console']` (esbuild) ekleyin veya tree-shakeable bir logger kullanın.

---

### [M-05] localStorage'da Hassas Veri Depolama

**Etkilenen Dosyalar:** `AuthContext.tsx`, `CartContext.tsx`, `useAuth.ts`, `admin.ts`

**Açıklama:**  
`localStorage`'da oturum bilgileri, profil durumu ve sepet verileri depolanıyor. `localStorage` XSS saldırılarına karşı savunmasızdır.

Depolanan veriler:
- `bravita-stable-token` (Supabase auth token)
- `profile_known_complete`
- `bravita_cart` (sepet verileri)
- `bravita_promo_code` (promosyon kodu)
- `test_user_orders` (test verileri)

**Risk Skoru:** 4.0/10  
**Düzeltme:** Hassas olmayan veriler için sorun değildir. `httpOnly` cookie'ler Supabase client SDK'da doğrudan desteklenmez, bu yüzden auth token için mevcut durum kabul edilebilir. Ancak `test_user_orders` kaldırılmalıdır.

---

## 🔵 DÜŞÜK SEVİYE BULGULAR

### [L-01] `.env` Dosyası Repo'da Yok ✅

`.env`, `.env.local` veya benzeri dosyalar repo'da bulunmuyor. Bu iyi bir uygulama.

---

### [L-02] `SUPABASE_SERVICE_ROLE_KEY` Frontend'de Yok ✅

Service role key sadece Edge Functions'larda `Deno.env.get()` ile alınıyor, frontend kodunda hiçbir yerde kullanılmıyor.

---

### [L-03] RLS (Row Level Security) Aktif ✅

Tespit edilen tablolar:
- `orders` ✅
- `products` ✅
- `profiles` ✅
- `addresses` ✅
- `otp_codes` ✅
- `order_status_history` ✅
- `site_settings` ✅
- `email_logs` ✅
- `admin_audit_log` ✅

---

### [L-04] PKCE Auth Flow Kullanılıyor ✅

```typescript
flowType: 'pkce',
```

Supabase auth yapılandırmasında PKCE flow aktif. Bu, authorization code interception saldırılarına karşı koruma sağlar.

---

## ✅ İYİ UYGULAMALAR (Pozitif Bulgular)

| Alan | Durum | Detay |
|------|-------|-------|
| **NPM Bağımlılıkları** | ✅ Temiz | 0 bilinen güvenlik açığı |
| **Service Role Key** | ✅ Güvenli | Frontend'de hiç kullanılmıyor |
| **`.env` Dosyaları** | ✅ Güvenli | Git repo'da yok |
| **RLS Politikaları** | ✅ Kapsamlı | Tüm kritik tablolarda aktif |
| **PKCE Auth Flow** | ✅ Modern | Token interception koruması |
| **Input Sanitization** | ✅ Var | Email template'lerinde HTML sanitization mevcut |
| **SQL Injection** | ✅ Korumalı | `sanitize_search_input` fonksiyonu ve RPC kullanımı |
| **Admin Audit Log** | ✅ Aktif | Admin işlemleri loglanıyor |
| **Rate Limiting** | ✅ Mevcut | Email gönderimi için rate limiting var |
| **hCaptcha** | ⚠️ Kısmen | Entegrasyon var ama bypass mevcut (C-01) |
| **CSP Header** | ⚠️ Kısmen | Var ama unsafe direktifler mevcut (H-02) |
| **X-Content-Type-Options** | ✅ Aktif | `nosniff` header'ı mevcut |
| **Referrer Policy** | ✅ Aktif | `strict-origin-when-cross-origin` |

---

## 🎯 Düzeltme Öncelik Sıralaması

| Öncelik | Bulgu | Tahmini Süre | Etki |
|---------|-------|--------------|------|
| 1️⃣ | **C-01** CAPTCHA Bypass | 30 dk | Bot koruması sağlanır |
| 2️⃣ | **C-02** CORS Wildcard | 15 dk | CSRF koruması sağlanır |
| 3️⃣ | **H-01** Test Kodu Kaldırma | 15 dk | Veri manipülasyonu önlenir |
| 4️⃣ | **H-03** Şifre Politikası | 20 dk | Hesap güvenliği artar |
| 5️⃣ | **H-02** CSP Güçlendirme | 1 saat | XSS koruması güçlenir |
| 6️⃣ | **M-04** Console Temizliği | 30 dk | Bilgi sızıntısı önlenir |
| 7️⃣ | **M-03** SECURITY DEFINER | 1 saat | Privilege escalation önlenir |

---

## 📋 Supabase Danışman Sonuçları (Canlı Tarama)

Supabase'in yerleşik güvenlik ve performans danışmanları çalıştırıldı. Sonuçlar:

### 🔐 Güvenlik Danışmanı — 3 Uyarı

| # | Bulgu | Tablo/Fonksiyon | Önem | Düzeltme |
|---|-------|-----------------|------|----------|
| **S-01** | **Leaked Password Protection Devre Dışı** | Auth | ⚠️ WARN | Supabase Dashboard → Auth → Password Security → "Leaked Password Protection" aktifleştirin. [Docs](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) |
| **S-02** | ~~**Function Search Path Mutable**~~ | `public.create_order` | ✅ DÜZELTİLDİ | `SET search_path = public` eklendi (migration: `security_audit_fixes_feb10`) |
| **S-03** | **Extension in Public Schema** | `pg_net` | ⚠️ WARN | `pg_net` extension'ı `extensions` schema'sına taşıyın. [Docs](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public) |

> **S-01 Özellikle Önemli:** HaveIBeenPwned veritabanına karşı şifre kontrolü yapılmıyor. Supabase Dashboard → Auth → Password Security → "Leaked Password Protection" aktifleştirilmeli.

### ⚡ Performans Danışmanı — 2 Uyarı + 10 Bilgilendirme

#### RLS Performans Uyarıları

| # | Tablo | Policy | Sorun | Düzeltme |
|---|-------|--------|-------|----------|
| **P-01** | `orders`, `profiles`, `addresses` | Kullanıcı policy'leri | ✅ DÜZELTİLDİ | `auth.uid()` → `(select auth.uid())` olarak güncellendi (migration: `security_audit_fixes_feb10`) |
| **P-02** | `admin_audit_log`, `site_settings` | Admin policy'leri | ⚠️ Devam Ediyor | Ek admin policy'leri ayrıca güncellenebilir |

> **Not:** Bu uyarılar, RLS policy'lerinde `auth.uid()` çağrılarının `(select auth.uid())` ile sarmalanması gerektiğini gösteriyor. Bu küçük değişiklik, büyük tablolarda sorgu performansını önemli ölçüde artırır.

#### Kullanılmayan İndeksler (Bilgilendirme)

| Tablo | İndeks | Aksiyon |
|-------|--------|---------|
| `addresses` | `idx_addresses_user_id` | İzle veya kaldır |
| `order_status_history` | `idx_order_status_history_created_by` | İzle veya kaldır |
| `orders` | `idx_orders_shipping_address_id` | İzle veya kaldır |
| `orders` | `idx_orders_total_decimal` | İzle veya kaldır |
| `orders` | `idx_orders_details_gin` | İzle veya kaldır |
| `promo_logs` | `idx_promo_logs_order_id` | İzle veya kaldır |
| `promo_logs` | `idx_promo_logs_promo_code_id` | İzle veya kaldır |
| `promo_logs` | `idx_promo_logs_user_id` | İzle veya kaldır |
| `promo_code_attempts` | `idx_promo_attempts_timestamp` | İzle veya kaldır |
| `admin_audit_log` | `idx_admin_audit_log_admin_user_id` | İzle veya kaldır |

> **Not:** Bu indeksler henüz kullanılmamış. Proje henüz erken aşamada olduğu için şimdilik kaldırmayın, ancak 3-6 ay sonra hâlâ kullanılmıyorsa kaldırabilirsiniz. Unused indeksler yazma performansını düşürür ve disk alanı tüketir.

---

## 🏁 Sonuç

Bravita platformu genel olarak **iyi** seviyede güvenlik uygulamaktadır. RLS, PKCE, input sanitization ve audit logging gibi kritik güvenlik katmanları mevcuttur.

### ✅ Uygulanan Düzeltmeler (10 Şubat 2026)

| # | Bulgu | Durum |
|---|-------|-------|
| **C-01** | CAPTCHA Bypass | ✅ Düzeltildi |
| **C-02** | CORS Wildcard | ✅ Düzeltildi |
| **H-01** | Test Kodu Kaldırma | ✅ Düzeltildi |
| **H-03** | Şifre Politikası | ✅ Düzeltildi |
| **S-02** | Function Search Path | ✅ Düzeltildi |
| **P-01** | RLS Auth Optimizasyonu | ✅ Düzeltildi |
| **M-04** | Console.log Temizliği | ✅ Düzeltildi |

### ⚠️ Kalan Aksiyonlar

| # | Bulgu | Aksiyon |
|---|-------|---------|
| **H-02** | CSP unsafe direktifler | Build tool'da nonce-based CSP'ye geçiş |
| **S-01** | Leaked Password Protection | Supabase Dashboard'dan aktifleştir |
| **S-03** | pg_net extension | Extensions schema'sına taşı |

**Genel Güvenlik Skoru: 8.5/10** *(Düzeltmeler sonrası)*

---

*Bu rapor, statik kod analizi ve konfigürasyon incelemesi temelinde hazırlanmıştır. Penetrasyon testi (pen-test) ayrıca yapılması önerilir.*
