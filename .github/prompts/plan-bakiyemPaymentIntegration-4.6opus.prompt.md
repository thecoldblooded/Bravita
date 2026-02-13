# Bakiyem Canli Odeme Entegrasyonu - Projeye Uyumlu Master Plan (Docs-Aligned)

Tarih: 2026-02-12  
Ortam: `bravita-future-focused-growth-main`

Referans (source of truth):
- `https://dev.bakiyem.com/#genel_bilgiler`
- `https://dev.bakiyem.com/#baslarken`
- `https://dev.bakiyem.com/3dli-odeme`
- `https://dev.bakiyem.com/iptal-islemi`
- `https://dev.bakiyem.com/odeme-detay-listesi`
- `https://dev.bakiyem.com/odeme-listesi`
- `https://dev.bakiyem.com/ortak-odeme`
- `https://dev.bakiyem.com/test-kartlari`
- `https://dev.bakiyem.com/hata-kodlari`

## 1. Objective
Mevcut test-odakli kart odeme akisini, Bakiyem/Moka 3D Secure ile canli odeme alacak ve stok/odeme tutarliligini bozmayacak sekilde uretime tasimak.  
Kart akisinda order olusturma, sadece 3D callback + provider dogrulamasi sonrasinda atomik finalize ile yapilacak.

## 2. Tech Strategy
- Pattern: `PaymentIntent + StockReservation + Callback Finalize` (order-last).
- State truth: finansal dogruluk kaynagi `payment_intents.status`.
- Capture mode:
  - Primary: `direct_3d` (`/PaymentDealer/DoDirectPaymentThreeD`).
  - Optional fallback: `shared_page` (`/ortak-odeme`) yalniz feature flag ile.
  - Sprint 0'da `Gateway Capability Decision Record (GCDR)` ile tek aktif mod kilitlenir.
- Constraints:
  - Installment: docs'a gore pesin `0/1`, taksit `2..12`.
  - Tutarlar DB tarafinda `*_cents` olarak saklanacak.
  - Callback'te hash/signature field dokumanda zorunlu degil; dogrulama detail-query ile tamamlanacak.
  - Komisyon orani kaynagi V1'de `installment_rates` tablosu (manuel seed + admin yonetimi); dokumante bir "oran listeleme" API'si bulunursa feature-flag ile devreye alinacak.
  - Kart odemede hesap: `odenecek_taban = urun_toplam_cents + kdv_toplam_cents + kargo_cents`; `komisyon = round(odenecek_taban * commission_rate)`; `paid_total = odenecek_taban + komisyon`.
  - Havale/EFT odemede komisyon uygulanmayacak (`paid_total = urun + kdv + kargo`).

## 3. Provider Contract (Docs Lock)
| Use Case | Endpoint | Kritik Alanlar |
|:--|:--|:--|
| 3D init | `/PaymentDealer/DoDirectPaymentThreeD` | `Amount`, `InstallmentNumber`, `RedirectUrl`, `OtherTrxCode`, `IsPreAuth`, `CardToken` opsiyonel |
| 3D callback | `RedirectUrl` POST | `isSuccessful`, `resultCode`, `resultMessage`, `trxCode` |
| Void | `/PaymentDealer/DoVoid` | `VirtualPosOrderId=trxCode`, `VoidRefundReason`, `ClientIP` |
| Capture (opsiyonel) | `/PaymentDealer/DoCapture` | `VirtualPosOrderId` veya `OtherTrxCode`, `Amount` |
| Pool payment approve (opsiyonel) | `/PaymentDealer/DoApprovePoolPayment` | `VirtualPosOrderId` veya `OtherTrxCode` |
| Detail inquiry | `/PaymentDealer/GetDealerPaymentTrxDetailList` | `DealerPaymentId` veya `OtherTrxCode` |
| Reconciliation list | `/PaymentDealer/GetPaymentList` | `PaymentStartDate`, `PaymentEndDate`, `PaymentStatus`, `TrxStatus` |
| Customer + card tokenization (opsiyonel) | `/DealerCustomer/AddCustomerWithCard` | Customer + kart ekler, `CardToken` doner |
| Card add to existing customer (opsiyonel) | `/DealerCustomer/AddCard` | Musteriye kart ekler, `CardToken` doner |

