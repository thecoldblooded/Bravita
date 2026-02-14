param(
    [string]$ProjectRef = "xpmbnznsmsujjuwumfiw",
    [string[]]$Functions = @("bakiyem-init-3d", "bakiyem-tokenize-card")
)

$ErrorActionPreference = "Stop"

function Clear-ProxyEnv {
    $env:HTTP_PROXY = ""
    $env:HTTPS_PROXY = ""
    $env:ALL_PROXY = ""
    $env:http_proxy = ""
    $env:https_proxy = ""
    $env:all_proxy = ""
}

function Get-SupabaseAccessTokenFromCodexConfig {
    $path = "C:\Users\Umut\.codex\config.toml"
    if (!(Test-Path -LiteralPath $path)) {
        throw "Codex config not found: $path"
    }
    $raw = Get-Content -LiteralPath $path -Raw

    # Prefer http_headers Authorization token.
    $m = [regex]::Match($raw, '"Authorization"\s*=\s*"Bearer\s+([^"]+)"', "IgnoreCase")
    if ($m.Success) {
        return $m.Groups[1].Value.Trim()
    }

    # Fallback: SUPABASE_ACCESS_TOKEN env field.
    $m2 = [regex]::Match($raw, 'SUPABASE_ACCESS_TOKEN\s*=\s*"([^"]+)"', "IgnoreCase")
    if ($m2.Success) {
        return $m2.Groups[1].Value.Trim()
    }

    throw "Supabase access token not found in $path"
}

Clear-ProxyEnv
$env:SUPABASE_ACCESS_TOKEN = Get-SupabaseAccessTokenFromCodexConfig

foreach ($fn in $Functions) {
    if ([string]::IsNullOrWhiteSpace($fn)) { continue }
    Write-Output "Deploying function: $fn"
    npx supabase functions deploy $fn --project-ref $ProjectRef --use-api
}

