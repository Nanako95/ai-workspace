[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$statePath = Join-Path $env:USERPROFILE ".codex\browser-agent\session.json"

if (-not (Test-Path -LiteralPath $statePath)) {
    [ordered]@{ status = "missing"; sessionFile = $statePath } | ConvertTo-Json -Depth 3
    exit 0
}

$state = Get-Content -LiteralPath $statePath -Raw -Encoding UTF8 | ConvertFrom-Json

try {
    $version = Invoke-WebRequest -UseBasicParsing -Uri "$($state.endpoint)/json/version" -TimeoutSec 2 |
        Select-Object -ExpandProperty Content |
        ConvertFrom-Json

    [ordered]@{
        status     = "running"
        endpoint   = $state.endpoint
        port       = $state.port
        profileDir = $state.profileDir
        pid        = $state.pid
        browser    = $version.Browser
        webSocket  = $version.webSocketDebuggerUrl
    } | ConvertTo-Json -Depth 4
} catch {
    [ordered]@{
        status     = "stale"
        endpoint   = $state.endpoint
        port       = $state.port
        profileDir = $state.profileDir
        pid        = $state.pid
        error      = $_.Exception.Message
    } | ConvertTo-Json -Depth 3
}
