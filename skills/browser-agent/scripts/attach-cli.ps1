[CmdletBinding()]
param(
    [string]$Session = "browser-agent"
)

$ErrorActionPreference = "Stop"
$statePath = Join-Path $env:USERPROFILE ".codex\browser-agent\session.json"

if (-not (Test-Path -LiteralPath $statePath)) {
    & (Join-Path $PSScriptRoot "start-chrome.ps1") | Out-Null
}

$state = Get-Content -LiteralPath $statePath -Raw -Encoding UTF8 | ConvertFrom-Json

try {
    Invoke-WebRequest -UseBasicParsing -Uri "$($state.endpoint)/json/version" -TimeoutSec 2 | Out-Null
} catch {
    & (Join-Path $PSScriptRoot "start-chrome.ps1") | Out-Null
    $state = Get-Content -LiteralPath $statePath -Raw -Encoding UTF8 | ConvertFrom-Json
}

& npx --yes --package @playwright/cli playwright-cli "-s=$Session" attach --cdp --endpoint $state.endpoint