### 3.1 Test Ortami ve Test Kartlari (Docs)
- Test base URL: `https://service.testmoka.com`
- Live base URL: `https://service.moka.com`
- Test kartlari:
  - `5269552233334444 / 12/2022 / 000`
  - `5269552233334445 / 12/2022 / 000`
  - `5406682233334444 / 12/2022 / 000`

Ek notlar:
- `InstallmentNumber` hatali degerlerde provider hata doner; backend 1..12 disi taksiti en basta reddedecek.
- `GetPaymentList` tek istekte 500 kayit limitine sahip; gunluk uzlastirma parcali zaman penceresiyle calisacak.
- `ortak-odeme` modu hosted-field degil; base64 URL yonlendirmesi + `durumu/aciklama/ozel1/ozel2` callback donusu var.
- Dokuman taramasinda acik bir `DoRefund` endpoint'i gorunmedi; iade akisinin API yolu go-live oncesi Bakiyem destekle yazili teyit edilmelidir.
- Komisyon/taksit oranlarini donen dokumante bir endpoint bulunamadi; probe edilen aday endpointler (`GetDealerPaymentMethods`, `GetInstallment*`) `404` dondu.
- Verilen bayi kimlikleriyle `https://service.moka.com/PaymentDealer/GetPaymentList` cagrisinda `PaymentDealer.GetPaymentList.NoDataFound` yaniti alindi (auth calisiyor); ayni kimliklerle `https://service.testmoka.com` cagrilari `EX` dondugu icin test profil/provizyonu Bakiyem destekten teyit edilmelidir.
- Payload kontratlari:
  - `direct_3d`: Edge input kart alanlari icerir (`cardNumber`, `expMonth`, `expYear`, `cvc`), strict redaction zorunlu.
  - `shared_page`: Edge input kart alani icermez; sadece provider yonlendirme token/nonce veya URL payload tasinir.

### 3.2 Komisyon Oranlari (Merchant Baslangic Seed)
| Taksit | Komisyon (%) |
|:--|--:|
| 1 (Tek Cekim) | 4.50 |
| 2 | 8.71 |
| 3 | 10.78 |
| 4 | 12.87 |
| 5 | 14.93 |
| 6 | 17.00 |
| 7 | 19.10 |
| 8 | 21.18 |
| 9 | 23.25 |
| 10 | 25.35 |
| 11 | 27.43 |
| 12 | 29.51 |

Kurallar:
- Seed migration bu oranlari `installment_rates` tablosuna yazacak.
- Checkout UI provider docs ile uyumlu olarak V1'de `1 + 2..12` gosterecek.
- `10..12` oranlari tabloda tutulur fakat `is_active=false` baslatilir; provider tarafinda destek yazili teyit edilince aktif edilir.

## 4. Blast Radius (Breaking Changes)
1. `create_order` kartta `payment_status='paid'` yapiyor; bu davranis kaldirilmazsa fake-paid order olusur.
2. `trigger_deduct_stock` aktif oldugu icin reserve/finalize modeliyle cift stok hareketi olur.
3. `admin_update_order_status` iptalde `refunded` yazabiliyor; gateway-dogrulanmis finansal state ile drift yaratir.
4. Checkout UI test modu metni ve kart formu davranisi canli akisla uyumsuz.
5. `supabase/config.toml` icinde yeni edge function auth posture tanimlanmamis.
6. Fiyat hesapta KDV/kargo komisyon matrahina dahil edilmezse tahsilat eksik/yanlis olur.

