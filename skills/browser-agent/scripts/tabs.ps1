[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$statePath = Join-Path $env:USERPROFILE ".codex\browser-agent\session.json"

if (-not (Test-Path -LiteralPath $statePath)) {
    throw "No browser-agent session exists. Run start-chrome.ps1 first."
}

$state = Get-Content -LiteralPath $statePath -Raw -Encoding UTF8 | ConvertFrom-Json
$tabs = Invoke-WebRequest -UseBasicParsing -Uri "$($state.endpoint)/json/list" -TimeoutSec 5 |
    Select-Object -ExpandProperty Content |
    ConvertFrom-Json

$tabs |
    Where-Object { $_.type -eq "page" } |
    Select-Object id,title,url,type,webSocketDebuggerUrl |
    ConvertTo-Json -Depth 4
