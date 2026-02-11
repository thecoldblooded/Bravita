# PLAN-email-management.md - E-posta Yönetim Sistemi

Bu plan, Bravita platformu üzerindeki tüm e-posta gönderim süreçlerini merkezi bir admin panelinden yönetilebilir hale getirmeyi amaçlar.

## 📋 Hedefler
- Tüm e-posta şablonlarını veritabanına taşımak ve görsel olarak düzenlenebilir kılmak.
- Gönderici adreslerini (Subdomain/From) kategori bazlı eşleştirmek ve yeni subdomainleri (örn: `marketing`, `alert` vb.) panelden kolayca ekleyebilmek.
- Gönderilen tüm mailleri içerikleriyle birlikte loglamak ve admin panelinde görüntülemek.
- Test maili gönderim özelliği ile şablonları canlıya almadan denemek.

## 🏗️ Mimari Yapı

### 1. Veritabanı Şeması (PostgreSQL)

#### `email_templates`
| Kolon | Tip | Açıklama |
| --- | --- | --- |
| `id` | UUID (PK) | Benzersiz kimlik |
| `name` | TEXT | İnsanlar tarafından okunabilir ad (örn: Sipariş Onayı) |
| `slug` | TEXT (Unique) | Kodun referans alacağı kimlik (örn: `order_confirmation`) |
| `subject` | TEXT | E-posta konusu (değişken içerebilir) |
| `content_html` | TEXT | Render edilecek HTML içeriği |
| `content_text` | TEXT | Yedek düz metin içeriği |
| `variables` | JSONB | Kullanılan değişkenlerin listesi ve örnekleri |
| `version` | INT | Versiyon numarası |

#### `email_configs`
| Kolon | Tip | Açıklama |
| --- | --- | --- |
| `id` | UUID (PK) | - |
| `slug` | TEXT (FK) | `email_templates.slug` ile eşleşir |
| `sender_name` | TEXT | Gönderen adı (örn: Bravita Destek) |
| `sender_email` | TEXT | Gönderen e-posta (örn: `support@bravita.com.tr`) |
| `reply_to` | TEXT | Yanıt adresi |
| `is_active` | BOOLEAN | Aktiflik durumu |

#### `email_logs` (Geliştirilmiş)
| Kolon | Tip | Açıklama |
| --- | --- | --- |
| `id` | UUID (PK) | - |
| `recipient` | TEXT | Alıcı e-posta |
| `template_slug` | TEXT | Hangi şablon kullanıldı? |
| `subject` | TEXT | Gönderilen konu |
| `content_snapshot` | TEXT | Gönderilen anlık HTML içeriği |
| `status` | TEXT | sent, failed, error |
| `error_details` | TEXT | Hata mesajı |

### 2. Admin UI (React + Tailwind)

#### `AdminEmailDashboard.tsx` (Yeni Sayfa)
- **Şablon Listesi:** Tüm şablonları görüntüleme, yeni şablon oluşturma.
- **Şablon Editörü:** 
    - HTML/Code View (Monaco Editor).
    - Canlı Önizleme (Iframe içinde).
    - Değişken Listesi Yardımcısı.
- **Konfigürasyon Sekmesi:** Dinamik subdomain yönetimi. Yeni gönderici adresleri (`sender_email`), adları ve subdomain tanımları eklenebilir.
- **Log Görüntüleyici:** Gönderilen maillerin listesi ve "Görüntüle" butonuyla tam HTML önizleme.
- **Test Gönderimi:** Hedef mail adresi girerek seçili şablonu test etme butonu.

### 3. Edge Functions Refaktörü
- `send-order-email`, `send-support-email`, `send-welcome-email` fonksiyonları:
    1. DB'den ilgili `slug`'a ait şablonu ve config'i çeker.
    2. Gelen verileri şablondaki değişkenlerle yer değiştirir (`mustache` veya basit replace).
    3. Resend üzerinden gönderir.
    4. Gönderilen içeriği `email_logs`'a snapshot olarak kaydeder.

## 🔒 Güvenlik Katmanı
- **RLS:** Tüm e-posta tabloları sadece `is_admin` veya `is_superadmin` olan profiller tarafından okunabilir/yazılabilir olacak.
- **Server-side Validation:** Edge functionlar içerisinde JWT doğrulaması ve admin yetki kontrolü sıkılaştırılacak.
- **Audit Logging:** Şablon değişiklikleri `admin_audit_log` tablosuna kaydedilecek.

## 🚀 Uygulama Adımları

1. **DB Migration:** Gerekli tabloların ve RLS politikalarının oluşturulması.
2. **Data Import:** `email_templates/` klasöründeki mevcut HTML'lerin veritabanına migrate edilmesi.
3. **Core API:** Şablonları okuyan ve gönderen merkezi bir yapı (helper) kurulması.
4. **Admin UI Development:** Dashboard, Editor ve Log ekranlarının geliştirilmesi.
5. **Testing & Migration:** Tüm mail tetikleyicilerinin yeni sisteme geçirilmesi.

## ✅ Doğrulama Kriterleri
- [ ] Admin panelinde bir şablon değiştirildiğinde, bir sonraki mail bu yeni şablonla gitmeli.
- [ ] Gönderilen her mail Log sayfasında tam HTML olarak önizlenebilmeli.
- [ ] Test butonu ile alakasız bir maile başarılı şekilde gönderim yapılabilmeli.
- [ ] Admin olmayan kullanıcılar bu verilere hiçbir şekilde erişememeli.
