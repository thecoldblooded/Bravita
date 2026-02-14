-- Standardize email template raw content, names and subjects for admin/editor consistency.
-- Shared renderer still applies the global Bravita shell/footer on send.

BEGIN;

WITH payload (
  slug,
  name,
  subject,
  variables,
  title,
  body,
  cta_label,
  cta_href,
  meta1,
  meta2,
  meta3,
  meta_align
) AS (
  VALUES
    (
      'confirm_signup',
      'Hesap Doğrulama',
      'E-posta Adresinizi Doğrulayın 🔐',
      '["CONFIRMATION_URL"]'::jsonb,
      'Hesabınızı Doğrulayın',
      'Bravita hesabınızı güvenle kullanmak için e-posta doğrulama adımını tamamlayın.',
      'E-postamı Doğrula',
      '{{CONFIRMATION_URL}}',
      'Doğrulama bağlantısı güvenlik nedeniyle sınırlı süreyle geçerlidir.',
      NULL,
      NULL,
      'center'
    ),
    (
      'reset_password',
      'Şifre Sıfırlama',
      'Şifre Sıfırlama Talebiniz 🔐',
      '["CONFIRMATION_URL"]'::jsonb,
      'Şifrenizi Yenileyin',
      'Hesabınız için bir şifre sıfırlama talebi aldık. Devam etmek için aşağıdaki butonu kullanın.',
      'Şifremi Sıfırla',
      '{{CONFIRMATION_URL}}',
      'Bu işlem size ait değilse bu e-postayı güvenle görmezden gelebilirsiniz.',
      NULL,
      NULL,
      'center'
    ),
    (
      'password_changed',
      'Şifre Değiştirildi',
      'Şifreniz Başarıyla Güncellendi 🔐',
      '["SITE_URL"]'::jsonb,
      'Şifreniz Değiştirildi',
      'Hesabınızın şifresi başarıyla güncellendi. Bu işlem size ait değilse lütfen hemen destek ekibimizle iletişime geçin.',
      'Hesabıma Git',
      '{{SITE_URL}}',
      'Güvenliğiniz için düzenli olarak güçlü ve benzersiz şifreler kullanın.',
      NULL,
      NULL,
      'center'
    ),
    (
      'welcome_template',
      'Hoş Geldiniz',
      'Bravita''ya Hoş Geldiniz 🎉',
      '["NAME","SITE_URL","UNSUBSCRIBE_URL","BROWSER_LINK"]'::jsonb,
      'Hoş Geldiniz {{NAME}}!',
      'Bravita ailesine katıldığınız için mutluyuz. Yeni koleksiyonlar, kampanyalar ve özel içerikler sizi bekliyor.',
      'Alışverişe Başla',
      '{{SITE_URL}}',
      'E-posta tercihlerinizi güncellemek için <a href="{{UNSUBSCRIBE_URL}}" style="color:#ea580c;text-decoration:none;font-weight:700;">tıklayın</a>.',
      NULL,
      NULL,
      'center'
    ),
    (
      'order_confirmation',
      'Sipariş Onayı',
      'Siparişiniz Alındı 🧾 #{{ORDER_ID}}',
      '["ORDER_ID","ORDER_DATE","TOTAL","BROWSER_LINK"]'::jsonb,
      'Siparişiniz Alındı',
      'Siparişinizi başarıyla aldık. Hazırlık süreci başladı, en kısa sürede sizi bilgilendireceğiz.',
      'Sipariş Detayını Aç',
      '{{BROWSER_LINK}}',
      '<strong>Sipariş No:</strong> #{{ORDER_ID}}',
      '<strong>Tarih:</strong> {{ORDER_DATE}}',
      '<strong>Toplam:</strong> ₺{{TOTAL}}',
      'center'
    ),
    (
      'order_awaiting_payment',
      'Ödeme Bekleniyor',
      'Siparişiniz Alındı, Ödeme Bekleniyor 💳 #{{ORDER_ID}}',
      '["ORDER_ID","ORDER_DATE","TOTAL","BROWSER_LINK"]'::jsonb,
      'Ödeme Bekleniyor',
      'Siparişiniz oluşturuldu. Ödemeniz onaylandığında siparişiniz hazırlık aşamasına geçecektir.',
      'Sipariş Durumunu Gör',
      '{{BROWSER_LINK}}',
      '<strong>Sipariş No:</strong> #{{ORDER_ID}}',
      '<strong>Tarih:</strong> {{ORDER_DATE}}',
      '<strong>Toplam:</strong> ₺{{TOTAL}}',
      'center'
    ),
    (
      'order_processing',
      'Sipariş İşleniyor',
      'Siparişiniz İşleniyor ⚙️ #{{ORDER_ID}}',
      '["ORDER_ID","BROWSER_LINK"]'::jsonb,
      'Siparişiniz İşleniyor',
      'Siparişiniz ekiplerimiz tarafından kontrol ediliyor ve hazırlanma sırasına alınıyor.',
      'Sipariş Takibini Aç',
      '{{BROWSER_LINK}}',
      '<strong>Sipariş No:</strong> #{{ORDER_ID}}',
      NULL,
      NULL,
      'center'
    ),
    (
      'order_preparing',
      'Sipariş Hazırlanıyor',
      'Siparişiniz Hazırlanıyor 📦 #{{ORDER_ID}}',
      '["ORDER_ID","BROWSER_LINK"]'::jsonb,
      'Siparişiniz Hazırlanıyor',
      'Harika! Siparişiniz paketleme aşamasında. Kargoya verildiğinde sizi hemen bilgilendireceğiz.',
      'Sipariş Takibini Aç',
      '{{BROWSER_LINK}}',
      '<strong>Sipariş No:</strong> #{{ORDER_ID}}',
      NULL,
      NULL,
      'center'
    ),
    (
      'order_shipped',
      'Kargoya Verildi',
      'Siparişiniz Kargoya Verildi 🚚 #{{ORDER_ID}}',
      '["ORDER_ID","SHIPPING_COMPANY","TRACKING_NUMBER","BROWSER_LINK"]'::jsonb,
      'Siparişiniz Yolda',
      'Siparişiniz kargoya teslim edildi. Aşağıdaki bilgilerle gönderinizi takip edebilirsiniz.',
      'Gönderi Takibini Aç',
      '{{BROWSER_LINK}}',
      '<strong>Sipariş No:</strong> #{{ORDER_ID}}',
      '<strong>Kargo Firması:</strong> {{SHIPPING_COMPANY}}',
      '<strong>Takip No:</strong> {{TRACKING_NUMBER}}',
      'center'
    ),
    (
      'order_delivered',
      'Teslim Edildi',
      'Siparişiniz Teslim Edildi 🎁 #{{ORDER_ID}}',
      '["ORDER_ID","BROWSER_LINK"]'::jsonb,
      'Siparişiniz Teslim Edildi',
      'Siparişiniz başarıyla teslim edildi. Bravita''yı tercih ettiğiniz için teşekkür ederiz.',
      'Sipariş Geçmişini Aç',
      '{{BROWSER_LINK}}',
      '<strong>Sipariş No:</strong> #{{ORDER_ID}}',
      NULL,
      NULL,
      'center'
    ),
    (
      'order_cancelled',
      'Sipariş İptal Edildi',
      'Siparişiniz İptal Edildi ❌ #{{ORDER_ID}}',
      '["ORDER_ID","CANCELLATION_REASON","BROWSER_LINK"]'::jsonb,
      'Siparişiniz İptal Edildi',
      'Siparişiniz iptal edildi. Detayları aşağıda bulabilirsiniz.',
      'Sipariş Detayını Aç',
      '{{BROWSER_LINK}}',
      '<strong>Sipariş No:</strong> #{{ORDER_ID}}',
      '<strong>İptal Nedeni:</strong> {{CANCELLATION_REASON}}',
      NULL,
      'center'
    ),
    (
      'support_ticket',
      'Destek Talebi Alındı',
      'Destek Talebiniz Alındı 🎫 #{{TICKET_ID}}',
      '["NAME","SUBJECT","TICKET_ID","BROWSER_LINK"]'::jsonb,
      'Destek Talebiniz Alındı',
      'Merhaba {{NAME}}, talebiniz başarıyla kaydedildi. Ekibimiz en kısa sürede sizinle iletişime geçecektir.',
      'Talep Detayını Aç',
      '{{BROWSER_LINK}}',
      '<strong>Talep No:</strong> #{{TICKET_ID}}',
      '<strong>Konu:</strong> {{SUBJECT}}',
      NULL,
      'center'
    ),
    (
      'support_ticket_replied',
      'Destek Yanıtı',
      'Destek Talebinize Yanıt Geldi 💬 #{{TICKET_ID}}',
      '["TICKET_ID","USER_MESSAGE","ADMIN_REPLY","BROWSER_LINK"]'::jsonb,
      'Destek Talebiniz Yanıtlandı',
      'Talebiniz için ekibimiz bir yanıt paylaştı.',
      'Talep Detayını Aç',
      '{{BROWSER_LINK}}',
      '<strong>Talep No:</strong> #{{TICKET_ID}}',
      '<strong>Mesajınız:</strong> {{USER_MESSAGE}}',
      '<strong>Yanıtımız:</strong> {{ADMIN_REPLY}}',
      'left'
    ),
    (
      'support_ticket_closed',
      'Destek Talebi Kapatıldı',
      'Destek Talebiniz Çözümlendi ✅ #{{TICKET_ID}}',
      '["TICKET_ID","ADMIN_REPLY","BROWSER_LINK"]'::jsonb,
      'Destek Talebiniz Çözümlendi',
      'Talebiniz çözümlendi ve kapatıldı. Kısa bir özet aşağıdadır.',
      'Talep Geçmişini Aç',
      '{{BROWSER_LINK}}',
      '<strong>Talep No:</strong> #{{TICKET_ID}}',
      '<strong>Son Yanıt:</strong> {{ADMIN_REPLY}}',
      NULL,
      'left'
    )
)
UPDATE public.email_templates et
SET
  name = p.name,
  subject = p.subject,
  variables = p.variables,
  content_html = format(
    $tpl$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    .brv-msg-title { margin:0 0 14px; color:#0f172a; font-size:32px; line-height:1.2; font-weight:800; text-align:center; }
    .brv-msg-text { margin:0 0 16px; color:#374151; font-size:16px; line-height:1.7; text-align:center; }
    .brv-msg-box { margin:22px auto; padding:16px 18px; border:1px solid #fde7d8; background:#fff8f1; border-radius:14px; max-width:520px; }
    .brv-msg-meta { margin:0; color:#7c2d12; font-size:14px; line-height:1.7; }
    .brv-msg-btn-wrap { text-align:center; margin-top:24px; }
    .brv-msg-btn { display:inline-block; padding:12px 22px; border-radius:999px; background:#ea580c; color:#ffffff !important; text-decoration:none; font-weight:700; font-size:14px; }
  </style>
</head>
<body style="margin:0;padding:0;">
  <h1 class="brv-msg-title">%s</h1>
  <p class="brv-msg-text">%s</p>
  %s
  <div class="brv-msg-box" style="%s">
    %s
    %s
    %s
  </div>
</body>
</html>
$tpl$,
    p.title,
    p.body,
    CASE
      WHEN p.cta_label IS NULL OR p.cta_href IS NULL THEN ''
      ELSE format('<div class="brv-msg-btn-wrap"><a href="%s" class="brv-msg-btn">%s</a></div>', p.cta_href, p.cta_label)
    END,
    CASE WHEN p.meta_align = 'left' THEN 'text-align:left;' ELSE 'text-align:center;' END,
    CASE WHEN p.meta1 IS NULL THEN '' ELSE format('<p class="brv-msg-meta">%s</p>', p.meta1) END,
    CASE WHEN p.meta2 IS NULL THEN '' ELSE format('<p class="brv-msg-meta" style="margin-top:10px;">%s</p>', p.meta2) END,
    CASE WHEN p.meta3 IS NULL THEN '' ELSE format('<p class="brv-msg-meta" style="margin-top:10px;">%s</p>', p.meta3) END
  ),
  updated_at = timezone('utc'::text, now())
FROM payload p
WHERE et.slug = p.slug;

COMMIT;