## 5. File Changes
| Action | File Path | Brief Purpose |
|:--|:--|:--|
| MOD | `src/pages/Checkout.tsx` | Kartta `createOrder` yerine `bakiyem-init-3d` akisini cagir |
| MOD | `src/components/checkout/PaymentMethodSelector.tsx` | Test metinlerini kaldir, taksit secimi (1,2..9) ve capture mode davranisi ekle |
| MOD | `src/components/checkout/OrderSummary.tsx` | Komisyon ve paid total kirilimi |
| MOD | `src/pages/OrderConfirmation.tsx` | Intent/order uzerinden odeme sonucu + taksit/komisyon gosterimi |
| NEW | `src/pages/ThreeDSRedirect.tsx` | Same-tab 3D yonlendirme route'u |
| NEW | `src/pages/PaymentFailed.tsx` | Hata kodu cevirisi + retry UX |
| MOD | `nginx.conf` | `/3d-redirect` icin dar kapsamli CSP (`form-action`, `frame-src`) |
| MOD | `src/lib/checkout.ts` | `initiateCardPayment`, `getInstallmentRates`, bank transfer ayrimi |
| MOD | `src/App.tsx` | `/3d-redirect` ve `/payment-failed` route ekleme |
| NEW | `supabase/migrations/<ts>_payment_intents_foundation.sql` | `payment_intents`, `stock_reservations`, `payment_transactions`, `payment_webhook_events(processing_status)`, `payment_manual_review_queue`, `installment_rates` |
| NEW | `supabase/migrations/<ts>_orders_intent_columns.sql` | `orders.payment_intent_id` FK+UNIQUE, `*_cents` kolonlari |
| NEW | `supabase/migrations/<ts>_disable_legacy_stock_trigger.sql` | `trigger_deduct_stock` devreden cikarma |
| NEW | `supabase/migrations/<ts>_rpc_quote_reserve_finalize.sql` | `calculate_order_quote_v1`, `reserve_stock_for_intent_v1`, `finalize_intent_create_order_v1` |
| NEW | `supabase/migrations/<ts>_rpc_cleanup_scheduler.sql` | `release_expired_reservations_v1`, `expire_abandoned_intents_v1` |
| NEW | `supabase/migrations/<ts>_rls_payment_tables.sql` | payment tablolari RLS + service_role disi write kapatma |
| MOD | `supabase/functions/create_order.sql` | Kart yolu kaldir, sadece `bank_transfer` order olustursun |
| NEW | `supabase/functions/bakiyem-init-3d/index.ts` | Init 3D + intent + reserve + audit |
| NEW | `supabase/functions/bakiyem-3d-return/index.ts` | Callback + dedupe + detail inquiry + finalize |
| NEW | `supabase/functions/bakiyem-void/index.ts` | Admin void operasyonu |
| NEW | `supabase/functions/bakiyem-capture/index.ts` | Preauth kullaniminda capture operasyonu |
| NEW | `supabase/functions/bakiyem-tokenize-card/index.ts` | Opsiyonel card-token olusturma (`DealerCustomer/*`) |
| NEW | `supabase/functions/payment-maintenance/index.ts` | Scheduled cleanup (`release_expired_reservations_v1`, `expire_abandoned_intents_v1`) |
| MOD | `supabase/config.toml` | Yeni function `verify_jwt` posture |
| MOD | `supabase/migrations/<ts>_admin_status_alignment.sql` | `admin_update_order_status` finansal state driftini engelle |

## 6. Execution Sequence
1. Sprint 0 - Decision Lock
- `Gateway Capability Decision Record (GCDR)` olusturulur ve tek aktif yol kilitlenir:
  - Hosted/tokenization capability probe yapilir; varsa kart alanlari backend'e gelmeyecek kontrat tercih edilir.
  - `direct_3d` secilirse edge payload kart alanlariyla calisir, Direct hardening checklist zorunlu.
  - `shared_page` secilirse edge payload kart alani icermez, yalniz yonlendirme payload'i tasinir.
