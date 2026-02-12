# Legacy Migration Archive

Bu klasor, Supabase CLI tarafinda `local-only` satir olusturan eski naming formatindaki migration dosyalarini tutar.

- Bu dosyalar aktif migration pipeline'inin parcasi degildir.
- Aktif migration dosyalari `supabase/migrations/` altinda 14 haneli timestamp (`YYYYMMDDHHMMSS_...`) standardini kullanir.
- Geriye donuk inceleme/disaster analysis gerektiginde arsiv referansi olarak korunur.
