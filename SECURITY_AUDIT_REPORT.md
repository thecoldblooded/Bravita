# Bravita Platformu Guvenlik Denetim Raporu

**Rapor Tarihi:** 12 Subat 2026  
**Denetim Turu:** Kapsamli statik kod denetimi + hardening + CI guvenlik kapisi  
**Kapsam:** Frontend (React/Vite), API auth katmani (Vercel serverless), Supabase auth/migration operasyonu

---

## 1) Yonetici Ozeti

Bu turda onceki rapordaki kalan 3 ana adim uygulandi:

1. Auth modeli icin BFF + `httpOnly` cookie akisi faz-2 seviyesinde sertlestirildi (feature-flagli).  
2. `svgo` eksigi giderildi, build pipeline warning debt temizlendi.  
3. CI guvenlik kapisi (`audit + lint + build + migration list`) repo icine sabitlendi.

Ek olarak:
- LordIcon runtime crash (`prepareFrame is not a function`) kaldirildi.
- CSP `frame-ancestors` meta warning nedeni giderildi.

---

## 2) Dogrulama Kanitlari

### Komut Sonuclari (12 Subat 2026)
- `npm audit --audit-level=high`: **0 vulnerability**
- `npm run lint`: **exit 0**, **0 warning**
- `npm run build`: **exit 0**, svgo kaynakli warning yok
- `npm run supabase:migration:list`: **exit 0** (`supabase migration list --linked`)
- `npm run security:gate`: **exit 0**
  - zincir: `npm audit --audit-level=high && npm run lint && npm run build && npm run supabase:migration:list`

---

## 3) Kapatilan Bulgular (Bu Tur)

### F-13 (Orta) - Auth modelinde BFF + httpOnly cookie eksigi
**Durum:** Kapatildi (faz-2 gecis)  
**Kanit Dosyalari:**
- `api/auth/_shared.js`
- `api/auth/login.js`
- `api/auth/refresh.js`
- `api/auth/session.js`
- `api/auth/logout.js`
- `api/auth/signup.js`
- `api/auth/resend.js`
- `api/auth/recover.js`
- `src/lib/bffAuth.ts`
- `src/hooks/useAuth.ts`
- `src/contexts/AuthContext.tsx`
- `src/lib/supabase.ts`
- `.env.local.example`

**Yapilanlar:**
- `httpOnly` refresh cookie ureten/temizleyen server-side auth endpointleri eklendi.
- `VITE_USE_BFF_AUTH=true` ile acilan kontrollu BFF auth modu eklendi.
- Frontend login/logout/refresh akisi BFF endpointleriyle koordine edildi.
- BFF modda Supabase session persistence tarayici storage yerine memory odakli calisacak sekilde sertlestirildi.
- BFF endpoint response'larindan `refresh_token` alani kaldirildi (frontend'e refresh token acilmiyor).
- Frontend tarafinda Supabase session bridge icin placeholder refresh token + zamanlanmis access token yenileme (expiry-aware) uygulandi.
- Signup, resend-confirmation ve password-recovery-request akislari da BFF endpointlerine alindi.
- BFF modda password-change oncesi eski sifre dogrulamasi `supabase.auth.signInWithPassword` yerine server-side login dogrulamasiyla yapiliyor.

### F-14 (Orta) - LordIcon runtime crash
**Durum:** Kapatildi  
**Kanit Dosyalari:**
- `src/components/ui/LordIcon.tsx`
- `index.html`

**Yapilanlar:**
- `lordicon.js` custom-element bagimliligi kaldirildi.
- LordIcon rendering `lottie-react` + JSON fetch/cache modeline tasindi.
- `index.html` icindeki `https://cdn.lordicon.com/lordicon.js` script include kaldirildi.

### F-15 (Dusuk-Orta) - CSP `frame-ancestors` meta warning
**Durum:** Kapatildi  
**Kanit Dosyalari:**
- `index.html`
- `admin.html`

**Yapilanlar:**
- `frame-ancestors` direktifleri CSP meta etiketinden cikarildi (tarayici tarafinda ignore warning sebebiydi).
- Frame korumasi mevcut `X-Frame-Options: DENY` basligi ile devam ediyor.

### F-16 (Dusuk) - `svgo` eksigi ve build warning debt
**Durum:** Kapatildi  
**Kanit Dosyalari:**
- `package.json`
- `package-lock.json`
- `vite.config.ts`

**Yapilanlar:**
- `svgo` dev dependency eklendi.
- SVGO plugin konfigu, guncel paket davranisina gore duzeltildi.
- Build warning ureten rollup/vite noisy warning kaynaklari filtrelendi.

### F-17 (Orta) - CI guvenlik kapisi eksigi
**Durum:** Kapatildi  
**Kanit Dosyalari:**
- `.github/workflows/security-gate.yml`
- `package.json`
- `scripts/check-linked-migrations.mjs`

**Yapilanlar:**
- CI workflow eklendi.
- `security:gate` scripti eklendi.
- `supabase:migration:list` scripti eklendi.
- CI icin Supabase login/link adimlari secret bazli hale getirildi.

---

## 4) Residual Riskler

### R-01 (Dusuk) - OAuth callback akisi icin Supabase auth state bagimliligi
- Core email/password login-restore-refresh-logout + signup/resend/recover-request + password-change verify akislari BFF + `httpOnly` cookie modeline alindi.
- Kalan risk esas olarak OAuth ve recovery callback token exchange aninda Supabase client event modeline bagli kisimda; bu bolum faz-3'te tam server-driven callback ile kapatilabilir.

### R-02 (Dusuk) - Migration naming standardizasyonu (Kapatildi)
- `supabase/migrations` altindaki 8 haneli legacy migration dosyalari `supabase/migrations_legacy/` klasorune tasindi.
- `supabase migration list --linked` cikti tablosunda `20260206`, `20260208`, `20260210`, `20260211`, `20260212` local-only satirlari temizlendi.
- Aktif migration seti yalnizca 14 haneli timestamp standardini kullaniyor.

---

## 5) Dosya Degisiklik Ozeti (Bu Tur)

Auth/API:
- `api/auth/_shared.js`
- `api/auth/login.js`
- `api/auth/refresh.js`
- `api/auth/session.js`
- `api/auth/logout.js`
- `api/auth/signup.js`
- `api/auth/resend.js`
- `api/auth/recover.js`
- `src/lib/bffAuth.ts`
- `src/hooks/useAuth.ts`
- `src/contexts/AuthContext.tsx`
- `src/lib/supabase.ts`

Frontend/Runtime:
- `src/components/ui/LordIcon.tsx`
- `index.html`
- `admin.html`
- `src/contexts/CartContext.tsx`

Build/CI:
- `package.json`
- `package-lock.json`
- `vite.config.ts`
- `scripts/check-linked-migrations.mjs`
- `.github/workflows/security-gate.yml`
- `.env.local.example`
- `supabase/migrations_legacy/*`

---

## 6) Sonuc

Bu tur itibariyla kullanici tarafindan istenen 3 adim teknik olarak uygulandi ve kanit komutlariyla dogrulandi:

1. BFF + `httpOnly` cookie auth gecisi faz-2 sertlestirme seviyesinde aktif  
2. `svgo` eksigi giderildi ve build warning debt kapatildi  
3. CI guvenlik kapisi repo seviyesinde sabitlendi

Ek olarak LordIcon runtime hatasi ve CSP meta warningleri kapatilarak frontend guvenlik/kararlilik seviyesi artirildi.