- `PAYMENT_CAPTURE_MODE=direct_3d` varsayilan olarak kilitlenir.
- `shared_page` sadece fallback flag olarak tanimlanir (`payment_shared_page_enabled`).
- Redirect URL kontrati netlenir: `/functions/v1/bakiyem-3d-return?intentId=<uuid>`.
- Go-live kill-switch davranisi netlenir: kart akisi kapaninca checkout'ta kibar fail + bank transfer onerisi.

2. Sprint 1 - DB Foundation
- `installment_rates` seed'i merchant oranlariyla olusturulur:
  - `1:4.50, 2:8.71, 3:10.78, 4:12.87, 5:14.93, 6:17.00, 7:19.10, 8:21.18, 9:23.25, 10:25.35, 11:27.43, 12:29.51`
  - `1..9 is_active=true`, `10..12 is_active=false` (provider teyidine kadar).
- `payment_intents` icinde `idempotency_key`, `idempotency_expires_at`, `item_total_cents`, `vat_total_cents`, `shipping_total_cents`, `commission_amount_cents`, `paid_total_cents`, `merchant_ref`, `gateway_trx_code`.
- `payment_webhook_events` icinde `processing_status` (`received/ignored/processed/failed`) zorunlu olur.
- `orders.payment_intent_id UUID UNIQUE NOT NULL` + FK zorunlu.
- Legacy stok trigger kapatilir.
- `orders.payment_status` minimal tutulur (`paid/failed/refunded`), operasyonel finansal state intent tarafinda kalir.
- RLS politikasi migration ile kilitlenir: user sadece kendi intent'ini read eder; payment audit tablolarinda user read/write yoktur.

3. Sprint 2 - RPC Atomics
- `calculate_order_quote_v1` frontend tutarini yok sayar, server-side hesaplar; cikta `rate_version` + `effective_from` doner.
- Kart odeme quote formulu:
  - `base_total_cents = item_total_cents + vat_total_cents + shipping_total_cents`
  - `commission_amount_cents = round(base_total_cents * commission_rate)`
  - `paid_total_cents = base_total_cents + commission_amount_cents`
- Havale/EFT quote formulu:
  - `base_total_cents = item_total_cents + vat_total_cents + shipping_total_cents`
  - `commission_amount_cents = 0`
  - `paid_total_cents = base_total_cents`
- `reserve_stock_for_intent_v1` TTL rezervasyon olusturur.
- `idempotency_key` stratejisi sabitlenir:
  - `sha256(user_id + cart_hash + shippingAddressId + installmentCount + quote_version + day_bucket)`
  - 30 saniye icinde ayni payload tekrarinda ayni intent doner.
  - 10 dakika sonra yeni intent uretilir.
- `finalize_intent_create_order_v1`:
  - `SELECT ... FOR UPDATE` ile intent satiri kilidi.
  - Intent zaten `paid` ise mevcut order id doner.
  - Stock hard decrement + order create + intent paid tek transaction.
- `expire_abandoned_intents_v1` ile `expires_at < now()` intent'ler `expired` yapilir.
- Cleanup RPC'leri `Supabase Scheduled Function` ile her 5 dakikada bir cagrilir (`payment-maintenance`).

4. Sprint 3 - Edge Functions
- `bakiyem-init-3d`:
  - `DoDirectPaymentThreeD` cagrisi.
  - `OtherTrxCode=intent_id` set edilir.
  - `correlation_id` frontend -> init -> provider alanlarinda (mumkunse `merchant_ref`) tasinir.
  - `RedirectUrl` query'sine `intentId` yazilir.
  - Risk limit: user basina `init-3d` dakikada `N` (oneri: 5) deneme ile sinirlanir.
