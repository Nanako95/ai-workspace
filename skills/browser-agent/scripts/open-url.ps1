[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$Url
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

$encodedUrl = [System.Uri]::EscapeDataString($Url)

try {
    $response = Invoke-WebRequest -UseBasicParsing -Method Put -Uri "$($state.endpoint)/json/new?$encodedUrl" -TimeoutSec 10
} catch {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "$($state.endpoint)/json/new?$encodedUrl" -TimeoutSec 10
}

$tab = $response.Content | ConvertFrom-Json

try {
    Invoke-WebRequest -UseBasicParsing -Method Put -Uri "$($state.endpoint)/json/activate/$($tab.id)" -TimeoutSec 5 | Out-Null
} catch {
}

[ordered]@{
    status   = "opened"
    endpoint = $state.endpoint
    id       = $tab.id
    title    = $tab.title
    url      = $tab.url
    type     = $tab.type
} | ConvertTo-Json -Depth 4
