
-- Standardize email template raw content, names and subjects for admin/editor consistency.
-- Shared renderer still applies the global Bravita shell/footer on send.

BEGIN;

WITH standardized_templates AS (
  SELECT *
  FROM (
    VALUES
      (
        'confirm_signup',
        'Hesap Doğrulama',
        'E-posta Adresinizi Doğrulayın 🔐',
        '["CONFIRMATION_URL"]'::jsonb,
        $confirm_signup$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    .brv-msg-title { margin:0 0 14px; color:#0f172a; font-size:32px; line-height:1.2; font-weight:800; text-align:center; }
    .brv-msg-text { margin:0 0 16px; color:#374151; font-size:16px; line-height:1.7; text-align:center; }
    .brv-msg-box { margin:22px auto; padding:16px 18px; border:1px solid #fde7d8; background:#fff8f1; border-radius:14px; max-width:520px; }
    .brv-msg-meta { margin:0; color:#7c2d12; font-size:14px; line-height:1.7; text-align:center; }
    .brv-msg-btn-wrap { text-align:center; margin-top:24px; }
    .brv-msg-btn { display:inline-block; padding:12px 22px; border-radius:999px; background:#ea580c; color:#ffffff !important; text-decoration:none; font-weight:700; font-size:14px; }
  </style>
</head>
<body style="margin:0;padding:0;">
  <h1 class="brv-msg-title">Hesabınızı Doğrulayın</h1>
  <p class="brv-msg-text">Bravita hesabınızı güvenle kullanmak için e-posta doğrulama adımını tamamlayın.</p>
  <div class="brv-msg-btn-wrap">
    <a href="{{CONFIRMATION_URL}}" class="brv-msg-btn">E-postamı Doğrula</a>
  </div>
  <div class="brv-msg-box">
    <p class="brv-msg-meta">Doğrulama bağlantısı güvenlik nedeniyle sınırlı süreyle geçerlidir.</p>
  </div>
</body>
</html>
$confirm_signup$
      ),
      (
        'reset_password',
        'Şifre Sıfırlama',
        'Şifre Sıfırlama Talebiniz 🔐',
        '["CONFIRMATION_URL"]'::jsonb,
        $reset_password$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    .brv-msg-title { margin:0 0 14px; color:#0f172a; font-size:32px; line-height:1.2; font-weight:800; text-align:center; }
    .brv-msg-text { margin:0 0 16px; color:#374151; font-size:16px; line-height:1.7; text-align:center; }
    .brv-msg-box { margin:22px auto; padding:16px 18px; border:1px solid #fde7d8; background:#fff8f1; border-radius:14px; max-width:520px; }
    .brv-msg-meta { margin:0; color:#7c2d12; font-size:14px; line-height:1.7; text-align:center; }
    .brv-msg-btn-wrap { text-align:center; margin-top:24px; }
    .brv-msg-btn { display:inline-block; padding:12px 22px; border-radius:999px; background:#ea580c; color:#ffffff !important; text-decoration:none; font-weight:700; font-size:14px; }
  </style>
</head>
<body style="margin:0;padding:0;">
  <h1 class="brv-msg-title">Şifrenizi Yenileyin</h1>
  <p class="brv-msg-text">Hesabınız için bir şifre sıfırlama talebi aldık. Devam etmek için aşağıdaki butonu kullanın.</p>
  <div class="brv-msg-btn-wrap">
    <a href="{{CONFIRMATION_URL}}" class="brv-msg-btn">Şifremi Sıfırla</a>
  </div>
  <div class="brv-msg-box">
    <p class="brv-msg-meta">Bu işlem size ait değilse bu e-postayı güvenle görmezden gelebilirsiniz.</p>
  </div>
</body>
</html>
$reset_password$
      ),
      (
        'password_changed',
        'Şifre Değiştirildi',
        'Şifreniz Başarıyla Güncellendi 🔐',
        '["SITE_URL"]'::jsonb,
        $password_changed$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    .brv-msg-title { margin:0 0 14px; color:#0f172a; font-size:32px; line-height:1.2; font-weight:800; text-align:center; }
    .brv-msg-text { margin:0 0 16px; color:#374151; font-size:16px; line-height:1.7; text-align:center; }
    .brv-msg-box { margin:22px auto; padding:16px 18px; border:1px solid #fde7d8; background:#fff8f1; border-radius:14px; max-width:520px; }
    .brv-msg-meta { margin:0; color:#7c2d12; font-size:14px; line-height:1.7; text-align:center; }
    .brv-msg-btn-wrap { text-align:center; margin-top:24px; }
    .brv-msg-btn { display:inline-block; padding:12px 22px; border-radius:999px; background:#ea580c; color:#ffffff !important; text-decoration:none; font-weight:700; font-size:14px; }
  </style>
</head>
<body style="margin:0;padding:0;">
  <h1 class="brv-msg-title">Şifreniz Değiştirildi</h1>
  <p class="brv-msg-text">Hesabınızın şifresi başarıyla güncellendi. Bu işlem size ait değilse lütfen hemen destek ekibimizle iletişime geçin.</p>
  <div class="brv-msg-btn-wrap">
    <a href="{{SITE_URL}}" class="brv-msg-btn">Hesabıma Git</a>
  </div>
  <div class="brv-msg-box">
    <p class="brv-msg-meta">Güvenliğiniz için düzenli olarak güçlü ve benzersiz şifreler kullanın.</p>
  </div>
</body>
</html>
$password_changed$
      ),
      (
        'welcome_template',
        'Hoş Geldiniz',
        'Bravita''ya Hoş Geldiniz 🎉',
        '["NAME","SITE_URL","UNSUBSCRIBE_URL","BROWSER_LINK"]'::jsonb,
        $welcome_template$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    .brv-msg-title { margin:0 0 14px; color:#0f172a; font-size:32px; line-height:1.2; font-weight:800; text-align:center; }
    .brv-msg-text { margin:0 0 16px; color:#374151; font-size:16px; line-height:1.7; text-align:center; }
    .brv-msg-box { margin:22px auto; padding:16px 18px; border:1px solid #fde7d8; background:#fff8f1; border-radius:14px; max-width:520px; }
    .brv-msg-meta { margin:0; color:#7c2d12; font-size:14px; line-height:1.7; text-align:center; }
    .brv-msg-btn-wrap { text-align:center; margin-top:24px; }
    .brv-msg-btn { display:inline-block; padding:12px 22px; border-radius:999px; background:#ea580c; color:#ffffff !important; text-decoration:none; font-weight:700; font-size:14px; }
  </style>
</head>
<body style="margin:0;padding:0;">
  <h1 class="brv-msg-title">Hoş Geldiniz {{NAME}}!</h1>
  <p class="brv-msg-text">Bravita ailesine katıldığınız için mutluyuz. Yeni koleksiyonlar, kampanyalar ve özel içerikler sizi bekliyor.</p>
  <div class="brv-msg-btn-wrap">
    <a href="{{SITE_URL}}" class="brv-msg-btn">Alışverişe Başla</a>
  </div>
  <div class="brv-msg-box">
    <p class="brv-msg-meta">E-posta tercihlerinizi güncellemek için <a href="{{UNSUBSCRIBE_URL}}" style="color:#ea580c;text-decoration:none;font-weight:700;">tıklayın</a>.</p>
  </div>
</body>
</html>
$welcome_template$
      ),
      (
        'order_confirmation',
        'Sipariş Onayı',
        'Siparişiniz Alındı 🧾 #{{ORDER_ID}}',
        '["ORDER_ID","ORDER_DATE","TOTAL","BROWSER_LINK"]'::jsonb,
        $order_confirmation$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    .brv-msg-title { margin:0 0 14px; color:#0f172a; font-size:32px; line-height:1.2; font-weight:800; text-align:center; }
    .brv-msg-text { margin:0 0 16px; color:#374151; font-size:16px; line-height:1.7; text-align:center; }
    .brv-msg-box { margin:22px auto; padding:16px 18px; border:1px solid #fde7d8; background:#fff8f1; border-radius:14px; max-width:520px; }
    .brv-msg-meta { margin:0; color:#7c2d12; font-size:14px; line-height:1.7; text-align:center; }
    .brv-msg-btn-wrap { text-align:center; margin-top:24px; }
    .brv-msg-btn { display:inline-block; padding:12px 22px; border-radius:999px; background:#ea580c; color:#ffffff !important; text-decoration:none; font-weight:700; font-size:14px; }
  </style>
</head>
<body style="margin:0;padding:0;">
  <h1 class="brv-msg-title">Siparişiniz Alındı</h1>
  <p class="brv-msg-text">Siparişinizi başarıyla aldık. Hazırlık süreci başladı, en kısa sürede sizi bilgilendireceğiz.</p>
  <div class="brv-msg-box">
    <p class="brv-msg-meta"><strong>Sipariş No:</strong> #{{ORDER_ID}}</p>
    <p class="brv-msg-meta"><strong>Tarih:</strong> {{ORDER_DATE}}</p>
    <p class="brv-msg-meta"><strong>Toplam:</strong> ₺{{TOTAL}}</p>
  </div>
  <div class="brv-msg-btn-wrap">
    <a href="{{BROWSER_LINK}}" class="brv-msg-btn">Sipariş Detayını Aç</a>
  </div>
</body>
</html>
$order_confirmation$
      ),
      (
        'order_awaiting_payment',
        'Ödeme Bekleniyor',
        'Siparişiniz Alındı, Ödeme Bekleniyor 💳 #{{ORDER_ID}}',
        '["ORDER_ID","ORDER_DATE","TOTAL","BROWSER_LINK"]'::jsonb,
        $order_awaiting_payment$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    .brv-msg-title { margin:0 0 14px; color:#0f172a; font-size:32px; line-height:1.2; font-weight:800; text-align:center; }
    .brv-msg-text { margin:0 0 16px; color:#374151; font-size:16px; line-height:1.7; text-align:center; }
    .brv-msg-box { margin:22px auto; padding:16px 18px; border:1px solid #fde7d8; background:#fff8f1; border-radius:14px; max-width:520px; }
    .brv-msg-meta { margin:0; color:#7c2d12; font-size:14px; line-height:1.7; text-align:center; }
    .brv-msg-btn-wrap { text-align:center; margin-top:24px; }
    .brv-msg-btn { display:inline-block; padding:12px 22px; border-radius:999px; background:#ea580c; color:#ffffff !important; text-decoration:none; font-weight:700; font-size:14px; }
  </style>
</head>
<body style="margin:0;padding:0;">
  <h1 class="brv-msg-title">Ödeme Bekleniyor</h1>
  <p class="brv-msg-text">Siparişiniz oluşturuldu. Ödemeniz onaylandığında siparişiniz hazırlık aşamasına geçecektir.</p>
  <div class="brv-msg-box">
    <p class="brv-msg-meta"><strong>Sipariş No:</strong> #{{ORDER_ID}}</p>
    <p class="brv-msg-meta"><strong>Tarih:</strong> {{ORDER_DATE}}</p>
    <p class="brv-msg-meta"><strong>Toplam:</strong> ₺{{TOTAL}}</p>
  </div>
  <div class="brv-msg-btn-wrap">
    <a href="{{BROWSER_LINK}}" class="brv-msg-btn">Sipariş Durumunu Gör</a>
  </div>
</body>
</html>
$order_awaiting_payment$
      ),
      (
        'order_processing',
        'Sipariş İşleniyor',
        'Siparişiniz İşleniyor ⚙️ #{{ORDER_ID}}',
        '["ORDER_ID","BROWSER_LINK"]'::jsonb,
        $order_processing$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    .brv-msg-title { margin:0 0 14px; color:#0f172a; font-size:32px; line-height:1.2; font-weight:800; text-align:center; }
    .brv-msg-text { margin:0 0 16px; color:#374151; font-size:16px; line-height:1.7; text-align:center; }
    .brv-msg-box { margin:22px auto; padding:16px 18px; border:1px solid #fde7d8; background:#fff8f1; border-radius:14px; max-width:520px; }
    .brv-msg-meta { margin:0; color:#7c2d12; font-size:14px; line-height:1.7; text-align:center; }
    .brv-msg-btn-wrap { text-align:center; margin-top:24px; }
    .brv-msg-btn { display:inline-block; padding:12px 22px; border-radius:999px; background:#ea580c; color:#ffffff !important; text-decoration:none; font-weight:700; font-size:14px; }
  </style>
</head>
<body style="margin:0;padding:0;">
  <h1 class="brv-msg-title">Siparişiniz İşleniyor</h1>
  <p class="brv-msg-text">Siparişiniz ekiplerimiz tarafından kontrol ediliyor ve hazırlanma sırasına alınıyor.</p>
  <div class="brv-msg-box">
    <p class="brv-msg-meta"><strong>Sipariş No:</strong> #{{ORDER_ID}}</p>
  </div>
  <div class="brv-msg-btn-wrap">
    <a href="{{BROWSER_LINK}}" class="brv-msg-btn">Sipariş Takibini Aç</a>
  </div>
</body>
</html>
$order_processing$
      ),
      (
        'order_preparing',
        'Sipariş Hazırlanıyor',
        'Siparişiniz Hazırlanıyor 📦 #{{ORDER_ID}}',
        '["ORDER_ID","BROWSER_LINK"]'::jsonb,
        $order_preparing$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    .brv-msg-title { margin:0 0 14px; color:#0f172a; font-size:32px; line-height:1.2; font-weight:800; text-align:center; }
    .brv-msg-text { margin:0 0 16px; color:#374151; font-size:16px; line-height:1.7; text-align:center; }
    .brv-msg-box { margin:22px auto; padding:16px 18px; border:1px solid #fde7d8; background:#fff8f1; border-radius:14px; max-width:520px; }
    .brv-msg-meta { margin:0; color:#7c2d12; font-size:14px; line-height:1.7; text-align:center; }
    .brv-msg-btn-wrap { text-align:center; margin-top:24px; }
    .brv-msg-btn { display:inline-block; padding:12px 22px; border-radius:999px; background:#ea580c; color:#ffffff !important; text-decoration:none; font-weight:700; font-size:14px; }
  </style>
</head>
<body style="margin:0;padding:0;">
  <h1 class="brv-msg-title">Siparişiniz Hazırlanıyor</h1>
  <p class="brv-msg-text">Harika! Siparişiniz paketleme aşamasında. Kargoya verildiğinde sizi hemen bilgilendireceğiz.</p>
  <div class="brv-msg-box">
    <p class="brv-msg-meta"><strong>Sipariş No:</strong> #{{ORDER_ID}}</p>
  </div>
  <div class="brv-msg-btn-wrap">
    <a href="{{BROWSER_LINK}}" class="brv-msg-btn">Sipariş Takibini Aç</a>
  </div>
</body>
</html>
$order_preparing$
      ),
      (
        'order_shipped',
        'Kargoya Verildi',
        'Siparişiniz Kargoya Verildi 🚚 #{{ORDER_ID}}',
        '["ORDER_ID","SHIPPING_COMPANY","TRACKING_NUMBER","BROWSER_LINK"]'::jsonb,
        $order_shipped$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    .brv-msg-title { margin:0 0 14px; color:#0f172a; font-size:32px; line-height:1.2; font-weight:800; text-align:center; }
    .brv-msg-text { margin:0 0 16px; color:#374151; font-size:16px; line-height:1.7; text-align:center; }
    .brv-msg-box { margin:22px auto; padding:16px 18px; border:1px solid #fde7d8; background:#fff8f1; border-radius:14px; max-width:520px; }
    .brv-msg-meta { margin:0; color:#7c2d12; font-size:14px; line-height:1.7; text-align:center; }
    .brv-msg-btn-wrap { text-align:center; margin-top:24px; }
    .brv-msg-btn { display:inline-block; padding:12px 22px; border-radius:999px; background:#ea580c; color:#ffffff !important; text-decoration:none; font-weight:700; font-size:14px; }
  </style>
</head>
<body style="margin:0;padding:0;">
  <h1 class="brv-msg-title">Siparişiniz Yolda</h1>
  <p class="brv-msg-text">Siparişiniz kargoya teslim edildi. Aşağıdaki bilgilerle gönderinizi takip edebilirsiniz.</p>
  <div class="brv-msg-box">
    <p class="brv-msg-meta"><strong>Sipariş No:</strong> #{{ORDER_ID}}</p>
    <p class="brv-msg-meta"><strong>Kargo Firması:</strong> {{SHIPPING_COMPANY}}</p>
    <p class="brv-msg-meta"><strong>Takip No:</strong> {{TRACKING_NUMBER}}</p>
  </div>
  <div class="brv-msg-btn-wrap">
    <a href="{{BROWSER_LINK}}" class="brv-msg-btn">Gönderi Takibini Aç</a>
  </div>
</body>
</html>
$order_shipped$
      ),
      (
        'order_delivered',
        'Teslim Edildi',
        'Siparişiniz Teslim Edildi 🎁 #{{ORDER_ID}}',
        '["ORDER_ID","BROWSER_LINK"]'::jsonb,
        $order_delivered$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    .brv-msg-title { margin:0 0 14px; color:#0f172a; font-size:32px; line-height:1.2; font-weight:800; text-align:center; }
    .brv-msg-text { margin:0 0 16px; color:#374151; font-size:16px; line-height:1.7; text-align:center; }
    .brv-msg-box { margin:22px auto; padding:16px 18px; border:1px solid #fde7d8; background:#fff8f1; border-radius:14px; max-width:520px; }
    .brv-msg-meta { margin:0; color:#7c2d12; font-size:14px; line-height:1.7; text-align:center; }
    .brv-msg-btn-wrap { text-align:center; margin-top:24px; }
    .brv-msg-btn { display:inline-block; padding:12px 22px; border-radius:999px; background:#ea580c; color:#ffffff !important; text-decoration:none; font-weight:700; font-size:14px; }
  </style>
</head>
<body style="margin:0;padding:0;">
  <h1 class="brv-msg-title">Siparişiniz Teslim Edildi</h1>
  <p class="brv-msg-text">Siparişiniz başarıyla teslim edildi. Bravita'yı tercih ettiğiniz için teşekkür ederiz.</p>
  <div class="brv-msg-box">
    <p class="brv-msg-meta"><strong>Sipariş No:</strong> #{{ORDER_ID}}</p>
  </div>
  <div class="brv-msg-btn-wrap">
    <a href="{{BROWSER_LINK}}" class="brv-msg-btn">Sipariş Geçmişini Aç</a>
  </div>
</body>
</html>
$order_delivered$
      ),
      (
        'order_cancelled',
        'Sipariş İptal Edildi',
        'Siparişiniz İptal Edildi ❌ #{{ORDER_ID}}',
        '["ORDER_ID","CANCELLATION_REASON","BROWSER_LINK"]'::jsonb,
        $order_cancelled$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    .brv-msg-title { margin:0 0 14px; color:#0f172a; font-size:32px; line-height:1.2; font-weight:800; text-align:center; }
    .brv-msg-text { margin:0 0 16px; color:#374151; font-size:16px; line-height:1.7; text-align:center; }
    .brv-msg-box { margin:22px auto; padding:16px 18px; border:1px solid #fde7d8; background:#fff8f1; border-radius:14px; max-width:520px; }
    .brv-msg-meta { margin:0; color:#7c2d12; font-size:14px; line-height:1.7; text-align:center; }
    .brv-msg-btn-wrap { text-align:center; margin-top:24px; }
    .brv-msg-btn { display:inline-block; padding:12px 22px; border-radius:999px; background:#ea580c; color:#ffffff !important; text-decoration:none; font-weight:700; font-size:14px; }
  </style>
</head>
<body style="margin:0;padding:0;">
  <h1 class="brv-msg-title">Siparişiniz İptal Edildi</h1>
  <p class="brv-msg-text">Siparişiniz iptal edildi. Detayları aşağıda bulabilirsiniz.</p>
  <div class="brv-msg-box">
    <p class="brv-msg-meta"><strong>Sipariş No:</strong> #{{ORDER_ID}}</p>
    <p class="brv-msg-meta"><strong>İptal Nedeni:</strong> {{CANCELLATION_REASON}}</p>
  </div>
  <div class="brv-msg-btn-wrap">
    <a href="{{BROWSER_LINK}}" class="brv-msg-btn">Sipariş Detayını Aç</a>
  </div>
</body>
</html>
$order_cancelled$
      ),
      (
        'support_ticket',
        'Destek Talebi Alındı',
        'Destek Talebiniz Alındı 🎫 #{{TICKET_ID}}',
        '["NAME","SUBJECT","TICKET_ID","BROWSER_LINK"]'::jsonb,
        $support_ticket$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    .brv-msg-title { margin:0 0 14px; color:#0f172a; font-size:32px; line-height:1.2; font-weight:800; text-align:center; }
    .brv-msg-text { margin:0 0 16px; color:#374151; font-size:16px; line-height:1.7; text-align:center; }
    .brv-msg-box { margin:22px auto; padding:16px 18px; border:1px solid #fde7d8; background:#fff8f1; border-radius:14px; max-width:520px; }
    .brv-msg-meta { margin:0; color:#7c2d12; font-size:14px; line-height:1.7; text-align:center; }
    .brv-msg-btn-wrap { text-align:center; margin-top:24px; }
    .brv-msg-btn { display:inline-block; padding:12px 22px; border-radius:999px; background:#ea580c; color:#ffffff !important; text-decoration:none; font-weight:700; font-size:14px; }
  </style>
</head>
<body style="margin:0;padding:0;">
  <h1 class="brv-msg-title">Destek Talebiniz Alındı</h1>
  <p class="brv-msg-text">Merhaba {{NAME}}, talebiniz başarıyla kaydedildi. Ekibimiz en kısa sürede sizinle iletişime geçecektir.</p>
  <div class="brv-msg-box">
    <p class="brv-msg-meta"><strong>Talep No:</strong> #{{TICKET_ID}}</p>
    <p class="brv-msg-meta"><strong>Konu:</strong> {{SUBJECT}}</p>
  </div>
  <div class="brv-msg-btn-wrap">
    <a href="{{BROWSER_LINK}}" class="brv-msg-btn">Talep Detayını Aç</a>
  </div>
</body>
</html>
$support_ticket$
      ),
      (
        'support_ticket_replied',
        'Destek Yanıtı',
        'Destek Talebinize Yanıt Geldi 💬 #{{TICKET_ID}}',
        '["TICKET_ID","USER_MESSAGE","ADMIN_REPLY","BROWSER_LINK"]'::jsonb,
        $support_ticket_replied$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    .brv-msg-title { margin:0 0 14px; color:#0f172a; font-size:32px; line-height:1.2; font-weight:800; text-align:center; }
    .brv-msg-text { margin:0 0 16px; color:#374151; font-size:16px; line-height:1.7; text-align:center; }
    .brv-msg-box { margin:22px auto; padding:16px 18px; border:1px solid #fde7d8; background:#fff8f1; border-radius:14px; max-width:520px; }
    .brv-msg-meta { margin:0; color:#7c2d12; font-size:14px; line-height:1.7; text-align:left; }
    .brv-msg-btn-wrap { text-align:center; margin-top:24px; }
    .brv-msg-btn { display:inline-block; padding:12px 22px; border-radius:999px; background:#ea580c; color:#ffffff !important; text-decoration:none; font-weight:700; font-size:14px; }
  </style>
</head>
<body style="margin:0;padding:0;">
  <h1 class="brv-msg-title">Destek Talebiniz Yanıtlandı</h1>
  <p class="brv-msg-text">Talebiniz için ekibimiz bir yanıt paylaştı.</p>
  <div class="brv-msg-box">
    <p class="brv-msg-meta"><strong>Talep No:</strong> #{{TICKET_ID}}</p>
    <p class="brv-msg-meta" style="margin-top:10px;"><strong>Mesajınız:</strong> {{USER_MESSAGE}}</p>
    <p class="brv-msg-meta" style="margin-top:10px;"><strong>Yanıtımız:</strong> {{ADMIN_REPLY}}</p>
  </div>
  <div class="brv-msg-btn-wrap">
    <a href="{{BROWSER_LINK}}" class="brv-msg-btn">Talep Detayını Aç</a>
  </div>
</body>
</html>
$support_ticket_replied$
      ),
      (
        'support_ticket_closed',
        'Destek Talebi Kapatıldı',
        'Destek Talebiniz Çözümlendi ✅ #{{TICKET_ID}}',
        '["TICKET_ID","ADMIN_REPLY","BROWSER_LINK"]'::jsonb,
        $support_ticket_closed$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    .brv-msg-title { margin:0 0 14px; color:#0f172a; font-size:32px; line-height:1.2; font-weight:800; text-align:center; }
    .brv-msg-text { margin:0 0 16px; color:#374151; font-size:16px; line-height:1.7; text-align:center; }
    .brv-msg-box { margin:22px auto; padding:16px 18px; border:1px solid #fde7d8; background:#fff8f1; border-radius:14px; max-width:520px; }
    .brv-msg-meta { margin:0; color:#7c2d12; font-size:14px; line-height:1.7; text-align:left; }
    .brv-msg-btn-wrap { text-align:center; margin-top:24px; }
    .brv-msg-btn { display:inline-block; padding:12px 22px; border-radius:999px; background:#ea580c; color:#ffffff !important; text-decoration:none; font-weight:700; font-size:14px; }
  </style>
</head>
<body style="margin:0;padding:0;">
  <h1 class="brv-msg-title">Destek Talebiniz Çözümlendi</h1>
  <p class="brv-msg-text">Talebiniz çözümlendi ve kapatıldı. Kısa bir özet aşağıdadır.</p>
  <div class="brv-msg-box">
    <p class="brv-msg-meta"><strong>Talep No:</strong> #{{TICKET_ID}}</p>
    <p class="brv-msg-meta" style="margin-top:10px;"><strong>Son Yanıt:</strong> {{ADMIN_REPLY}}</p>
  </div>
  <div class="brv-msg-btn-wrap">
    <a href="{{BROWSER_LINK}}" class="brv-msg-btn">Talep Geçmişini Aç</a>
  </div>
</body>
</html>
$support_ticket_closed$
      )
  ) AS t(slug, name, subject, variables, content_html)
)
UPDATE public.email_templates et
SET
  name = st.name,
  subject = st.subject,
  variables = st.variables,
  content_html = st.content_html,
  updated_at = timezone('utc'::text, now())
FROM standardized_templates st
WHERE et.slug = st.slug;
;