- `bakiyem-3d-return`:
  - Callback body: `isSuccessful`, `resultCode`, `resultMessage`, `trxCode`.
  - Dedupe key standardi: `sha256(provider + trxCode + resultCode + payload_hash)`.
  - Amount callback'te yok kabul edilir; her basarili callbackte `GetDealerPaymentTrxDetailList` ile amount/status cekilir.
  - `provider_amount` ile `intent.paid_total_cents` birebir eslesmiyorsa finalize durdurulur, review queue'ya gider.
  - `hash_mismatch`, `missing_finalize`, `detail_query_error` durumlari da otomatik `payment_manual_review_queue` kaydi acar.
- `bakiyem-void`: `DoVoid(VirtualPosOrderId=trxCode)`.
- `bakiyem-capture`: sadece `IsPreAuth=1` kullaniliyorsa aktif edilir.
- Opsiyonel tokenization: tekrarli musterilerde `DealerCustomer/AddCustomerWithCard` veya `DealerCustomer/AddCard` ile `CardToken` uretilip 3D initte kullanilabilir.

5. Sprint 4 - Frontend Checkout
- Kartta order olusturma kaldirilir, 3D baslatma + redirect akisi kullanilir.
- `ThreeDSRedirect` same-tab route'u kullanilir; `document.write`, popup/new-window ve kontrolsuz iframe kullanilmaz.
- `/3d-redirect` icin dar kapsamli CSP uygulanir.
- Taksit secenekleri `1 + 2..12`; provider uyumsuz secenek UI'da pasif.
- `PaymentFailed` sayfasi `hata-kodlari` map'i ile kullanici dostu mesaj verir.
- Kill-switch acik degilse kart secenegi disable + bank transfer fallback.
- Summary kirilimi zorunlu: `Urun`, `KDV`, `Kargo`, `Komisyon`, `Odenecek Toplam` (kartta komisyon dolu, havalede 0).

6. Sprint 5 - Ops + Reconciliation
- Gunluk uzlastirma `GetPaymentList` ile pencereli cekilir.
- Her liste kaydi `OtherTrxCode` veya internal map ile local intent/order ile eslestirilir.
- Mismatch durumlari `payment_manual_review_queue` tablosuna dedupe ile yazilir.

7. Sprint 6 - Canary + Go Live
- `%5 -> %25 -> %100` rollout.
- Her adimda duplicate callback, stock race, timeout, void fail, detail-query mismatch testleri kosulur.

## 7. Security and Compliance Rules
- Direct 3D modunda kart verisi sadece edge runtime memory'de kullanilir, DB/log'a yazilmaz.
- Log redaction zorunlu: PAN/CVC, fullname, email gibi PII maskelenir.
- Direct modda request body log kapali olur; exception stack'te PAN/CVC sizmasi test edilir.
- Edge Function auth notu (Supabase gateway uyumu):
  - Client `functions.invoke()` cagrilarinda gateway icin `Authorization: Bearer <anon key>` gonderir.
  - Gercek kullanici oturumu token'i `x-user-jwt: <access_token>` header'i ile tasinir ve function icinde `supabase.auth.getUser(x-user-jwt)` ile dogrulanir.
  - Bu model, platform seviyesinde `Invalid JWT` (gateway reject) yasandiginda bile function-level auth'i korur.
- Callback signature dokumanda garanti degil:
  - Bu nedenle IP allowlist (mumkunse), strict schema, dedupe, rate-limit ve provider detail-query dogrulamasi bir arada zorunlu.
- Rate limit: `bakiyem-init-3d` user/IP bazli dakika basina `N` (oneri 5) deneme ile sinirli.
- RLS:
  - `payment_intents`: user kendi kaydini read.
  - `payment_transactions`, `payment_webhook_events`, `payment_manual_review_queue`, `stock_reservations`: user read yok.
  - Tum yazma isleri service role + RPC/Edge.
