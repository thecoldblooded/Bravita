#!/bin/bash

SESSION_NAME="bravita-new"
API_KEY="owa_k1_7e0ad65a0b419e0b4fdcb6bbdf0bdf02c5bfa58f2c12e185457a7a8e294fc05e"
API_URL="http://127.0.0.1:2785/api"
QR_PATH="/var/www/bravita/qr.png"
HTML_PATH="/var/www/bravita/qr.html"

echo "Starting QR update loop in background..."

while true; do
    # Find current session ID dynamically
    SESSION_ID=$(curl -s -H "x-api-key: $API_KEY" "$API_URL/sessions" | jq -r ".[] | select(.name==\"$SESSION_NAME\") | .id" | head -n 1)

    if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" == "null" ]; then
        echo "No active session found for $SESSION_NAME. Waiting..."
        sleep 5
        continue
    fi

    # Check session status
    RESPONSE=$(curl -s -H "x-api-key: $API_KEY" "$API_URL/sessions/$SESSION_ID")
    STATUS=$(echo "$RESPONSE" | jq -r '.status')
    
    if [ "$STATUS" == "ready" ] || [ "$STATUS" == "READY" ]; then
        echo "Session is ready! Writing success HTML and exiting."
        cat << HTML_EOF > "$HTML_PATH"
<!DOCTYPE html>
<html>
<head>
    <title>WhatsApp Connected</title>
    <style>
        body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-family: Arial, sans-serif;
            background-color: #f0f2f5;
            margin: 0;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
        }
        h2 {
            color: #075e54;
            margin-top: 0;
        }
        .success-icon {
            font-size: 48px;
            color: #25d366;
            margin: 20px 0;
        }
        .reset-btn {
            margin-top: 20px;
            padding: 10px 20px;
            background-color: #d9534f;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            transition: background 0.3s;
        }
        .reset-btn:hover {
            background-color: #c9302c;
        }
        .reset-btn:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div id="auth-loading" style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
        <h3>Kimlik doğrulaması kontrol ediliyor...</h3>
    </div>

    <div id="main-content" class="container" style="display: none;">
        <h2>WhatsApp connected!</h2>
        <div class="success-icon">✓</div>
        <p>Session <strong>$SESSION_NAME</strong> is active and connected.</p>
        <p style="font-size: 12px; color: #666;">You can close this tab now.</p>
        <button id="reset-btn" class="reset-btn">Yeni QR Oluştur (Oturumu Sıfırla)</button>
    </div>

    <script src="/supabase-js.js"></script>
    <script>
        (async () => {
            if (sessionStorage.getItem('is_superadmin') === 'true') {
                document.getElementById('auth-loading').style.display = 'none';
                document.getElementById('main-content').style.display = 'block';
                setupResetListener();
                return;
            }

            const supabaseUrl = 'https://xpmbnznsmsujjuwumfiw.supabase.co';
            const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwbWJuem5zbXN1amp1d3VtZml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NTcxODAsImV4cCI6MjA4NDAzMzE4MH0.90vGineFlNuSJ10hMD_lWHnc6DCUgWQZubfR-X_0tO4';
            const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                document.getElementById('auth-loading').innerHTML = '<h3 style="color: red;">Oturum bulunamadı. Ana sayfaya yönlendiriliyorsunuz...</h3>';
                setTimeout(() => window.location.href = '/', 2000);
                return;
            }

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('is_superadmin')
                .eq('id', session.user.id)
                .single();

            if (error || !profile?.is_superadmin) {
                document.getElementById('auth-loading').innerHTML = '<h3 style="color: red;">Yetkisiz Erişim. Bu sayfayı yalnızca Süper Adminler görebilir.</h3>';
                setTimeout(() => window.location.href = '/', 3000);
                return;
            }

            sessionStorage.setItem('is_superadmin', 'true');
            document.getElementById('auth-loading').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';
            setupResetListener();

            function setupResetListener() {
                const resetBtn = document.getElementById('reset-btn');
                if (!resetBtn || resetBtn.dataset.listenerAttached) return;
                resetBtn.dataset.listenerAttached = 'true';
                resetBtn.addEventListener('click', async () => {
                    if (!confirm('WhatsApp oturumunu sıfırlayıp yeni QR kod üretmek istediğinize emin misiniz?')) return;
                    resetBtn.disabled = true;
                    resetBtn.innerText = 'Sıfırlanıyor...';
                    try {
                        const res = await fetch('/api/auth/reset-whatsapp-session', { method: 'POST' });
                        const data = await res.json();
                        if (data.success) {
                            alert(data.message);
                            window.location.reload();
                        } else {
                            alert('Hata: ' + (data.error || 'Bilinmeyen bir hata.'));
                            resetBtn.disabled = false;
                            resetBtn.innerText = 'Yeni QR Oluştur (Oturumu Sıfırla)';
                        }
                    } catch (err) {
                        alert('Bağlantı hatası: ' + err.message);
                        resetBtn.disabled = false;
                        resetBtn.innerText = 'Yeni QR Oluştur (Oturumu Sıfırla)';
                    }
                });
            }
        })();
    </script>
