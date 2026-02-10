export const ORDER_CONFIRMATION_HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light">
    <title>Siparişiniz Onaylandı</title>
    <style>
        :root { color-scheme: light; }
        body { background-color: #FFFBF7 !important; color: #1F2937 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .item-row td { border-bottom: 1px solid #F3F4F6; padding: 16px 0; }
        .item-row:last-child td { border-bottom: none; }
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; border-radius: 0 !important; }
            .content { padding: 30px 20px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFBF7;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFBF7;" role="presentation">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden;" role="presentation">
                    <tr><td height="6" style="background-color: #22C55E;"></td></tr>
                    <tr>
                        <td align="center" style="padding: 40px 0 20px;">
                            <img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" alt="Bravita" width="180" style="display: block; border: 0; max-width: 100%; height: auto;" />
                        </td>
                    </tr>
                    <tr><td align="center" style="padding: 0 0 20px;"><div style="font-size: 64px; line-height: 1;">🎉</div></td></tr>
                    <tr>
                        <td class="content" align="center" style="padding: 0 40px 40px;">
                            <h1 style="margin: 0 0 10px; color: #1F2937; font-size: 26px; font-weight: 700;">Siparişiniz Onaylandı!</h1>
                            <p style="margin: 0 0 30px; color: #4B5563; font-size: 16px; line-height: 1.6;">Siparişiniz başarıyla alındı ve hazırlanmaya başlandı.</p>
                            
                            <!-- Order Info -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F9FAFB; border-radius: 12px; margin-bottom: 30px; padding: 20px;" role="presentation">
                                <tr>
                                    <td align="left" style="padding-bottom: 8px;">
                                        <span style="color: #6B7280; font-size: 13px; font-weight: 600; text-transform: uppercase;">Sipariş No</span><br>
                                        <span style="color: #111827; font-size: 16px; font-weight: 700;">#{{ORDER_ID}}</span>
                                    </td>
                                    <td align="right" style="padding-bottom: 8px;">
                                        <span style="color: #6B7280; font-size: 13px; font-weight: 600; text-transform: uppercase;">Tarih</span><br>
                                        <span style="color: #111827; font-size: 16px; font-weight: 700;">{{ORDER_DATE}}</span>
                                    </td>
                                </tr>
                            </table>

                            <!-- Items -->
                            <div style="text-align: left; margin-bottom: 30px;">
                                <h3 style="margin: 0 0 15px; color: #F97316; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Sipariş Detayları</h3>
                                <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
                                    <tbody>
                                        {{ITEMS_LIST}}
                                    </tbody>
                                </table>
                            </div>

                            <!-- Totals -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;" role="presentation">
                                <tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Ara Toplam</td><td align="right" style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">₺{{SUBTOTAL}}</td></tr>
                                <tr><td style="padding: 8px 0; color: #22C55E; font-size: 14px;">İndirim</td><td align="right" style="padding: 8px 0; color: #22C55E; font-size: 14px; font-weight: 600;">-₺{{DISCOUNT}}</td></tr>
                                <tr><td style="padding: 8px 0; color: #6B7280; font-size: 14px;">KDV (%20)</td><td align="right" style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">₺{{TAX}}</td></tr>
                                <tr><td style="border-top: 1px solid #E5E7EB; padding: 16px 0 0; color: #111827; font-size: 18px; font-weight: 800;">Toplam</td><td align="right" style="border-top: 1px solid #E5E7EB; padding: 16px 0 0; color: #F97316; font-size: 24px; font-weight: 800;">₺{{TOTAL}}</td></tr>
                            </table>

                            <!-- Summary -->
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
                    <tr><td align="center" style="background-color: #FFF8F0; padding: 20px;"><p style="margin: 0; color: #9CA3AF; font-size: 14px;">© 2026 Bravita</p></td></tr>
                </table>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation"><tr><td height="40"></td></tr></table>
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
    <meta name="color-scheme" content="light">
    <title>Siparişiniz Kargoya Verildi</title>
    <style>
        :root { color-scheme: light; }
        body { background-color: #FFFBF7 !important; color: #1F2937 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .item-row td { border-bottom: 1px solid #F3F4F6; padding: 16px 0; }
        .item-row:last-child td { border-bottom: none; }
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; border-radius: 0 !important; }
            .content { padding: 30px 20px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFBF7;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFBF7;" role="presentation">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden;" role="presentation">
                    <tr><td height="6" style="background-color: #F97316;"></td></tr>
                    <tr>
                        <td align="center" style="padding: 40px 0 20px;">
                            <img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" alt="Bravita" width="180" style="display: block; border: 0; max-width: 100%; height: auto;" />
                        </td>
                    </tr>
                    <tr><td align="center" style="padding: 0 0 20px;"><div style="font-size: 64px; line-height: 1;">🚚</div></td></tr>
                    <tr>
                        <td class="content" align="center" style="padding: 0 40px 40px;">
                            <h1 style="margin: 0 0 10px; color: #1F2937; font-size: 26px; font-weight: 700;">Siparişiniz Kargoya Verildi!</h1>
                            <p style="margin: 0 0 30px; color: #4B5563; font-size: 16px; line-height: 1.6;">Siparişiniz kargo firmasına teslim edildi. Aşağıdaki bilgilerle kargonuzu takip edebilirsiniz.</p>
                            
                            <!-- Tracking Info -->
                            <div style="background-color: #FFF7ED; border: 1px solid #FFEDD5; border-radius: 12px; padding: 20px; margin-bottom: 30px; text-align: center;">
                                <p style="margin: 0 0 5px; color: #9A3412; font-size: 14px; font-weight: 600; text-transform: uppercase;">Kargo Firması</p>
                                <p style="margin: 0 0 15px; color: #1F2937; font-size: 16px;">{{SHIPPING_COMPANY}}</p>
                                <p style="margin: 0 0 5px; color: #9A3412; font-size: 14px; font-weight: 600; text-transform: uppercase;">Takip Numarası</p>
                                <p style="margin: 0; color: #1F2937; font-size: 18px; font-weight: 700; font-family: monospace; letter-spacing: 1px;">{{TRACKING_NUMBER}}</p>
                            </div>

                            <!-- Order Info -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F9FAFB; border-radius: 12px; margin-bottom: 30px; padding: 20px;" role="presentation">
                                <tr>
                                    <td align="left" style="padding-bottom: 8px;">
                                        <span style="color: #6B7280; font-size: 13px; font-weight: 600; text-transform: uppercase;">Sipariş No</span><br>
                                        <span style="color: #111827; font-size: 16px; font-weight: 700;">#{{ORDER_ID}}</span>
                                    </td>
                                    <td align="right" style="padding-bottom: 8px;">
                                        <span style="color: #6B7280; font-size: 13px; font-weight: 600; text-transform: uppercase;">Tarih</span><br>
                                        <span style="color: #111827; font-size: 16px; font-weight: 700;">{{ORDER_DATE}}</span>
                                    </td>
                                </tr>
                            </table>

                             <!-- Items -->
                            <div style="text-align: left; margin-bottom: 30px;">
                                <h3 style="margin: 0 0 15px; color: #F97316; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Sipariş Detayları</h3>
                                <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
                                    <tbody>
                                        {{ITEMS_LIST}}
                                    </tbody>
                                </table>
                            </div>

                             <!-- Summary -->
                             <div style="text-align: left; background-color: #F9FAFB; padding: 20px; border-radius: 12px; border: 1px solid #E5E7EB;">
                                <h3 style="margin: 0 0 10px; color: #374151; font-size: 14px; font-weight: 700; text-transform: uppercase;">Teslimat Adresi</h3>
                                <p style="margin: 0; color: #1F2937; font-size: 14px; line-height: 1.6;">{{SHIPPING_ADDRESS}}</p>
                            </div>
                        </td>
                    </tr>
                    <tr><td align="center" style="background-color: #FFF8F0; padding: 20px;"><p style="margin: 0; color: #9CA3AF; font-size: 14px;">© 2026 Bravita</p></td></tr>
                </table>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation"><tr><td height="40"></td></tr></table>
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
    <title>Siparişiniz Teslim Edildi</title>
    <style>
        :root { color-scheme: light; }
        body { background-color: #FFFBF7 !important; color: #1F2937 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .item-row td { border-bottom: 1px solid #F3F4F6; padding: 16px 0; }
        .item-row:last-child td { border-bottom: none; }
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; border-radius: 0 !important; }
            .content { padding: 30px 20px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFBF7;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFBF7;" role="presentation">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden;" role="presentation">
                    <tr><td height="6" style="background-color: #22C55E;"></td></tr>
                    <tr>
                        <td align="center" style="padding: 40px 0 20px;">
                            <img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" alt="Bravita" width="180" style="display: block; border: 0; max-width: 100%; height: auto;" />
                        </td>
                    </tr>
                    <tr><td align="center" style="padding: 0 0 20px;"><div style="font-size: 64px; line-height: 1;">✅</div></td></tr>
                    <tr>
                        <td class="content" align="center" style="padding: 0 40px 40px;">
                            <h1 style="margin: 0 0 10px; color: #1F2937; font-size: 26px; font-weight: 700;">Siparişiniz Teslim Edildi!</h1>
                            <p style="margin: 0 0 30px; color: #4B5563; font-size: 16px; line-height: 1.6;">Siparişiniz başarıyla teslim edildi. Bizi tercih ettiğiniz için teşekkür ederiz.</p>
                            
                             <!-- Items -->
                             <div style="text-align: left; margin-bottom: 30px;">
                                <h3 style="margin: 0 0 15px; color: #F97316; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Teslim Edilen Ürünler</h3>
                                <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
                                    <tbody>
                                        {{ITEMS_LIST}}
                                    </tbody>
                                </table>
                            </div>

                            <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.6; text-align: center;">
                                Bir sorun mu var? <a href="mailto:destek@bravita.com.tr" style="color: #F97316; text-decoration: none;">Bize ulaşın</a>.
                            </p>
                        </td>
                    </tr>
                    <tr><td align="center" style="background-color: #FFF8F0; padding: 20px;"><p style="margin: 0; color: #9CA3AF; font-size: 14px;">© 2026 Bravita</p></td></tr>
                </table>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation"><tr><td height="40"></td></tr></table>
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
    <meta name="color-scheme" content="light">
    <title>Siparişiniz İptal Edildi</title>
    <style>
        :root { color-scheme: light; }
        body { background-color: #FFFBF7 !important; color: #1F2937 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        .item-row td { border-bottom: 1px solid #F3F4F6; padding: 16px 0; }
        .item-row:last-child td { border-bottom: none; }
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; border-radius: 0 !important; }
            .content { padding: 30px 20px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFBF7;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFBF7;" role="presentation">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden;" role="presentation">
                    <tr><td height="6" style="background-color: #EF4444;"></td></tr>
                    <tr>
                        <td align="center" style="padding: 40px 0 20px;">
                            <img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" alt="Bravita" width="180" style="display: block; border: 0; max-width: 100%; height: auto;" />
                        </td>
                    </tr>
                    <tr><td align="center" style="padding: 0 0 20px;"><div style="font-size: 64px; line-height: 1;">❌</div></td></tr>
                    <tr>
                        <td class="content" align="center" style="padding: 0 40px 40px;">
                            <h1 style="margin: 0 0 10px; color: #1F2937; font-size: 26px; font-weight: 700;">Siparişiniz İptal Edildi</h1>
                            <p style="margin: 0 0 30px; color: #4B5563; font-size: 16px; line-height: 1.6;">Siparişiniz aşağıda belirtilen nedenle iptal edilmiştir.</p>
                            
                            <!-- Cancellation Reason -->
                            <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 20px; margin-bottom: 30px; text-align: left;">
                                <p style="margin: 0 0 5px; color: #B91C1C; font-size: 14px; font-weight: 600; text-transform: uppercase;">İptal Nedeni</p>
                                <p style="margin: 0; color: #1F2937; font-size: 16px;">{{CANCELLATION_REASON}}</p>
                            </div>

                            <!-- Refund Info -->
                            <p style="margin: 0 0 30px; color: #6B7280; font-size: 14px; line-height: 1.6;">
                                Ödemeniz alınmışsa, iade işlemi bankanıza bağlı olarak 3-7 iş günü içerisinde kartınıza yansıyacaktır.
                            </p>

                            <!-- Order Info -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F9FAFB; border-radius: 12px; margin-bottom: 30px; padding: 20px;" role="presentation">
                                <tr>
                                    <td align="left" style="padding-bottom: 8px;">
                                        <span style="color: #6B7280; font-size: 13px; font-weight: 600; text-transform: uppercase;">Sipariş No</span><br>
                                        <span style="color: #111827; font-size: 16px; font-weight: 700;">#{{ORDER_ID}}</span>
                                    </td>
                                    <td align="right" style="padding-bottom: 8px;">
                                        <span style="color: #6B7280; font-size: 13px; font-weight: 600; text-transform: uppercase;">Tarih</span><br>
                                        <span style="color: #111827; font-size: 16px; font-weight: 700;">{{ORDER_DATE}}</span>
                                    </td>
                                </tr>
                            </table>

                            <div style="margin-top: 20px; text-align: center;">
                                <p style="color: #6B7280; font-size: 13px;">Sorularınız için <a href="mailto:destek@bravita.com.tr" style="color: #EF4444; text-decoration: none;">destek@bravita.com.tr</a> adresinden bize ulaşabilirsiniz.</p>
                            </div>
                        </td>
                    </tr>
                    <tr><td align="center" style="background-color: #FFF8F0; padding: 20px;"><p style="margin: 0; color: #9CA3AF; font-size: 14px;">© 2026 Bravita</p></td></tr>
                </table>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation"><tr><td height="40"></td></tr></table>
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
    <meta name="color-scheme" content="light">
    <title>Siparişiniz İşleniyor</title>
    <style>
        :root { color-scheme: light; }
        body { background-color: #FFFBF7 !important; color: #1F2937 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; border-radius: 0 !important; }
            .content { padding: 30px 20px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFBF7;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFBF7;" role="presentation">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden;" role="presentation">
                    <tr><td height="6" style="background-color: #3B82F6;"></td></tr>
                    <tr>
                        <td align="center" style="padding: 40px 0 20px;">
                            <img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" alt="Bravita" width="180" style="display: block; border: 0; max-width: 100%; height: auto;" />
                        </td>
                    </tr>
                    <tr><td align="center" style="padding: 0 0 20px;"><div style="font-size: 64px; line-height: 1;">⚙️</div></td></tr>
                    <tr>
                        <td class="content" align="center" style="padding: 0 40px 40px;">
                            <h1 style="margin: 0 0 10px; color: #1F2937; font-size: 26px; font-weight: 700;">Siparişiniz İşleniyor!</h1>
                            <p style="margin: 0 0 30px; color: #4B5563; font-size: 16px; line-height: 1.6;">Siparişiniz başarıyla işleniyor. Ürünleriniz en kısa sürede hazırlanmaya başlanacaktır.</p>
                            
                             <!-- Order Info -->
                             <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F9FAFB; border-radius: 12px; margin-bottom: 30px; padding: 20px;" role="presentation">
                                <tr>
                                    <td align="left" style="padding-bottom: 8px;">
                                        <span style="color: #6B7280; font-size: 13px; font-weight: 600; text-transform: uppercase;">Sipariş No</span><br>
                                        <span style="color: #111827; font-size: 16px; font-weight: 700;">#{{ORDER_ID}}</span>
                                    </td>
                                    <td align="right" style="padding-bottom: 8px;">
                                        <span style="color: #6B7280; font-size: 13px; font-weight: 600; text-transform: uppercase;">Tarih</span><br>
                                        <span style="color: #111827; font-size: 16px; font-weight: 700;">{{ORDER_DATE}}</span>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.6; text-align: center;">
                                Sipariş durumunuzu profilinizden takip edebilirsiniz.
                            </p>
                        </td>
                    </tr>
                    <tr><td align="center" style="background-color: #FFF8F0; padding: 20px;"><p style="margin: 0; color: #9CA3AF; font-size: 14px;">© 2026 Bravita</p></td></tr>
                </table>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation"><tr><td height="40"></td></tr></table>
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
    <meta name="color-scheme" content="light">
    <title>Siparişiniz Hazırlanıyor</title>
    <style>
        :root { color-scheme: light; }
        body { background-color: #FFFBF7 !important; color: #1F2937 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; border-radius: 0 !important; }
            .content { padding: 30px 20px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFBF7;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFBF7;" role="presentation">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden;" role="presentation">
                    <tr><td height="6" style="background-color: #6366F1;"></td></tr>
                    <tr>
                        <td align="center" style="padding: 40px 0 20px;">
                            <img src="https://xpmbnznsmsujjuwumfiw.supabase.co/storage/v1/object/public/public-assets/bravita-logo.webp" alt="Bravita" width="180" style="display: block; border: 0; max-width: 100%; height: auto;" />
                        </td>
                    </tr>
                    <tr><td align="center" style="padding: 0 0 20px;"><div style="font-size: 64px; line-height: 1;">📋</div></td></tr>
                    <tr>
                        <td class="content" align="center" style="padding: 0 40px 40px;">
                            <h1 style="margin: 0 0 10px; color: #1F2937; font-size: 26px; font-weight: 700;">Siparişiniz Hazırlanıyor!</h1>
                            <p style="margin: 0 0 30px; color: #4B5563; font-size: 16px; line-height: 1.6;">Ürünleriniz özenle paketleniyor ve en kısa sürece kargoya teslim edilecektir.</p>
                            
                             <!-- Order Info -->
                             <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F9FAFB; border-radius: 12px; margin-bottom: 30px; padding: 20px;" role="presentation">
                                <tr>
                                    <td align="left" style="padding-bottom: 8px;">
                                        <span style="color: #6B7280; font-size: 13px; font-weight: 600; text-transform: uppercase;">Sipariş No</span><br>
                                        <span style="color: #111827; font-size: 16px; font-weight: 700;">#{{ORDER_ID}}</span>
                                    </td>
                                    <td align="right" style="padding-bottom: 8px;">
                                        <span style="color: #6B7280; font-size: 13px; font-weight: 600; text-transform: uppercase;">Tarih</span><br>
                                        <span style="color: #111827; font-size: 16px; font-weight: 700;">{{ORDER_DATE}}</span>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.6; text-align: center;">
                                Şıklık ve sağlık paketinize ekleniyor! ✨
                            </p>
                        </td>
                    </tr>
                    <tr><td align="center" style="background-color: #FFF8F0; padding: 20px;"><p style="margin: 0; color: #9CA3AF; font-size: 14px;">© 2026 Bravita</p></td></tr>
                </table>
                <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation"><tr><td height="40"></td></tr></table>
            </td>
        </tr>
    </table>
</body>
</html>`;