- `SECURITY DEFINER` siniri:
  - `finalize_intent_create_order_v1`, `reserve_stock_for_intent_v1`, `release_expired_reservations_v1`, `expire_abandoned_intents_v1` sadece service role tarafindan cagrilir.
  - `EXECUTE` izni anon/auth rollerinden kaldirilir, yalniz backend service path kullanir.

## 8. Verification Standards
- [x] `src/pages/Checkout.tsx` artik kartta `createOrder` cagirmiyor.
- [x] `supabase/functions/create_order.sql` kart odeme yolunu kapatti, sadece bank transfer order aciyor.
- [x] `installment_rates` seed migration'i 12 oranla olustu; `1..12 active`.
- [x] `https://service.moka.com/PaymentDealer/GetPaymentList` read-only health check'i auth basarili donuyor (`NoDataFound` kabul).
- [x] `https://service.testmoka.com` profil/provizyon teyidi alinmadan sandbox test sonuclari go-live onayi icin kullanilmiyor.
- [x] `trigger_deduct_stock` devre disi.
- [x] Duplicate callback'te tek order olusuyor (`orders.payment_intent_id` unique korumasi).
- [x] `payment_webhook_events.processing_status` duplicate callbackte `ignored`a geciyor.
- [x] Callback amount olmadan sadece detail query ile finalize karari veriliyor.
- [x] Dedupe key standardi `sha256(provider + trxCode + resultCode + payload_hash)` ile uretiliyor.
- [x] `1..12` disi taksit backend tarafinda reddediliyor.
- [x] `calculate_order_quote_v1` cikisinda `rate_version` + `effective_from` var ve intent snapshot'a yaziliyor.
- [x] Kart quote'unda `commission_amount_cents = round((item_total_cents + vat_total_cents + shipping_total_cents) * commission_rate)` kurali uygulanıyor.
- [x] Havale/EFT quote'unda `commission_amount_cents = 0` ve toplam `item + kdv + kargo` olarak kaliyor.
- [x] `DoVoid` `trxCode` ile calisiyor, basarisizlikta `void_pending` review akisi var.
- [x] `expire_abandoned_intents_v1` pending/awaiting_3d intentleri `expired` yapiyor.
- [ ] Scheduler gercekte 5 dakikada bir cleanup RPC'lerini tetikliyor.
- [x] Reconciliation 500 limitini asmayacak sekilde zaman pencereli calisiyor.
- [x] Kill-switch kapaliyken kart akisi baslamiyor, bank transfer akisi bozulmuyor.
- [x] `ThreeDSRedirect` same-tab route'u aktif, `document.write`/popup kullanilmiyor ve route-level CSP uygulanmis.
- [ ] Test kart `5269552233334444 / 12/2022 / 000` ile basarili 3D akisi dogrulandi.
- [ ] Test kart `5269552233334445 / 12/2022 / 000` ile basarisiz akista fail + release + audit dogrulandi.
- [ ] Opsiyonel tokenization aciksa `CardToken` ile kart numarasi gondermeden 3D init akisi dogrulandi.

## 9. Locked Decisions
1. Kart akisi source-of-truth: `payment_intents`, order-last finalize.
2. Provider inquiry kontrati: `GetDealerPaymentTrxDetailList` (`OtherTrxCode=intent_id` ana anahtar).
3. Installment policy: `1` (pesin) + `2..12` (taksit).
4. GCDR sonucu tek capture mode kilitlenir; diger yol sadece feature flag fallback olarak kalir.
5. Hosted/shared-page modunda kart alanlari backend payload'ina girmez; direct modda hardening checklist zorunludur.
6. Finansal drift onleme: order state gorunumsel, finansal gercek durum intent + transactions timeline.
7. Cleanup altyapisi: Supabase Scheduled Function her 5 dakikada `release_expired_reservations_v1` + `expire_abandoned_intents_v1` cagirir.
8. `DoRefund` dokumanda net endpoint olarak gecmedigi icin V1 scope disi; iade API yolu yazili teyit alindiktan sonra aktif edilir.