</body>
</html>
HTML_EOF
        sleep 15
    elif [ "$STATUS" == "failed" ] || [ "$STATUS" == "FAILED" ]; then
        echo "Session failed. Writing failed HTML and waiting..."
        cat << HTML_EOF > "$HTML_PATH"
<!DOCTYPE html>
<html>
<head>
    <title>WhatsApp Connection Failed</title>
    <style>
        body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-family: Arial, sans-serif;
            background-color: #f0f2f5;
            margin: 0;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
        }
        h2 {
            color: #d9534f;
            margin-top: 0;
        }
        .error-icon {
            font-size: 48px;
            color: #d9534f;
            margin: 20px 0;
        }
        .reset-btn {
            margin-top: 20px;
            padding: 10px 20px;
            background-color: #d9534f;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            transition: background 0.3s;
        }
        .reset-btn:hover {
            background-color: #c9302c;
        }
        .reset-btn:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div id="auth-loading" style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
        <h3>Kimlik doğrulaması kontrol ediliyor...</h3>
    </div>

    <div id="main-content" class="container" style="display: none;">
        <h2>WhatsApp Bağlantısı Başarısız</h2>
        <div class="error-icon">✗</div>
        <p>WhatsApp oturumu başlatılamadı veya bağlantı koptu.</p>
        <p style="font-size: 12px; color: #666;">Yeniden bağlanmak için aşağıdaki butona tıklayarak yeni bir QR kod üretebilirsiniz.</p>
        <button id="reset-btn" class="reset-btn">Yeni QR Oluştur (Sıfırla)</button>
    </div>

    <script src="/supabase-js.js"></script>
    <script>
        (async () => {
            if (sessionStorage.getItem('is_superadmin') === 'true') {
                document.getElementById('auth-loading').style.display = 'none';
                document.getElementById('main-content').style.display = 'block';
                setupResetListener();
                return;
            }

            const supabaseUrl = 'https://xpmbnznsmsujjuwumfiw.supabase.co';
            const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwbWJuem5zbXN1amp1d3VtZml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NTcxODAsImV4cCI6MjA4NDAzMzE4MH0.90vGineFlNuSJ10hMD_lWHnc6DCUgWQZubfR-X_0tO4';
            const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                document.getElementById('auth-loading').innerHTML = '<h3 style="color: red;">Oturum bulunamadı. Ana sayfaya yönlendiriliyorsunuz...</h3>';
                setTimeout(() => window.location.href = '/', 2000);
                return;
            }

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('is_superadmin')
                .eq('id', session.user.id)
                .single();

            if (error || !profile?.is_superadmin) {
                document.getElementById('auth-loading').innerHTML = '<h3 style="color: red;">Yetkisiz Erişim. Bu sayfayı yalnızca Süper Adminler görebilir.</h3>';
                setTimeout(() => window.location.href = '/', 3000);
                return;
            }

            sessionStorage.setItem('is_superadmin', 'true');
            document.getElementById('auth-loading').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';
            setupResetListener();

            function setupResetListener() {
                const resetBtn = document.getElementById('reset-btn');
                if (!resetBtn || resetBtn.dataset.listenerAttached) return;
                resetBtn.dataset.listenerAttached = 'true';
                resetBtn.addEventListener('click', async () => {
                    if (!confirm('WhatsApp oturumunu sıfırlayıp yeni QR kod üretmek istediğinize emin misiniz?')) return;
                    resetBtn.disabled = true;
                    resetBtn.innerText = 'Sıfırlanıyor...';
                    try {
                        const res = await fetch('/api/auth/reset-whatsapp-session', { method: 'POST' });
                        const data = await res.json();
                        if (data.success) {
                            alert(data.message);
                            window.location.reload();
                        } else {
                            alert('Hata: ' + (data.error || 'Bilinmeyen bir hata.'));
                            resetBtn.disabled = false;
                            resetBtn.innerText = 'Yeni QR Oluştur (Sıfırla)';
                        }
                    } catch (err) {
                        alert('Bağlantı hatası: ' + err.message);
                        resetBtn.disabled = false;
                        resetBtn.innerText = 'Yeni QR Oluştur (Sıfırla)';
                    }
                });
            }
        })();
    </script>
</body>
</html>
HTML_EOF
        sleep 15
    elif [ "$STATUS" == "qr_ready" ] || [ "$STATUS" == "QR_READY" ]; then
        # Fetch QR
        QR_RESP=$(curl -s -H "x-api-key: $API_KEY" "$API_URL/sessions/$SESSION_ID/qr")
        QR_DATA=$(echo "$QR_RESP" | jq -r '.qrCode')
        
        if [ ! -z "$QR_DATA" ] && [ "$QR_DATA" != "null" ]; then
            # Generate base64 data URL
            docker exec -e "QR_RAW=$QR_DATA" openwa-api node -e "const qrcode = require('qrcode'); qrcode.toDataURL(process.env.QR_RAW).then(url => require('fs').writeFileSync('/app/data/qr.txt', url));"
            
            # Read from volume
            QR_DATA_URL=$(cat /var/lib/docker/volumes/openwa_openwa-data/_data/qr.txt)
            
            # Decode to PNG
            BASE64_DATA=$(echo "$QR_DATA_URL" | sed 's/^data:image\/png;base64,//')
            echo "$BASE64_DATA" | base64 -d > "$QR_PATH"
            
            # Write HTML page
            cat << HTML_EOF > "$HTML_PATH"
