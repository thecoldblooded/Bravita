param(
    [string]$ProjectRef = "xpmbnznsmsujjuwumfiw",
    [Parameter(Mandatory = $true)][string]$Id,
    [Parameter(Mandatory = $true)][string]$Token,
    [string]$Type = "order_confirmation"
)

$ErrorActionPreference = "Stop"

$fnUrl = "https://{0}.supabase.co/functions/v1/send-order-email?id={1}&token={2}&type={3}" -f `
    $ProjectRef,
[Uri]::EscapeDataString($Id),
[Uri]::EscapeDataString($Token),
[Uri]::EscapeDataString($Type)

$origins = @(
    "http://localhost:8080",
    "http://127.0.0.1:5173",
    "https://www.bravita.com.tr"
)

Write-Output ("Function URL: {0}" -f $fnUrl)

foreach ($origin in $origins) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $fnUrl -Method Get -Headers @{ Origin = $origin; Accept = "text/html" }
        $content = [string]$response.Content

        $match = [regex]::Match($content, 'https?://[^"''\s<>]+/email-preview\?[^"''\s<>]+')
        $link = if ($match.Success) { $match.Value } else { "<not-found>" }

        $expectedPrefix = "$origin/email-preview?"
        $matchesExpectedOrigin = $link.StartsWith($expectedPrefix, [System.StringComparison]::OrdinalIgnoreCase)

        Write-Output ("OK origin={0} status={1} expected_prefix={2} matches={3} link={4}" -f $origin, [int]$response.StatusCode, $expectedPrefix, $matchesExpectedOrigin, $link)
    }
    catch {
        $status = -1
        $body = ""
        $errType = ""
        $errMsg = ""
        $innerType = ""
        $innerMsg = ""

        try { $errType = $_.Exception.GetType().FullName } catch {}
        try { $errMsg = $_.Exception.Message } catch {}
        try { $innerType = $_.Exception.InnerException.GetType().FullName } catch {}
        try { $innerMsg = $_.Exception.InnerException.Message } catch {}

        if ($_.Exception.Response) {
            try { $status = [int]$_.Exception.Response.StatusCode } catch {}
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                if ($stream) {
                    $reader = New-Object System.IO.StreamReader($stream)
                    $body = $reader.ReadToEnd()
                    $reader.Dispose()
                }
            }
            catch {}
        }

        Write-Output ("FAIL origin={0} status={1} errType={2} errMsg={3} innerType={4} innerMsg={5} body={6}" -f $origin, $status, $errType, $errMsg, $innerType, $innerMsg, $body)
    }
}
