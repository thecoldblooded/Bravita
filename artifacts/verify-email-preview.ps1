param(
    [string]$ProjectRef = "xpmbnznsmsujjuwumfiw",
    [string]$OrderId = "e3eb0b42-7ad3-46ac-ac40-70384f5f0f6d",
    [string]$TicketId = "5fa8b934-439c-4cb2-9f5d-25e747c9c272",
    [string]$ProfileId = "92686e1b-4c23-44c7-b847-05ac2d7e2878"
)

$ErrorActionPreference = "Stop"

function New-PreviewToken {
    param(
        [string]$Id,
        [string]$Secret
    )

    $expiration = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() + 604800000
    $data = "{0}:{1}" -f $Id, $expiration

    $hmac = [System.Security.Cryptography.HMACSHA256]::new([Text.Encoding]::UTF8.GetBytes($Secret))
    try {
        $hashBytes = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($data))
    }
    finally {
        $hmac.Dispose()
    }

    $signature = ([BitConverter]::ToString($hashBytes) -replace "-", "").ToLowerInvariant()
    return "{0}.{1}" -f $expiration, $signature
}

function Test-Url {
    param(
        [string]$Name,
        [string]$Url,
        [bool]$ExpectSpaShell = $false
    )

    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -Headers @{ Accept = "text/html" }
        $contentType = if ($response.Headers["Content-Type"]) { $response.Headers["Content-Type"] } else { "" }

        if ($ExpectSpaShell) {
            $hasRoot = $response.Content -match 'id="root"'
            Write-Output ("OK {0} | status={1} | content-type={2} | has-root={3}" -f $Name, [int]$response.StatusCode, $contentType, $hasRoot)
        }
        else {
            Write-Output ("OK {0} | status={1} | content-type={2} | body-len={3}" -f $Name, [int]$response.StatusCode, $contentType, $response.Content.Length)
        }
    }
    catch {
        $status = -1
        $contentType = ""
        if ($_.Exception.Response) {
            try { $status = [int]$_.Exception.Response.StatusCode } catch {}
            try { $contentType = $_.Exception.Response.Headers["Content-Type"] } catch {}
        }

        Write-Output ("FAIL {0} | status={1} | content-type={2}" -f $Name, $status, $contentType)
    }
}

$keysRaw = npx supabase projects api-keys --project-ref $ProjectRef | Out-String
$serviceLine = ($keysRaw -split "`r?`n" | Where-Object { $_ -match "service_role" } | Select-Object -First 1)
if (-not $serviceLine) {
    throw "service_role key not found"
}

$serviceRoleKey = (($serviceLine -split "\|")[1]).Trim()
if ([string]::IsNullOrWhiteSpace($serviceRoleKey)) {
    throw "service_role key parse failed"
}

$orderToken = New-PreviewToken -Id $OrderId -Secret $serviceRoleKey
$supportToken = New-PreviewToken -Id $TicketId -Secret $serviceRoleKey
$welcomeToken = New-PreviewToken -Id $ProfileId -Secret $serviceRoleKey

$fnBase = "https://{0}.supabase.co/functions/v1" -f $ProjectRef
$siteBase = "https://www.bravita.com.tr/email-preview"

$orderFnUrl = "{0}/send-order-email?id={1}&token={2}&type=order_confirmation" -f $fnBase, [Uri]::EscapeDataString($OrderId), [Uri]::EscapeDataString($orderToken)
$supportFnUrl = "{0}/send-support-email?id={1}&token={2}&type=ticket_created" -f $fnBase, [Uri]::EscapeDataString($TicketId), [Uri]::EscapeDataString($supportToken)
$welcomeFnUrl = "{0}/send-welcome-email?id={1}&token={2}" -f $fnBase, [Uri]::EscapeDataString($ProfileId), [Uri]::EscapeDataString($welcomeToken)

$orderFrontUrl = "{0}?kind=order&id={1}&token={2}&type=order_confirmation" -f $siteBase, [Uri]::EscapeDataString($OrderId), [Uri]::EscapeDataString($orderToken)
$supportFrontUrl = "{0}?kind=support&id={1}&token={2}&type=ticket_created" -f $siteBase, [Uri]::EscapeDataString($TicketId), [Uri]::EscapeDataString($supportToken)
$welcomeFrontUrl = "{0}?kind=welcome&id={1}&token={2}" -f $siteBase, [Uri]::EscapeDataString($ProfileId), [Uri]::EscapeDataString($welcomeToken)

Write-Output "=== Direct Function GET checks ==="
Test-Url -Name "send-order-email" -Url $orderFnUrl
Test-Url -Name "send-support-email" -Url $supportFnUrl
Test-Url -Name "send-welcome-email" -Url $welcomeFnUrl

Write-Output "=== Frontend Route shell checks ==="
Test-Url -Name "email-preview order" -Url $orderFrontUrl -ExpectSpaShell $true
Test-Url -Name "email-preview support" -Url $supportFrontUrl -ExpectSpaShell $true
Test-Url -Name "email-preview welcome" -Url $welcomeFrontUrl -ExpectSpaShell $true

Write-Output "=== Frontend preview URLs (manual browser check) ==="
Write-Output ("ORDER_FRONT={0}" -f $orderFrontUrl)
Write-Output ("SUPPORT_FRONT={0}" -f $supportFrontUrl)
Write-Output ("WELCOME_FRONT={0}" -f $welcomeFrontUrl)