<!DOCTYPE html>
<html>
<head>
    <title>WhatsApp QR Code</title>
    <meta http-equiv="refresh" content="5">
    <style>
        body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            font-family: Arial, sans-serif;
            background-color: #f0f2f5;
            margin: 0;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
        }
        img {
            width: 250px;
            height: 250px;
            margin: 20px 0;
            border: 1px solid #ddd;
            padding: 5px;
            background: white;
        }
        h2 {
            color: #075e54;
            margin-top: 0;
        }
        .status {
            font-weight: bold;
            color: #075e54;
        }
        .reset-btn {
            margin-top: 20px;
            padding: 10px 20px;
            background-color: #d9534f;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            transition: background 0.3s;
        }
        .reset-btn:hover {
            background-color: #c9302c;
        }
        .reset-btn:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
    </style>
</head>
<body>
    <div id="auth-loading" style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
        <h3>Kimlik doğrulaması kontrol ediliyor...</h3>
    </div>

    <div id="main-content" class="container" style="display: none;">
        <h2>Bravita WhatsApp Login</h2>
        <p>Scan this QR code with your phone to connect.</p>
        <img src="qr.png?t=\$(date +%s)" alt="WhatsApp QR">
        <p>Oturum Adı: <span class="status">$SESSION_NAME</span></p>
        <p style="font-size: 12px; color: #666;">Last updated: \$(date)</p>
        <p style="font-size: 11px; color: #999;">This page auto-refreshes every 5 seconds.</p>
        <button id="reset-btn" class="reset-btn">Yeni QR Oluştur (Oturumu Sıfırla)</button>
    </div>

    <script src="/supabase-js.js"></script>
    <script>
        (async () => {
            if (sessionStorage.getItem('is_superadmin') === 'true') {
                document.getElementById('auth-loading').style.display = 'none';
                document.getElementById('main-content').style.display = 'block';
                setupResetListener();
                return;
            }

            const supabaseUrl = 'https://xpmbnznsmsujjuwumfiw.supabase.co';
            const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwbWJuem5zbXN1amp1d3VtZml3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NTcxODAsImV4cCI6MjA4NDAzMzE4MH0.90vGineFlNuSJ10hMD_lWHnc6DCUgWQZubfR-X_0tO4';
            const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                document.getElementById('auth-loading').innerHTML = '<h3 style="color: red;">Oturum bulunamadı. Ana sayfaya yönlendiriliyorsunuz...</h3>';
                setTimeout(() => window.location.href = '/', 2000);
                return;
            }

            const { data: profile, error } = await supabase
                .from('profiles')
                .select('is_superadmin')
                .eq('id', session.user.id)
                .single();

            if (error || !profile?.is_superadmin) {
                document.getElementById('auth-loading').innerHTML = '<h3 style="color: red;">Yetkisiz Erişim. Bu sayfayı yalnızca Süper Adminler görebilir.</h3>';
                setTimeout(() => window.location.href = '/', 3000);
                return;
            }

            sessionStorage.setItem('is_superadmin', 'true');
            document.getElementById('auth-loading').style.display = 'none';
            document.getElementById('main-content').style.display = 'block';
            setupResetListener();

            function setupResetListener() {
                const resetBtn = document.getElementById('reset-btn');
                if (!resetBtn || resetBtn.dataset.listenerAttached) return;
                resetBtn.dataset.listenerAttached = 'true';
                resetBtn.addEventListener('click', async () => {
                    if (!confirm('WhatsApp oturumunu sıfırlayıp yeni QR kod üretmek istediğinize emin misiniz?')) return;
                    resetBtn.disabled = true;
                    resetBtn.innerText = 'Sıfırlanıyor...';
                    try {
                        const res = await fetch('/api/auth/reset-whatsapp-session', { method: 'POST' });
                        const data = await res.json();
                        if (data.success) {
                            alert(data.message);
                            window.location.reload();
                        } else {
                            alert('Hata: ' + (data.error || 'Bilinmeyen bir hata.'));
                            resetBtn.disabled = false;
                            resetBtn.innerText = 'Yeni QR Oluştur (Oturumu Sıfırla)';
                        }
                    } catch (err) {
                        alert('Bağlantı hatası: ' + err.message);
                        resetBtn.disabled = false;
                        resetBtn.innerText = 'Yeni QR Oluştur (Oturumu Sıfırla)';
                    }
                });
            }
        })();
    </script>
</body>
</html>
HTML_EOF
        fi
    fi
    sleep 4
done
