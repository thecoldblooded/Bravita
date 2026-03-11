param(
    [string]$Path = "C:\Users\Umut\.codex\config.toml"
)

$ErrorActionPreference = "Stop"

if (!(Test-Path -LiteralPath $Path)) {
    throw "config not found: $Path"
}

$stamp = (Get-Date).ToString("yyyyMMdd-HHmmss")
$backup = "$Path.bak-$stamp"
Copy-Item -LiteralPath $Path -Destination $backup -Force

$content = Get-Content -LiteralPath $Path -Raw
$start = $content.IndexOf("[mcp_servers.supabase]")
if ($start -lt 0) {
    throw "supabase block not found in config: $Path"
}

# Find the next [mcp_servers.*] block after the supabase header.
$after = $content.Substring($start + 1)
$next = [regex]::Match($after, "`r?`n\[mcp_servers\.[^\]]+\]", "Singleline")
$end = if ($next.Success) { $start + 1 + $next.Index } else { $content.Length }

$block = $content.Substring($start, $end - $start)

# Token: prefer Authorization header (http mode), fallback to SUPABASE_ACCESS_TOKEN (docker mode).
$authTokenMatch = [regex]::Match($block, '"Authorization"\s*=\s*"Bearer\s+([^"]+)"', "IgnoreCase")
$envTokenMatch = [regex]::Match($block, 'SUPABASE_ACCESS_TOKEN\s*=\s*"([^"]+)"', "IgnoreCase")
$token = if ($authTokenMatch.Success) { $authTokenMatch.Groups[1].Value.Trim() } elseif ($envTokenMatch.Success) { $envTokenMatch.Groups[1].Value.Trim() } else { "" }
if (!$token) {
    throw "Could not find Supabase access token in [mcp_servers.supabase] block"
}

# project_ref: prefer MCP url, fallback to SUPABASE_URL.
$mcpUrlMatch = [regex]::Match($block, 'url\s*=\s*"(https://mcp\.supabase\.com/mcp\?[^"]+)"', "IgnoreCase")
$projectRefMatch = [regex]::Match($mcpUrlMatch.Groups[1].Value, 'project_ref=([a-z0-9]+)', "IgnoreCase")
if ($projectRefMatch.Success) {
    $projectRef = $projectRefMatch.Groups[1].Value
} else {
    $urlMatch = [regex]::Match($block, 'SUPABASE_URL\s*=\s*"([^"]+)"', "IgnoreCase")
    if (!$urlMatch.Success) {
        throw "Could not find project_ref: missing MCP url and SUPABASE_URL in [mcp_servers.supabase] block"
    }
    $supabaseUrl = $urlMatch.Groups[1].Value.Trim()
    $refMatch = [regex]::Match($supabaseUrl, 'https?://([a-z0-9]+)\.supabase\.co', "IgnoreCase")
    if (!$refMatch.Success) {
        throw "Could not parse project_ref from SUPABASE_URL: $supabaseUrl"
    }
    $projectRef = $refMatch.Groups[1].Value
}

$mcpUrl = "https://mcp.supabase.com/mcp?project_ref=$projectRef&features=docs,account,database,development,debugging,functions,branching,storage"

# Keep this section minimal; token stays in config already, but do not print it.
$newBlockLines = @(
    "[mcp_servers.supabase]",
    "url = `"$mcpUrl`"",
    # Supabase MCP requires Accept to include both JSON and SSE.
    "http_headers = { `"Authorization`" = `"Bearer $token`", `"Accept`" = `"application/json, text/event-stream`" }",
    "enabled = true",
    ""
)
$newBlockText = ($newBlockLines -join "`r`n")

$newContent = $content.Substring(0, $start) + $newBlockText + $content.Substring($end)
Set-Content -LiteralPath $Path -Value $newContent -Encoding UTF8

Write-Output "updated: $Path"
Write-Output "backup:  $backup"
Write-Output "project: $projectRef"
