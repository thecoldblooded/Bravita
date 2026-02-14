-- Restore DB email templates to high-quality baseline designs.
-- Source of visual style: email_templates/* (kept untouched).
-- Includes required common parts in raw HTML:
-- - browser-view line
-- - support contact
-- - copyright
-- - logo
-- - emoji header icon
-- - confirmation fallback line where relevant

BEGIN;

WITH payload (
  slug,
  name,
  subject,
  variables,
  content_html
) AS (
  VALUES
    (
      'confirm_signup',
      'Hesap Doğrulama',
      'E-posta Adresinizi Doğrulayın 🔐',
      '["CONFIRMATION_URL","BROWSER_LINK","SITE_URL"]'::jsonb,
      $tpl_confirm_signup$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>E-postanızı Doğrulayın</title>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: light; }
    body { background-color:#FFFBF7 !important; color:#1F2937 !important; font-family:'Baloo 2','Nunito',sans-serif; margin:0; padding:0; -webkit-font-smoothing:antialiased; }
    @media only screen and (max-width:600px) {
      .container { width:100% !important; border-radius:0 !important; }
      .content { padding:30px 20px !important; }
      .button { width:100% !important; display:block !important; text-align:center !important; }
    }
  </style>
</head>
<body>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FFFBF7;">
    <tr>
      <td align="center" style="padding:20px 0;">
        <p style="margin:0;color:#9CA3AF;font-size:12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color:#F97316;text-decoration:none;">Tarayıcıda açın</a></p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 0 40px;">
        <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.05);overflow:hidden;">
          <tr><td height="6" style="background-color:#F97316;"></td></tr>
          <tr>
            <td align="center" style="padding:40px 0 20px;">
              <img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" alt="Bravita" width="180" style="display:block;border:0;max-width:100%;height:auto;" />
            </td>
          </tr>
          <tr><td align="center" style="padding:0 0 20px;"><div style="font-size:64px;line-height:1;">✉️</div></td></tr>
          <tr>
            <td class="content" align="center" style="padding:0 60px 40px;">
              <h1 style="margin:0 0 20px;color:#1F2937;font-size:26px;font-weight:700;letter-spacing:-0.5px;line-height:1.1;">E-postanızı Doğrulayın</h1>
              <p style="margin:0 0 30px;color:#4B5563;font-size:16px;line-height:1.6;">Bravita dünyasına hoş geldiniz! 🎉<br>Hesabınızı güvenceye almak ve alışverişe başlamak için lütfen aşağıdaki butona tıklayın.</p>
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="border-radius:50px;background-color:#F97316;">
                    <a href="{{CONFIRMATION_URL}}" class="button" style="display:inline-block;padding:16px 48px;font-family:'Baloo 2','Nunito',sans-serif;font-size:16px;color:#ffffff;text-decoration:none;font-weight:600;border-radius:50px;background-color:#F97316;border:1px solid #F97316;">Hesabımı Doğrula</a>
                  </td>
                </tr>
              </table>
              <div style="margin-top:40px;border-top:1px solid #E5E7EB;padding-top:20px;">
                <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.5;">Link çalışmıyor mu? Bunu deneyin:<br><a href="{{CONFIRMATION_URL}}" style="color:#F97316;text-decoration:none;word-break:break-all;">{{CONFIRMATION_URL}}</a></p>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color:#FFF8F0;padding:20px;">
              <p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;">Sorularınız mı var? <a href="mailto:support@bravita.com.tr" style="color:#F97316;text-decoration:none;">support@bravita.com.tr</a></p>
              <p style="margin:0;color:#9CA3AF;font-size:12px;">© 2026 Bravita. Tüm hakları saklıdır.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
$tpl_confirm_signup$
    ),
    (
      'reset_password',
      'Şifre Sıfırlama',
      'Şifre Sıfırlama Talebiniz 🔐',
      '["CONFIRMATION_URL","BROWSER_LINK","SITE_URL"]'::jsonb,
      $tpl_reset_password$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Şifrenizi Sıfırlayın</title>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: light; }
    body { background-color:#FFFBF7 !important; color:#1F2937 !important; font-family:'Baloo 2','Nunito',sans-serif; margin:0; padding:0; -webkit-font-smoothing:antialiased; }
    @media only screen and (max-width:600px) {
      .container { width:100% !important; border-radius:0 !important; }
      .content { padding:30px 20px !important; }
      .button { width:100% !important; display:block !important; text-align:center !important; }
    }
  </style>
</head>
<body>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FFFBF7;">
    <tr>
      <td align="center" style="padding:20px 0;">
        <p style="margin:0;color:#9CA3AF;font-size:12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color:#F97316;text-decoration:none;">Tarayıcıda açın</a></p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 0 40px;">
        <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.05);overflow:hidden;">
          <tr><td height="6" style="background-color:#F97316;"></td></tr>
          <tr>
            <td align="center" style="padding:40px 0 20px;">
              <img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" alt="Bravita" width="180" style="display:block;border:0;max-width:100%;height:auto;" />
            </td>
          </tr>
          <tr><td align="center" style="padding:0 0 20px;"><div style="font-size:64px;line-height:1;">🔒</div></td></tr>
          <tr>
            <td class="content" align="center" style="padding:0 60px 40px;">
              <h1 style="margin:0 0 20px;color:#1F2937;font-size:26px;font-weight:700;">Şifre Yenileme Talebi</h1>
              <p style="margin:0 0 30px;color:#4B5563;font-size:16px;line-height:1.6;">Şifrenizi unuttuğunuzu duyduk. Endişelenmeyin, aşağıdaki butona tıklayarak hemen yeni bir şifre belirleyebilirsiniz.</p>
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="border-radius:50px;background-color:#F97316;">
                    <a href="{{CONFIRMATION_URL}}" class="button" style="display:inline-block;padding:16px 48px;font-family:'Baloo 2','Nunito',sans-serif;font-size:16px;color:#ffffff;text-decoration:none;font-weight:600;border-radius:50px;background-color:#F97316;border:1px solid #F97316;">Şifremi Sıfırla</a>
                  </td>
                </tr>
              </table>
              <div style="margin-top:40px;border-top:1px solid #E5E7EB;padding-top:20px;">
                <p style="margin:0 0 10px;color:#EF4444;font-size:13px;font-weight:600;background:#FEF2F2;display:inline-block;padding:4px 10px;border-radius:4px;">⚠️ Güvenlik Notu</p>
                <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.5;">Bu talebi siz yapmadıysanız, hesabınız güvendedir. Bu mesajı silebilirsiniz.<br><br>Link çalışmıyor mu?<br><a href="{{CONFIRMATION_URL}}" style="color:#F97316;text-decoration:none;word-break:break-all;">{{CONFIRMATION_URL}}</a></p>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color:#FFF8F0;padding:20px;">
              <p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;">Sorularınız mı var? <a href="mailto:support@bravita.com.tr" style="color:#F97316;text-decoration:none;">support@bravita.com.tr</a></p>
              <p style="margin:0;color:#9CA3AF;font-size:12px;">© 2026 Bravita. Tüm hakları saklıdır.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
$tpl_reset_password$
    ),
    (
      'password_changed',
      'Şifre Değiştirildi',
      'Şifreniz Başarıyla Güncellendi 🔐',
      '["SITE_URL","BROWSER_LINK"]'::jsonb,
      $tpl_password_changed$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Şifreniz Değiştirildi</title>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: light; }
    body { background-color:#FFFBF7 !important; color:#1F2937 !important; font-family:'Baloo 2','Nunito',sans-serif; margin:0; padding:0; -webkit-font-smoothing:antialiased; }
    @media only screen and (max-width:600px) {
      .container { width:100% !important; border-radius:0 !important; }
      .content { padding:30px 20px !important; }
      .button { width:100% !important; display:block !important; text-align:center !important; }
    }
  </style>
</head>
<body>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FFFBF7;">
    <tr>
      <td align="center" style="padding:20px 0;">
        <p style="margin:0;color:#9CA3AF;font-size:12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color:#F97316;text-decoration:none;">Tarayıcıda açın</a></p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 0 40px;">
        <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.05);overflow:hidden;">
          <tr><td height="6" style="background-color:#22C55E;"></td></tr>
          <tr>
            <td align="center" style="padding:40px 0 20px;">
              <img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" alt="Bravita" width="180" style="display:block;border:0;max-width:100%;height:auto;" />
            </td>
          </tr>
          <tr><td align="center" style="padding:0 0 20px;"><div style="font-size:64px;line-height:1;">✅</div></td></tr>
          <tr>
            <td class="content" align="center" style="padding:0 60px 40px;">
              <h1 style="margin:0 0 20px;color:#1F2937;font-size:26px;font-weight:700;">Şifreniz Başarıyla Değiştirildi</h1>
              <p style="margin:0 0 30px;color:#4B5563;font-size:16px;line-height:1.6;">Hesabınızın şifresi kısa süre önce güncellendi. Artık yeni şifrenizle giriş yapabilirsiniz.</p>
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="border-radius:50px;background-color:#22C55E;">
                    <a href="{{SITE_URL}}" class="button" style="display:inline-block;padding:16px 48px;font-family:'Baloo 2','Nunito',sans-serif;font-size:16px;color:#ffffff;text-decoration:none;font-weight:600;border-radius:50px;background-color:#22C55E;border:1px solid #22C55E;">Giriş Yap</a>
                  </td>
                </tr>
              </table>
              <div style="margin-top:40px;border-top:1px solid #E5E7EB;padding-top:20px;">
                <p style="margin:0 0 10px;color:#EF4444;font-size:13px;font-weight:600;background:#FEF2F2;display:inline-block;padding:4px 10px;border-radius:4px;">⚠️ Önemli Güvenlik Uyarısı</p>
                <p style="margin:0;color:#9CA3AF;font-size:12px;line-height:1.5;"><strong>Eğer bu işlemi siz yapmadıysanız, hesabınız tehlikede olabilir.</strong><br>Lütfen derhal <a href="mailto:support@bravita.com.tr" style="color:#F97316;text-decoration:none;">destek ekibimizle</a> iletişime geçin.</p>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color:#FFF8F0;padding:20px;">
              <p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;">Sorularınız mı var? <a href="mailto:support@bravita.com.tr" style="color:#F97316;text-decoration:none;">support@bravita.com.tr</a></p>
              <p style="margin:0;color:#9CA3AF;font-size:12px;">© 2026 Bravita. Tüm hakları saklıdır.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
$tpl_password_changed$
    ),
    (
      'welcome_template',
      'Hoş Geldiniz',
      'Bravita''ya Hoş Geldiniz 🎉',
      '["NAME","SITE_URL","UNSUBSCRIBE_URL","BROWSER_LINK"]'::jsonb,
      $tpl_welcome$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Bravita''ya Hoş Geldiniz!</title>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: light; }
    body { background-color:#FFFBF7 !important; color:#1F2937 !important; font-family:'Baloo 2','Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; margin:0; padding:0; -webkit-font-smoothing:antialiased; }
    @media only screen and (max-width:600px) {
      .container { width:100% !important; border-radius:0 !important; }
      .content { padding:30px 20px !important; }
      .button { width:100% !important; display:block !important; text-align:center !important; }
    }
  </style>
</head>
<body>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FFFBF7;">
    <tr>
      <td align="center" style="padding:20px 0;">
        <p style="margin:0;color:#9CA3AF;font-size:12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color:#F97316;text-decoration:none;">Tarayıcıda açın</a></p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0 0 40px;">
        <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.05);overflow:hidden;">
          <tr><td height="6" style="background-color:#F97316;"></td></tr>
          <tr>
            <td align="center" style="padding:40px 0 20px;">
              <img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" alt="Bravita" width="180" style="display:block;border:0;max-width:100%;height:auto;" />
            </td>
          </tr>
          <tr><td align="center" style="padding:0 0 20px;"><div style="font-size:64px;line-height:1;">🦙</div></td></tr>
          <tr>
            <td class="content" align="center" style="padding:0 60px 40px;">
              <h1 style="margin:0 0 20px;color:#1F2937;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Aramıza Hoş Geldiniz, {{NAME}}!</h1>
              <p style="margin:0 0 30px;color:#4B5563;font-size:16px;line-height:1.6;">Bravita ailesine katıldığınız için çok mutluyuz. Artık geleceğe odaklı büyüme ve sürdürülebilir başarı yolculuğumuzun bir parçasısınız.</p>
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="border-radius:50px;background-color:#F97316;">
                    <a href="{{SITE_URL}}" class="button" style="display:inline-block;padding:16px 48px;font-family:'Baloo 2','Nunito',sans-serif;font-size:16px;color:#ffffff;text-decoration:none;font-weight:600;border-radius:50px;background-color:#F97316;border:1px solid #F97316;">Bravita''yı Keşfet</a>
                  </td>
                </tr>
              </table>
              <div style="margin-top:40px;border-top:1px solid #E5E7EB;padding-top:30px;text-align:left;">
                <p style="margin:0 0 10px;color:#1F2937;font-weight:600;">Bravita ile neler yapabilirsiniz?</p>
                <ul style="margin:0;padding:0 0 0 20px;color:#4B5563;font-size:14px;line-height:1.8;">
                  <li>En yeni ürünlerden ve indirimlerden ilk siz haberdar olun.</li>
                  <li>Hesabınızı yöneterek siparişlerinizi takip edin.</li>
                  <li>Size özel kampanyalardan faydalanmaya başlayın.</li>
                </ul>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color:#FFF8F0;padding:20px;">
              <p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;">Sorularınız mı var? <a href="mailto:support@bravita.com.tr" style="color:#F97316;text-decoration:none;">support@bravita.com.tr</a></p>
              <p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;">© 2026 Bravita. Tüm hakları saklıdır.</p>
              <p style="margin:0;font-size:12px;"><a href="{{UNSUBSCRIBE_URL}}" style="color:#F97316;text-decoration:none;">Abonelikten Ayrıl</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
$tpl_welcome$
    ),
    (
      'order_confirmation',
      'Sipariş Onayı',
      'Siparişiniz Alındı 🧾 #{{ORDER_ID}}',
      '["ORDER_ID","ORDER_DATE","ITEMS_LIST","SUBTOTAL","DISCOUNT","TAX","TOTAL","SHIPPING_ADDRESS","PAYMENT_METHOD","BANK_DETAILS","BROWSER_LINK","SITE_URL"]'::jsonb,
      $tpl_order_confirmation$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Siparişiniz Onaylandı</title>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: light; }
    body { background-color:#FFFBF7 !important; color:#1F2937 !important; font-family:'Baloo 2','Nunito',sans-serif; margin:0; padding:0; }
    .item-row td { border-bottom:1px solid #F3F4F6; padding:16px 0; }
    .item-row:last-child td { border-bottom:none; }
    @media only screen and (max-width:600px) {
      .container { width:100% !important; border-radius:0 !important; }
      .content { padding:30px 20px !important; }
      .responsive-table { width:100% !important; }
    }
  </style>
</head>
<body>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FFFBF7;">
    <tr><td align="center" style="padding:20px 0;"><p style="margin:0;color:#9CA3AF;font-size:12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color:#F97316;text-decoration:none;">Tarayıcıda açın</a></p></td></tr>
    <tr>
      <td align="center" style="padding:0 0 40px;">
        <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.05);overflow:hidden;">
          <tr><td height="6" style="background-color:#22C55E;"></td></tr>
          <tr><td align="center" style="padding:40px 0 20px;"><img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" alt="Bravita" width="180" style="display:block;border:0;max-width:100%;height:auto;" /></td></tr>
          <tr><td align="center" style="padding:0 0 20px;"><div style="font-size:64px;line-height:1;">🎉</div></td></tr>
          <tr>
            <td class="content" align="center" style="padding:0 40px 40px;">
              <h1 style="margin:0 0 10px;color:#1F2937;font-size:26px;font-weight:700;">Siparişiniz Onaylandı!</h1>
              <p style="margin:0 0 30px;color:#4B5563;font-size:16px;line-height:1.6;">Siparişiniz başarıyla alındı ve hazırlanmaya başlandı.</p>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#F9FAFB;border-radius:12px;margin-bottom:30px;padding:20px;">
                <tr>
                  <td align="left" style="padding-bottom:8px;"><span style="color:#6B7280;font-size:13px;font-weight:600;text-transform:uppercase;">Sipariş No</span><br><span style="color:#111827;font-size:16px;font-weight:700;">#{{ORDER_ID}}</span></td>
                  <td align="right" style="padding-bottom:8px;"><span style="color:#6B7280;font-size:13px;font-weight:600;text-transform:uppercase;">Tarih</span><br><span style="color:#111827;font-size:16px;font-weight:700;">{{ORDER_DATE}}</span></td>
                </tr>
              </table>
              <div style="text-align:left;margin-bottom:30px;">
                <h3 style="margin:0 0 15px;color:#F97316;font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Sipariş Detayları</h3>
                <table width="100%" border="0" cellspacing="0" cellpadding="0">{{ITEMS_LIST}}</table>
              </div>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:30px;">
                <tr><td style="padding:8px 0;color:#6B7280;font-size:14px;">Ara Toplam</td><td align="right" style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">₺{{SUBTOTAL}}</td></tr>
                <tr><td style="padding:8px 0;color:#22C55E;font-size:14px;">İndirim</td><td align="right" style="padding:8px 0;color:#22C55E;font-size:14px;font-weight:600;">-₺{{DISCOUNT}}</td></tr>
                <tr><td style="padding:8px 0;color:#6B7280;font-size:14px;">KDV (%20)</td><td align="right" style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">₺{{TAX}}</td></tr>
                <tr><td style="border-top:1px solid #E5E7EB;padding:16px 0 0;color:#111827;font-size:18px;font-weight:800;">Toplam</td><td align="right" style="border-top:1px solid #E5E7EB;padding:16px 0 0;color:#F97316;font-size:24px;font-weight:800;">₺{{TOTAL}}</td></tr>
              </table>
              <div style="text-align:left;background-color:#FFF7ED;padding:20px;border-radius:12px;border:1px solid #FFEDD5;">
                <h3 style="margin:0 0 10px;color:#EA580C;font-size:14px;font-weight:700;text-transform:uppercase;">Teslimat Adresi</h3>
                <p style="margin:0;color:#431407;font-size:14px;line-height:1.6;">{{SHIPPING_ADDRESS}}</p>
              </div>
              {{BANK_DETAILS}}
              <div style="margin-top:20px;text-align:center;"><p style="color:#6B7280;font-size:13px;">Ödeme Yöntemi: <strong>{{PAYMENT_METHOD}}</strong></p></div>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color:#FFF8F0;padding:20px;">
              <p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;">Sorularınız mı var? <a href="mailto:support@bravita.com.tr" style="color:#F97316;text-decoration:none;">support@bravita.com.tr</a></p>
              <p style="margin:0;color:#9CA3AF;font-size:12px;">© 2026 Bravita. Tüm hakları saklıdır.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
$tpl_order_confirmation$
    ),
    (
      'order_awaiting_payment',
      'Ödeme Bekleniyor',
      'Siparişiniz Alındı, Ödeme Bekleniyor 💳 #{{ORDER_ID}}',
      '["ORDER_ID","ORDER_DATE","ITEMS_LIST","SUBTOTAL","DISCOUNT","TAX","TOTAL","SHIPPING_ADDRESS","PAYMENT_METHOD","BANK_DETAILS","BROWSER_LINK","SITE_URL"]'::jsonb,
      $tpl_order_awaiting_payment$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Ödeme Bekleniyor</title>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: light; }
    body { background-color:#FFFBF7 !important; color:#1F2937 !important; font-family:'Baloo 2','Nunito',sans-serif; margin:0; padding:0; }
    @media only screen and (max-width:600px) {
      .container { width:100% !important; border-radius:0 !important; }
      .content { padding:30px 20px !important; }
      .button { width:100% !important; display:block !important; text-align:center !important; }
    }
  </style>
</head>
<body>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FFFBF7;">
    <tr><td align="center" style="padding:20px 0;"><p style="margin:0;color:#9CA3AF;font-size:12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color:#F97316;text-decoration:none;">Tarayıcıda açın</a></p></td></tr>
    <tr>
      <td align="center" style="padding:0 0 40px;">
        <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.05);overflow:hidden;">
          <tr><td height="6" style="background-color:#3B82F6;"></td></tr>
          <tr><td align="center" style="padding:40px 0 20px;"><img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" alt="Bravita" width="180" style="display:block;border:0;max-width:100%;height:auto;" /></td></tr>
          <tr><td align="center" style="padding:0 0 20px;"><div style="font-size:64px;line-height:1;">💳</div></td></tr>
          <tr>
            <td class="content" align="center" style="padding:0 40px 40px;">
              <h1 style="margin:0 0 10px;color:#1F2937;font-size:26px;font-weight:700;">Siparişiniz Alındı, Ödeme Bekleniyor</h1>
              <p style="margin:0 0 30px;color:#4B5563;font-size:16px;line-height:1.6;">Siparişiniz oluşturuldu. Ödemeniz onaylandığında siparişiniz hazırlık aşamasına geçecektir.</p>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#F9FAFB;border-radius:12px;margin-bottom:30px;padding:20px;">
                <tr>
                  <td align="left" style="padding-bottom:8px;"><span style="color:#6B7280;font-size:13px;font-weight:600;text-transform:uppercase;">Sipariş No</span><br><span style="color:#111827;font-size:16px;font-weight:700;">#{{ORDER_ID}}</span></td>
                  <td align="right" style="padding-bottom:8px;"><span style="color:#6B7280;font-size:13px;font-weight:600;text-transform:uppercase;">Tarih</span><br><span style="color:#111827;font-size:16px;font-weight:700;">{{ORDER_DATE}}</span></td>
                </tr>
              </table>
              <div style="text-align:left;margin-bottom:30px;">
                <h3 style="margin:0 0 15px;color:#F97316;font-size:16px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Sipariş Detayları</h3>
                <table width="100%" border="0" cellspacing="0" cellpadding="0">{{ITEMS_LIST}}</table>
              </div>
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">
                <tr><td style="padding:8px 0;color:#6B7280;font-size:14px;">Ara Toplam</td><td align="right" style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">₺{{SUBTOTAL}}</td></tr>
                <tr><td style="padding:8px 0;color:#22C55E;font-size:14px;">İndirim</td><td align="right" style="padding:8px 0;color:#22C55E;font-size:14px;font-weight:600;">-₺{{DISCOUNT}}</td></tr>
                <tr><td style="padding:8px 0;color:#6B7280;font-size:14px;">KDV (%20)</td><td align="right" style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">₺{{TAX}}</td></tr>
                <tr><td style="border-top:1px solid #E5E7EB;padding:16px 0 0;color:#111827;font-size:18px;font-weight:800;">Toplam</td><td align="right" style="border-top:1px solid #E5E7EB;padding:16px 0 0;color:#F97316;font-size:24px;font-weight:800;">₺{{TOTAL}}</td></tr>
              </table>
              <div style="text-align:left;background-color:#EFF6FF;border:1px solid #DBEAFE;padding:20px;border-radius:12px;margin-bottom:20px;">
                <p style="margin:0;color:#1E3A8A;font-size:14px;line-height:1.6;">Havale/EFT ödeme seçtiniz. Ödemeniz doğrulandığında siparişiniz otomatik olarak hazırlanacaktır.</p>
              </div>
              {{BANK_DETAILS}}
              <div style="margin-top:20px;text-align:center;"><p style="color:#6B7280;font-size:13px;">Ödeme Yöntemi: <strong>{{PAYMENT_METHOD}}</strong></p></div>
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color:#FFF8F0;padding:20px;">
              <p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;">Sorularınız mı var? <a href="mailto:support@bravita.com.tr" style="color:#F97316;text-decoration:none;">support@bravita.com.tr</a></p>
              <p style="margin:0;color:#9CA3AF;font-size:12px;">© 2026 Bravita. Tüm hakları saklıdır.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
$tpl_order_awaiting_payment$
    ),
    (
      'order_processing',
      'Sipariş İşleniyor',
      'Siparişiniz İşleniyor ⚙️ #{{ORDER_ID}}',
      '["ORDER_ID","BROWSER_LINK","SITE_URL"]'::jsonb,
      $tpl_order_processing$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Siparişiniz İşleniyor</title>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: light; }
    body { background-color:#FFFBF7 !important; color:#1F2937 !important; font-family:'Baloo 2','Nunito',sans-serif; margin:0; padding:0; }
    @media only screen and (max-width:600px) { .container { width:100% !important; border-radius:0 !important; } .content { padding:30px 20px !important; } }
  </style>
</head>
<body>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FFFBF7;">
    <tr><td align="center" style="padding:20px 0;"><p style="margin:0;color:#9CA3AF;font-size:12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color:#F97316;text-decoration:none;">Tarayıcıda açın</a></p></td></tr>
    <tr>
      <td align="center" style="padding:0 0 40px;">
        <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.05);overflow:hidden;">
          <tr><td height="6" style="background-color:#3B82F6;"></td></tr>
          <tr><td align="center" style="padding:40px 0 20px;"><img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" alt="Bravita" width="180" style="display:block;border:0;max-width:100%;height:auto;" /></td></tr>
          <tr><td align="center" style="padding:0 0 20px;"><div style="font-size:64px;line-height:1;">⚙️</div></td></tr>
          <tr>
            <td class="content" align="center" style="padding:0 40px 40px;">
              <h1 style="margin:0 0 14px;color:#1F2937;font-size:26px;font-weight:700;">Siparişiniz İşleniyor</h1>
              <p style="margin:0 0 24px;color:#4B5563;font-size:16px;line-height:1.6;">#{{ORDER_ID}} numaralı siparişiniz ekiplerimiz tarafından kontrol ediliyor ve hazırlanma sırasına alınıyor.</p>
              <table border="0" cellspacing="0" cellpadding="0"><tr><td align="center" style="border-radius:50px;background-color:#3B82F6;"><a href="{{BROWSER_LINK}}" style="display:inline-block;padding:14px 36px;font-family:'Baloo 2','Nunito',sans-serif;font-size:15px;color:#ffffff;text-decoration:none;font-weight:600;border-radius:50px;background-color:#3B82F6;border:1px solid #3B82F6;">Sipariş Takibini Aç</a></td></tr></table>
            </td>
          </tr>
          <tr><td align="center" style="background-color:#FFF8F0;padding:20px;"><p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;">Sorularınız mı var? <a href="mailto:support@bravita.com.tr" style="color:#F97316;text-decoration:none;">support@bravita.com.tr</a></p><p style="margin:0;color:#9CA3AF;font-size:12px;">© 2026 Bravita. Tüm hakları saklıdır.</p></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
$tpl_order_processing$
    ),
    (
      'order_preparing',
      'Sipariş Hazırlanıyor',
      'Siparişiniz Hazırlanıyor 📦 #{{ORDER_ID}}',
      '["ORDER_ID","BROWSER_LINK","SITE_URL"]'::jsonb,
      $tpl_order_preparing$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Siparişiniz Hazırlanıyor</title>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: light; }
    body { background-color:#FFFBF7 !important; color:#1F2937 !important; font-family:'Baloo 2','Nunito',sans-serif; margin:0; padding:0; }
    @media only screen and (max-width:600px) { .container { width:100% !important; border-radius:0 !important; } .content { padding:30px 20px !important; } }
  </style>
</head>
<body>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FFFBF7;">
    <tr><td align="center" style="padding:20px 0;"><p style="margin:0;color:#9CA3AF;font-size:12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color:#F97316;text-decoration:none;">Tarayıcıda açın</a></p></td></tr>
    <tr>
      <td align="center" style="padding:0 0 40px;">
        <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.05);overflow:hidden;">
          <tr><td height="6" style="background-color:#6366F1;"></td></tr>
          <tr><td align="center" style="padding:40px 0 20px;"><img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" alt="Bravita" width="180" style="display:block;border:0;max-width:100%;height:auto;" /></td></tr>
          <tr><td align="center" style="padding:0 0 20px;"><div style="font-size:64px;line-height:1;">📦</div></td></tr>
          <tr>
            <td class="content" align="center" style="padding:0 40px 40px;">
              <h1 style="margin:0 0 14px;color:#1F2937;font-size:26px;font-weight:700;">Siparişiniz Hazırlanıyor</h1>
              <p style="margin:0 0 24px;color:#4B5563;font-size:16px;line-height:1.6;">Harika! #{{ORDER_ID}} numaralı siparişiniz paketleme aşamasında. Kargoya verildiğinde sizi hemen bilgilendireceğiz.</p>
              <table border="0" cellspacing="0" cellpadding="0"><tr><td align="center" style="border-radius:50px;background-color:#6366F1;"><a href="{{BROWSER_LINK}}" style="display:inline-block;padding:14px 36px;font-family:'Baloo 2','Nunito',sans-serif;font-size:15px;color:#ffffff;text-decoration:none;font-weight:600;border-radius:50px;background-color:#6366F1;border:1px solid #6366F1;">Sipariş Takibini Aç</a></td></tr></table>
            </td>
          </tr>
          <tr><td align="center" style="background-color:#FFF8F0;padding:20px;"><p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;">Sorularınız mı var? <a href="mailto:support@bravita.com.tr" style="color:#F97316;text-decoration:none;">support@bravita.com.tr</a></p><p style="margin:0;color:#9CA3AF;font-size:12px;">© 2026 Bravita. Tüm hakları saklıdır.</p></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
$tpl_order_preparing$
    ),
    (
      'order_shipped',
      'Kargoya Verildi',
      'Siparişiniz Kargoya Verildi 🚚 #{{ORDER_ID}}',
      '["ORDER_ID","SHIPPING_COMPANY","TRACKING_NUMBER","BROWSER_LINK","SITE_URL"]'::jsonb,
      $tpl_order_shipped$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Siparişiniz Kargoya Verildi</title>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: light; }
    body { background-color:#FFFBF7 !important; color:#1F2937 !important; font-family:'Baloo 2','Nunito',sans-serif; margin:0; padding:0; }
    @media only screen and (max-width:600px) { .container { width:100% !important; border-radius:0 !important; } .content { padding:30px 20px !important; } }
  </style>
</head>
<body>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FFFBF7;">
    <tr><td align="center" style="padding:20px 0;"><p style="margin:0;color:#9CA3AF;font-size:12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color:#F97316;text-decoration:none;">Tarayıcıda açın</a></p></td></tr>
    <tr>
      <td align="center" style="padding:0 0 40px;">
        <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.05);overflow:hidden;">
          <tr><td height="6" style="background-color:#F97316;"></td></tr>
          <tr><td align="center" style="padding:40px 0 20px;"><img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" alt="Bravita" width="180" style="display:block;border:0;max-width:100%;height:auto;" /></td></tr>
          <tr><td align="center" style="padding:0 0 20px;"><div style="font-size:64px;line-height:1;">🚚</div></td></tr>
          <tr>
            <td class="content" align="center" style="padding:0 40px 40px;">
              <h1 style="margin:0 0 14px;color:#1F2937;font-size:26px;font-weight:700;">Siparişiniz Kargoya Verildi!</h1>
              <p style="margin:0 0 24px;color:#4B5563;font-size:16px;line-height:1.6;">#{{ORDER_ID}} numaralı siparişiniz kargo firmasına teslim edildi.</p>
              <div style="background-color:#FFF7ED;border:1px solid #FFEDD5;border-radius:12px;padding:20px;margin-bottom:24px;text-align:left;">
                <p style="margin:0 0 8px;color:#7C2D12;font-size:14px;"><strong>Kargo Firması:</strong> {{SHIPPING_COMPANY}}</p>
                <p style="margin:0;color:#7C2D12;font-size:14px;"><strong>Takip Numarası:</strong> {{TRACKING_NUMBER}}</p>
              </div>
              <table border="0" cellspacing="0" cellpadding="0"><tr><td align="center" style="border-radius:50px;background-color:#F97316;"><a href="{{BROWSER_LINK}}" style="display:inline-block;padding:14px 36px;font-family:'Baloo 2','Nunito',sans-serif;font-size:15px;color:#ffffff;text-decoration:none;font-weight:600;border-radius:50px;background-color:#F97316;border:1px solid #F97316;">Kargo Takibini Aç</a></td></tr></table>
            </td>
          </tr>
          <tr><td align="center" style="background-color:#FFF8F0;padding:20px;"><p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;">Sorularınız mı var? <a href="mailto:support@bravita.com.tr" style="color:#F97316;text-decoration:none;">support@bravita.com.tr</a></p><p style="margin:0;color:#9CA3AF;font-size:12px;">© 2026 Bravita. Tüm hakları saklıdır.</p></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
$tpl_order_shipped$
    ),
    (
      'order_delivered',
      'Teslim Edildi',
      'Siparişiniz Teslim Edildi 🎁 #{{ORDER_ID}}',
      '["ORDER_ID","SITE_URL","BROWSER_LINK"]'::jsonb,
      $tpl_order_delivered$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Siparişiniz Teslim Edildi</title>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: light; }
    body { background-color:#FFFBF7 !important; color:#1F2937 !important; font-family:'Baloo 2','Nunito',sans-serif; margin:0; padding:0; }
    @media only screen and (max-width:600px) { .container { width:100% !important; border-radius:0 !important; } .content { padding:30px 20px !important; } }
  </style>
</head>
<body>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FFFBF7;">
    <tr><td align="center" style="padding:20px 0;"><p style="margin:0;color:#9CA3AF;font-size:12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color:#F97316;text-decoration:none;">Tarayıcıda açın</a></p></td></tr>
    <tr>
      <td align="center" style="padding:0 0 40px;">
        <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.05);overflow:hidden;">
          <tr><td height="6" style="background-color:#22C55E;"></td></tr>
          <tr><td align="center" style="padding:40px 0 20px;"><img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" alt="Bravita" width="180" style="display:block;border:0;max-width:100%;height:auto;" /></td></tr>
          <tr><td align="center" style="padding:0 0 20px;"><div style="font-size:64px;line-height:1;">🎁</div></td></tr>
          <tr>
            <td class="content" align="center" style="padding:0 60px 40px;">
              <h1 style="margin:0 0 20px;color:#1F2937;font-size:26px;font-weight:700;">Siparişiniz Başarıyla Teslim Edildi!</h1>
              <p style="margin:0 0 30px;color:#4B5563;font-size:16px;line-height:1.6;">Harika haber! <strong>#{{ORDER_ID}}</strong> numaralı siparişiniz adresinize ulaştı. Umarız aldığınız ürünleri çok seversiniz.</p>
              <div style="background-color:#F0FDF4;border:1px solid #DCFCE7;border-radius:12px;padding:20px;margin-bottom:30px;text-align:left;">
                <p style="margin:0;color:#166534;font-size:14px;line-height:1.5;">Ürünlerimizi kullandığınız anları bizimle paylaşmak isterseniz <strong>@bravitatr</strong> etiketiyle sosyal medyada paylaşabilirsiniz. ✨</p>
              </div>
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="border-radius:50px;background-color:#F97316;">
                    <a href="{{SITE_URL}}/account/orders/{{ORDER_ID}}" style="display:inline-block;padding:16px 48px;font-family:'Baloo 2','Nunito',sans-serif;font-size:16px;color:#ffffff;text-decoration:none;font-weight:600;border-radius:50px;background-color:#F97316;border:1px solid #F97316;">Siparişi Görüntüle</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td align="center" style="background-color:#FFF8F0;padding:20px;"><p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;">Sorularınız mı var? <a href="mailto:support@bravita.com.tr" style="color:#F97316;text-decoration:none;">support@bravita.com.tr</a></p><p style="margin:0;color:#9CA3AF;font-size:12px;">© 2026 Bravita. Tüm hakları saklıdır.</p></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
$tpl_order_delivered$
    ),
    (
      'order_cancelled',
      'Sipariş İptal Edildi',
      'Siparişiniz İptal Edildi ❌ #{{ORDER_ID}}',
      '["ORDER_ID","CANCELLATION_REASON","BROWSER_LINK","SITE_URL"]'::jsonb,
      $tpl_order_cancelled$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Siparişiniz İptal Edildi</title>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: light; }
    body { background-color:#FFFBF7 !important; color:#1F2937 !important; font-family:'Baloo 2','Nunito',sans-serif; margin:0; padding:0; }
    @media only screen and (max-width:600px) { .container { width:100% !important; border-radius:0 !important; } .content { padding:30px 20px !important; } }
  </style>
</head>
<body>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FFFBF7;">
    <tr><td align="center" style="padding:20px 0;"><p style="margin:0;color:#9CA3AF;font-size:12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color:#F97316;text-decoration:none;">Tarayıcıda açın</a></p></td></tr>
    <tr>
      <td align="center" style="padding:0 0 40px;">
        <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.05);overflow:hidden;">
          <tr><td height="6" style="background-color:#EF4444;"></td></tr>
          <tr><td align="center" style="padding:40px 0 20px;"><img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" alt="Bravita" width="180" style="display:block;border:0;max-width:100%;height:auto;" /></td></tr>
          <tr><td align="center" style="padding:0 0 20px;"><div style="font-size:64px;line-height:1;">❌</div></td></tr>
          <tr>
            <td class="content" align="center" style="padding:0 40px 40px;">
              <h1 style="margin:0 0 14px;color:#1F2937;font-size:26px;font-weight:700;">Siparişiniz İptal Edildi</h1>
              <p style="margin:0 0 24px;color:#4B5563;font-size:16px;line-height:1.6;">#{{ORDER_ID}} numaralı siparişiniz iptal edildi. Detayları aşağıda bulabilirsiniz.</p>
              <div style="background-color:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:20px;margin-bottom:24px;text-align:left;">
                <p style="margin:0;color:#991B1B;font-size:14px;line-height:1.6;"><strong>İptal Nedeni:</strong> {{CANCELLATION_REASON}}</p>
              </div>
              <table border="0" cellspacing="0" cellpadding="0"><tr><td align="center" style="border-radius:50px;background-color:#EF4444;"><a href="{{BROWSER_LINK}}" style="display:inline-block;padding:14px 36px;font-family:'Baloo 2','Nunito',sans-serif;font-size:15px;color:#ffffff;text-decoration:none;font-weight:600;border-radius:50px;background-color:#EF4444;border:1px solid #EF4444;">Sipariş Detayını Aç</a></td></tr></table>
            </td>
          </tr>
          <tr><td align="center" style="background-color:#FFF8F0;padding:20px;"><p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;">Sorularınız mı var? <a href="mailto:support@bravita.com.tr" style="color:#F97316;text-decoration:none;">support@bravita.com.tr</a></p><p style="margin:0;color:#9CA3AF;font-size:12px;">© 2026 Bravita. Tüm hakları saklıdır.</p></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
$tpl_order_cancelled$
    ),
    (
      'support_ticket',
      'Destek Talebi Alındı',
      'Destek Talebiniz Alındı 🎫 #{{TICKET_ID}}',
      '["NAME","EMAIL","SUBJECT","TICKET_ID","CATEGORY","USER_MESSAGE","BROWSER_LINK","SITE_URL"]'::jsonb,
      $tpl_support_ticket$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Destek Talebiniz Alındı</title>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: light; }
    body { background-color:#FFFBF7 !important; color:#1F2937 !important; font-family:'Baloo 2','Nunito',sans-serif; margin:0; padding:0; }
    @media only screen and (max-width:600px) { .container { width:100% !important; border-radius:0 !important; } .content { padding:30px 20px !important; } }
  </style>
</head>
<body>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FFFBF7;">
    <tr><td align="center" style="padding:20px 0;"><p style="margin:0;color:#9CA3AF;font-size:12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color:#F97316;text-decoration:none;">Tarayıcıda açın</a></p></td></tr>
    <tr>
      <td align="center" style="padding:0 0 40px;">
        <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.05);overflow:hidden;">
          <tr><td height="6" style="background-color:#F97316;"></td></tr>
          <tr><td align="center" style="padding:40px 0 20px;"><img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" alt="Bravita" width="180" style="display:block;border:0;max-width:100%;height:auto;" /></td></tr>
          <tr><td align="center" style="padding:0 0 20px;"><div style="font-size:64px;line-height:1;">🎫</div></td></tr>
          <tr>
            <td class="content" align="center" style="padding:0 40px 40px;">
              <h1 style="margin:0 0 14px;color:#1F2937;font-size:26px;font-weight:700;">Destek Talebiniz Alındı</h1>
              <p style="margin:0 0 24px;color:#4B5563;font-size:16px;line-height:1.6;">Merhaba {{NAME}}, talebiniz başarıyla kaydedildi. Ekibimiz en kısa sürede sizinle iletişime geçecektir.</p>
              <div style="background-color:#FFF7ED;border:1px solid #FFEDD5;border-radius:12px;padding:20px;margin-bottom:24px;text-align:left;">
                <p style="margin:0 0 8px;color:#7C2D12;font-size:14px;"><strong>Talep No:</strong> #{{TICKET_ID}}</p>
                <p style="margin:0 0 8px;color:#7C2D12;font-size:14px;"><strong>Konu:</strong> {{SUBJECT}}</p>
                <p style="margin:0 0 8px;color:#7C2D12;font-size:14px;"><strong>Kategori:</strong> {{CATEGORY}}</p>
                <p style="margin:0;color:#7C2D12;font-size:14px;line-height:1.6;"><strong>Mesaj:</strong><br>{{USER_MESSAGE}}</p>
              </div>
              <table border="0" cellspacing="0" cellpadding="0"><tr><td align="center" style="border-radius:50px;background-color:#F97316;"><a href="{{BROWSER_LINK}}" style="display:inline-block;padding:14px 36px;font-family:'Baloo 2','Nunito',sans-serif;font-size:15px;color:#ffffff;text-decoration:none;font-weight:600;border-radius:50px;background-color:#F97316;border:1px solid #F97316;">Talep Detayını Aç</a></td></tr></table>
            </td>
          </tr>
          <tr><td align="center" style="background-color:#FFF8F0;padding:20px;"><p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;">Sorularınız mı var? <a href="mailto:support@bravita.com.tr" style="color:#F97316;text-decoration:none;">support@bravita.com.tr</a></p><p style="margin:0;color:#9CA3AF;font-size:12px;">© 2026 Bravita. Tüm hakları saklıdır.</p></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
$tpl_support_ticket$
    ),
    (
      'support_ticket_replied',
      'Destek Yanıtı',
      'Destek Talebinize Yanıt Geldi 💬 #{{TICKET_ID}}',
      '["TICKET_ID","USER_MESSAGE","ADMIN_REPLY","BROWSER_LINK","SITE_URL","NAME"]'::jsonb,
      $tpl_support_ticket_replied$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Destek Talebiniz Yanıtlandı</title>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: light; }
    body { background-color:#FFFBF7 !important; color:#1F2937 !important; font-family:'Baloo 2','Nunito',sans-serif; margin:0; padding:0; }
    @media only screen and (max-width:600px) { .container { width:100% !important; border-radius:0 !important; } .content { padding:30px 20px !important; } }
  </style>
</head>
<body>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FFFBF7;">
    <tr><td align="center" style="padding:20px 0;"><p style="margin:0;color:#9CA3AF;font-size:12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color:#F97316;text-decoration:none;">Tarayıcıda açın</a></p></td></tr>
    <tr>
      <td align="center" style="padding:0 0 40px;">
        <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.05);overflow:hidden;">
          <tr><td height="6" style="background-color:#3B82F6;"></td></tr>
          <tr><td align="center" style="padding:40px 0 20px;"><img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" alt="Bravita" width="180" style="display:block;border:0;max-width:100%;height:auto;" /></td></tr>
          <tr><td align="center" style="padding:0 0 20px;"><div style="font-size:64px;line-height:1;">💬</div></td></tr>
          <tr>
            <td class="content" align="center" style="padding:0 40px 40px;">
              <h1 style="margin:0 0 14px;color:#1F2937;font-size:26px;font-weight:700;">Destek Talebiniz Yanıtlandı</h1>
              <p style="margin:0 0 24px;color:#4B5563;font-size:16px;line-height:1.6;">Talebiniz için ekibimiz bir yanıt paylaştı. Aşağıdaki özetten inceleyebilirsiniz.</p>
              <div style="background-color:#EFF6FF;border:1px solid #DBEAFE;border-radius:12px;padding:20px;margin-bottom:16px;text-align:left;">
                <p style="margin:0 0 8px;color:#1E3A8A;font-size:14px;"><strong>Talep No:</strong> #{{TICKET_ID}}</p>
                <p style="margin:0;color:#1E3A8A;font-size:14px;line-height:1.6;"><strong>Mesajınız:</strong><br>{{USER_MESSAGE}}</p>
              </div>
              <div style="background-color:#F0FDF4;border:1px solid #DCFCE7;border-radius:12px;padding:20px;margin-bottom:24px;text-align:left;">
                <p style="margin:0;color:#166534;font-size:14px;line-height:1.6;"><strong>Yanıtımız:</strong><br>{{ADMIN_REPLY}}</p>
              </div>
              <table border="0" cellspacing="0" cellpadding="0"><tr><td align="center" style="border-radius:50px;background-color:#3B82F6;"><a href="{{BROWSER_LINK}}" style="display:inline-block;padding:14px 36px;font-family:'Baloo 2','Nunito',sans-serif;font-size:15px;color:#ffffff;text-decoration:none;font-weight:600;border-radius:50px;background-color:#3B82F6;border:1px solid #3B82F6;">Talep Detayını Aç</a></td></tr></table>
            </td>
          </tr>
          <tr><td align="center" style="background-color:#FFF8F0;padding:20px;"><p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;">Sorularınız mı var? <a href="mailto:support@bravita.com.tr" style="color:#F97316;text-decoration:none;">support@bravita.com.tr</a></p><p style="margin:0;color:#9CA3AF;font-size:12px;">© 2026 Bravita. Tüm hakları saklıdır.</p></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
$tpl_support_ticket_replied$
    ),
    (
      'support_ticket_closed',
      'Destek Talebi Kapatıldı',
      'Destek Talebiniz Çözümlendi ✅ #{{TICKET_ID}}',
      '["TICKET_ID","ADMIN_REPLY","BROWSER_LINK","SITE_URL","NAME"]'::jsonb,
      $tpl_support_ticket_closed$
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Destek Talebiniz Çözümlendi</title>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root { color-scheme: light; }
    body { background-color:#FFFBF7 !important; color:#1F2937 !important; font-family:'Baloo 2','Nunito',sans-serif; margin:0; padding:0; }
    @media only screen and (max-width:600px) { .container { width:100% !important; border-radius:0 !important; } .content { padding:30px 20px !important; } }
  </style>
</head>
<body>
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#FFFBF7;">
    <tr><td align="center" style="padding:20px 0;"><p style="margin:0;color:#9CA3AF;font-size:12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color:#F97316;text-decoration:none;">Tarayıcıda açın</a></p></td></tr>
    <tr>
      <td align="center" style="padding:0 0 40px;">
        <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.05);overflow:hidden;">
          <tr><td height="6" style="background-color:#22C55E;"></td></tr>
          <tr><td align="center" style="padding:40px 0 20px;"><img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" alt="Bravita" width="180" style="display:block;border:0;max-width:100%;height:auto;" /></td></tr>
          <tr><td align="center" style="padding:0 0 20px;"><div style="font-size:64px;line-height:1;">✅</div></td></tr>
          <tr>
            <td class="content" align="center" style="padding:0 40px 40px;">
              <h1 style="margin:0 0 14px;color:#1F2937;font-size:26px;font-weight:700;">Destek Talebiniz Çözümlendi</h1>
              <p style="margin:0 0 24px;color:#4B5563;font-size:16px;line-height:1.6;">#{{TICKET_ID}} numaralı talebiniz çözümlendi ve kapatıldı. Özet bilgi aşağıdadır.</p>
              <div style="background-color:#F0FDF4;border:1px solid #DCFCE7;border-radius:12px;padding:20px;margin-bottom:24px;text-align:left;">
                <p style="margin:0;color:#166534;font-size:14px;line-height:1.6;"><strong>Son Yanıt:</strong><br>{{ADMIN_REPLY}}</p>
              </div>
              <table border="0" cellspacing="0" cellpadding="0"><tr><td align="center" style="border-radius:50px;background-color:#22C55E;"><a href="{{BROWSER_LINK}}" style="display:inline-block;padding:14px 36px;font-family:'Baloo 2','Nunito',sans-serif;font-size:15px;color:#ffffff;text-decoration:none;font-weight:600;border-radius:50px;background-color:#22C55E;border:1px solid #22C55E;">Talep Geçmişini Aç</a></td></tr></table>
            </td>
          </tr>
          <tr><td align="center" style="background-color:#FFF8F0;padding:20px;"><p style="margin:0 0 8px;color:#9CA3AF;font-size:12px;">Sorularınız mı var? <a href="mailto:support@bravita.com.tr" style="color:#F97316;text-decoration:none;">support@bravita.com.tr</a></p><p style="margin:0;color:#9CA3AF;font-size:12px;">© 2026 Bravita. Tüm hakları saklıdır.</p></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
$tpl_support_ticket_closed$
    )
)
UPDATE public.email_templates et
SET
  name = p.name,
  subject = p.subject,
  variables = p.variables,
  content_html = p.content_html,
  updated_at = timezone('utc'::text, now())
FROM payload p
WHERE et.slug = p.slug;

COMMIT;
