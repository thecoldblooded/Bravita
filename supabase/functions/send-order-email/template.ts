export const AWAITING_PAYMENT_HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ödeme Bekleniyor</title>
    <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        body { background-color: #FFFBF7 !important; color: #1F2937 !important; font-family: 'Baloo 2', 'Nunito', sans-serif; }
        .item-row td { border-bottom: 1px solid #F3F4F6; padding: 16px 0; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFBF7;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFBF7;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <p style="margin: 0; color: #9CA3AF; font-size: 12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color: #F97316; text-decoration: none;">Browserda açın</a></p>
            </td>
        </tr>
        <tr>
            <td align="center">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden;">
                    <tr><td height="6" style="background-color: #3B82F6;"></td></tr>
                    <tr><td align="center" style="padding: 40px 0 20px;"><img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" width="180" /></td></tr>
                    <tr><td align="center" style="padding: 0 0 20px;"><div style="font-size: 64px;">🕒</div></td></tr>
                    <tr>
                        <td style="padding: 0 40px 40px; text-align: center;">
                            <h1 style="margin: 0 0 10px; color: #1F2937; font-size: 26px;">Siparişiniz Alındı!</h1>
                            <p style="margin: 0 0 30px; color: #4B5563; font-size: 16px;">Ödemeniz onaylandıktan sonra siparişiniz hazırlanmaya başlanacaktır.</p>
                            
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F9FAFB; border-radius: 12px; margin-bottom: 30px; padding: 20px;">
                                <tr>
                                    <td align="left">#{{ORDER_ID}}</td>
                                    <td align="right">{{ORDER_DATE}}</td>
                                </tr>
                            </table>

                            <div style="text-align: left; margin-bottom: 30px;">
                                <h3 style="color: #F97316;">Sipariş Detayları</h3>
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">{{ITEMS_LIST}}</table>
                            </div>

                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
                                <tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Ara Toplam</td><td align="right" style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">₺{{SUBTOTAL}}</td></tr>
                                <tr><td style="padding: 8px 0; color: #22C55E; font-size: 14px;">İndirim</td><td align="right" style="padding: 8px 0; color: #22C55E; font-size: 14px; font-weight: 600;">-₺{{DISCOUNT}}</td></tr>
                                <tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">KDV (%20)</td><td align="right" style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">₺{{TAX}}</td></tr>
                                <tr><td style="border-top: 1px solid #E5E7EB; padding: 16px 0 0; color: #111827; font-size: 18px; font-weight: 800;">Toplam</td><td align="right" style="border-top: 1px solid #E5E7EB; padding: 16px 0 0; color: #F97316; font-size: 24px; font-weight: 800;">₺{{TOTAL}}</td></tr>
                            </table>

                            <div style="text-align: left; background-color: #FFF7ED; padding: 20px; border-radius: 12px; border: 1px solid #FFEDD5; margin-bottom: 20px;">
                                <h3 style="margin: 0 0 10px; color: #EA580C; font-size: 14px; font-weight: 700; text-transform: uppercase;">Teslimat Adresi</h3>
                                <p style="margin: 0; color: #431407; font-size: 14px; line-height: 1.6;">{{SHIPPING_ADDRESS}}</p>
                            </div>

                            {{BANK_DETAILS}}

                            <div style="margin-top: 20px;">
                                <p style="color: #6B7280; font-size: 13px;">Ödeme Yöntemi: <strong>{{PAYMENT_METHOD}}</strong></p>
                            </div>
                        </td>
                    </tr>
                    <tr><td align="center" style="background-color: #FFF8F0; padding: 20px;"><p>© 2026 Bravita</p></td></tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

export const ORDER_CONFIRMATION_HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Siparişiniz Onaylandı</title>
    <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        body { background-color: #FFFBF7 !important; color: #1F2937 !important; font-family: 'Baloo 2', 'Nunito', sans-serif; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFBF7;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFBF7;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <p style="margin: 0; color: #9CA3AF; font-size: 12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color: #F97316; text-decoration: none;">Browserda açın</a></p>
            </td>
        </tr>
        <tr>
            <td align="center">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden;">
                    <tr><td height="6" style="background-color: #22C55E;"></td></tr>
                    <tr><td align="center" style="padding: 40px 0 20px;"><img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" width="180" /></td></tr>
                    <tr><td align="center" style="padding: 0 0 20px;"><div style="font-size: 64px;">🎉</div></td></tr>
                    <tr>
                        <td style="padding: 0 40px 40px; text-align: center;">
                            <h1 style="margin: 0 0 10px; color: #1F2937; font-size: 26px;">Siparişiniz Onaylandı!</h1>
                            <p style="margin: 0 0 30px; color: #4B5563; font-size: 16px;">Siparişiniz başarıyla onaylandı ve hazırlanmaya başlandı.</p>
                            
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F9FAFB; border-radius: 12px; margin-bottom: 30px; padding: 20px;">
                                <tr>
                                    <td align="left">#{{ORDER_ID}}</td>
                                    <td align="right">{{ORDER_DATE}}</td>
                                </tr>
                            </table>

                            <div style="text-align: left; margin-bottom: 30px;">
                                <h3 style="color: #F97316;">Sipariş Detayları</h3>
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">{{ITEMS_LIST}}</table>
                            </div>

                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
                                <tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Ara Toplam</td><td align="right" style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">₺{{SUBTOTAL}}</td></tr>
                                <tr><td style="padding: 8px 0; color: #22C55E; font-size: 14px;">İndirim</td><td align="right" style="padding: 8px 0; color: #22C55E; font-size: 14px; font-weight: 600;">-₺{{DISCOUNT}}</td></tr>
                                <tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">KDV (%20)</td><td align="right" style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">₺{{TAX}}</td></tr>
                                <tr><td style="border-top: 1px solid #E5E7EB; padding: 16px 0 0; color: #111827; font-size: 18px; font-weight: 800;">Toplam</td><td align="right" style="border-top: 1px solid #E5E7EB; padding: 16px 0 0; color: #F97316; font-size: 24px; font-weight: 800;">₺{{TOTAL}}</td></tr>
                            </table>

                            <div style="text-align: left; background-color: #FFF7ED; padding: 20px; border-radius: 12px; border: 1px solid #FFEDD5;">
                                <h3 style="margin: 0 0 10px; color: #EA580C; font-size: 14px; font-weight: 700; text-transform: uppercase;">Teslimat Adresi</h3>
                                <p style="margin: 0; color: #431407; font-size: 14px; line-height: 1.6;">{{SHIPPING_ADDRESS}}</p>
                            </div>

                            {{BANK_DETAILS}}
                            
                            <div style="margin-top: 20px; text-align: center;">
                                <p style="color: #6B7280; font-size: 13px;">Ödeme Yöntemi: <strong>{{PAYMENT_METHOD}}</strong></p>
                            </div>
                        </td>
                    </tr>
                    <tr><td align="center" style="background-color: #FFF8F0; padding: 20px;"><p>© 2026 Bravita</p></td></tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

export const SHIPPED_HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Siparişiniz Kargoya Verildi</title>
    <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        body { background-color: #FFFBF7 !important; color: #1F2937 !important; font-family: 'Baloo 2', 'Nunito', sans-serif; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFBF7;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFBF7;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <p style="margin: 0; color: #9CA3AF; font-size: 12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color: #F97316; text-decoration: none;">Browserda açın</a></p>
            </td>
        </tr>
        <tr>
            <td align="center">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden;">
                    <tr><td height="6" style="background-color: #F97316;"></td></tr>
                    <tr><td align="center" style="padding: 40px 0 20px;"><img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" width="180" /></td></tr>
                    <tr><td align="center" style="padding: 0 0 20px;"><div style="font-size: 64px;">🚚</div></td></tr>
                    <tr>
                        <td style="padding: 0 40px 40px; text-align: center;">
                            <h1 style="margin: 0 0 10px; color: #1F2937; font-size: 26px;">Siparişiniz Kargoya Verildi!</h1>
                            <p style="margin: 0 0 30px; color: #4B5563; font-size: 16px;">Siparişiniz kargo firmasına teslim edildi.</p>
                            
                            <div style="background-color: #FFF7ED; border: 1px solid #FFEDD5; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                                <p>Kargo Firması: {{SHIPPING_COMPANY}}</p>
                                <p>Takip Numarası: {{TRACKING_NUMBER}}</p>
                            </div>
                        </td>
                    </tr>
                    <tr><td align="center" style="background-color: #FFF8F0; padding: 20px;"><p>© 2026 Bravita</p></td></tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

export const DELIVERED_HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>Siparişiniz Teslim Edildi</title>
    <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        :root {
            color-scheme: light;
        }
        body {
            background-color: #FFFBF7 !important;
            color: #1F2937 !important;
            font-family: 'Baloo 2', 'Nunito', sans-serif;
        }
        @media only screen and (max-width: 600px) {
            .container {
                width: 100% !important;
                border-radius: 0 !important;
            }
            .content {
                padding: 30px 20px !important;
            }
        }
    </style>
</head>
<body
    style="margin: 0; padding: 0; background-color: #FFFBF7; font-family: 'Baloo 2', 'Nunito', sans-serif;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFBF7;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table class="container" width="600" border="0" cellspacing="0" cellpadding="0"
                    style="background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden;">
                    <tr>
                        <td height="6" style="background-color: #22C55E;"></td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 40px 0 20px;">
                            <img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp"
                                alt="Bravita" width="180"
                                style="display: block; border: 0; max-width: 100%; height: auto;" />
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 0 0 20px;">
                            <div style="font-size: 64px; line-height: 1;">🎁</div>
                        </td>
                    </tr>
                    <tr>
                        <td class="content" align="center" style="padding: 0 60px 40px;">
                            <h1 style="margin: 0 0 20px; color: #1F2937; font-size: 26px; font-weight: 700;">Siparişiniz
                                Başarıyla Teslim Edildi!</h1>
                            <p style="margin: 0 0 30px; color: #4B5563; font-size: 16px; line-height: 1.6;">
                                Harika haber! <strong>#{{ORDER_ID}}</strong> numaralı siparişiniz adresinize ulaştı.
                                Umarız aldığınız ürünleri çok seversiniz.
                            </p>
                            <div
                                style="background-color: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 12px; padding: 20px; margin-bottom: 30px; text-align: left;">
                                <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.5;">
                                    Ürünlerimizi kullandığınız anları bizimle paylaşmak isterseniz
                                    <strong>@bravitatr</strong> etiketiyle sosyal medyada paylaşabilirsiniz. ✨
                                </p>
                            </div>
                            <table border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="border-radius: 50px; background-color: #F97316;">
                                        <a href="{{SITE_URL}}/account/orders/{{ORDER_ID}}"
                                            style="display: inline-block; padding: 16px 48px; font-family: 'Baloo 2', 'Nunito', sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 50px; background-color: #F97316; border: 1px solid #F97316;">
                                            Siparişi Görüntüle
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="background-color: #FFF8F0; padding: 20px;">
                            <p style="margin: 0; color: #9CA3AF; font-size: 12px;">© 2026 Bravita</p>
                        </td>
                    </tr>
                </table>
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td height="40"></td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

export const CANCELLED_HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Siparişiniz İptal Edildi</title>
    <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        body { background-color: #FFFBF7 !important; color: #1F2937 !important; font-family: 'Baloo 2', 'Nunito', sans-serif; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFBF7;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFBF7;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <p style="margin: 0; color: #9CA3AF; font-size: 12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color: #F97316; text-decoration: none;">Browserda açın</a></p>
            </td>
        </tr>
        <tr>
            <td align="center">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden;">
                    <tr><td height="6" style="background-color: #EF4444;"></td></tr>
                    <tr><td align="center" style="padding: 40px 0 20px;"><img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" width="180" /></td></tr>
                    <tr><td align="center" style="padding: 0 0 20px;"><div style="font-size: 64px;">❌</div></td></tr>
                    <tr>
                        <td style="padding: 0 40px 40px; text-align: center;">
                            <h1 style="margin: 0 0 10px; color: #1F2937; font-size: 26px;">Siparişiniz İptal Edildi</h1>
                            <p style="margin: 0 0 30px; color: #4B5563; font-size: 16px;">Siparişiniz iptal edilmiştir.</p>
                        </td>
                    </tr>
                    <tr><td align="center" style="background-color: #FFF8F0; padding: 20px;"><p>© 2026 Bravita</p></td></tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

export const PROCESSING_HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Siparişiniz İşleniyor</title>
    <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        body { background-color: #FFFBF7 !important; color: #1F2937 !important; font-family: 'Baloo 2', 'Nunito', sans-serif; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFBF7;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFBF7;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <p style="margin: 0; color: #9CA3AF; font-size: 12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color: #F97316; text-decoration: none;">Browserda açın</a></p>
            </td>
        </tr>
        <tr>
            <td align="center">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden;">
                    <tr><td height="6" style="background-color: #3B82F6;"></td></tr>
                    <tr><td align="center" style="padding: 40px 0 20px;"><img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" width="180" /></td></tr>
                    <tr><td align="center" style="padding: 0 0 20px;"><div style="font-size: 64px;">⚙️</div></td></tr>
                    <tr>
                        <td style="padding: 0 40px 40px; text-align: center;">
                            <h1 style="margin: 0 0 10px; color: #1F2937; font-size: 26px;">Siparişiniz İşleniyor!</h1>
                        </td>
                    </tr>
                    <tr><td align="center" style="background-color: #FFF8F0; padding: 20px;"><p>© 2026 Bravita</p></td></tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

export const PREPARING_HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Siparişiniz Hazırlanıyor</title>
    <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        body { background-color: #FFFBF7 !important; color: #1F2937 !important; font-family: 'Baloo 2', 'Nunito', sans-serif; }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFBF7;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFBF7;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <p style="margin: 0; color: #9CA3AF; font-size: 12px;">E-postayı görüntülemekte sorun mu yaşıyorsunuz? <a href="{{BROWSER_LINK}}" style="color: #F97316; text-decoration: none;">Browserda açın</a></p>
            </td>
        </tr>
        <tr>
            <td align="center">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden;">
                    <tr><td height="6" style="background-color: #6366F1;"></td></tr>
                    <tr><td align="center" style="padding: 40px 0 20px;"><img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" width="180" /></td></tr>
                    <tr><td align="center" style="padding: 0 0 20px;"><div style="font-size: 64px;">📋</div></td></tr>
                    <tr>
                        <td style="padding: 0 40px 40px; text-align: center;">
                            <h1 style="margin: 0 0 10px; color: #1F2937; font-size: 26px;">Siparişiniz Hazırlanıyor!</h1>
                        </td>
                    </tr>
                    <tr><td align="center" style="background-color: #FFF8F0; padding: 20px;"><p>© 2026 Bravita</p></td></tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
