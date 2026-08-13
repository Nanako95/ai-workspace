[CmdletBinding()]
param(
    [string]$Url = "about:blank",
    [string]$ProfileDir = (Join-Path $env:USERPROFILE ".codex\browser-agent\chrome-profile"),
    [int]$Port = 0,
    [int]$WaitSeconds = 20,
    [switch]$Visible
)

$ErrorActionPreference = "Stop"

function Get-BrowserPath {
    $candidates = @(
        "C:\Program Files\Google\Chrome\Application\chrome.exe",
        "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    )

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            return $candidate
        }
    }

    throw "Chrome or Edge executable was not found."
}

function Test-CdpEndpoint {
    param([string]$Endpoint)

    if ([string]::IsNullOrWhiteSpace($Endpoint)) {
        return $false
    }

    try {
        Invoke-WebRequest -UseBasicParsing -Uri "$Endpoint/json/version" -TimeoutSec 2 | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Read-JsonFile {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    try {
        return Get-Content -LiteralPath $Path -Raw -Encoding UTF8 | ConvertFrom-Json
    } catch {
        return $null
    }
}

$stateRoot = Join-Path $env:USERPROFILE ".codex\browser-agent"
$statePath = Join-Path $stateRoot "session.json"
$existing = Read-JsonFile -Path $statePath

if ($existing -and (Test-CdpEndpoint -Endpoint $existing.endpoint)) {
    [ordered]@{
        status     = "reused"
        endpoint   = $existing.endpoint
        port       = $existing.port
        profileDir = $existing.profileDir
        pid        = $existing.pid
        session    = "browser-agent"
    } | ConvertTo-Json -Depth 3
    exit 0
}

New-Item -ItemType Directory -Force -Path $stateRoot | Out-Null
New-Item -ItemType Directory -Force -Path $ProfileDir | Out-Null

$activePortPath = Join-Path $ProfileDir "DevToolsActivePort"
if (Test-Path -LiteralPath $activePortPath) {
    Remove-Item -LiteralPath $activePortPath -Force
}

$browserPath = Get-BrowserPath
$args = @(
    "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=$Port",
    "--remote-allow-origins=*",
    "--user-data-dir=$ProfileDir",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-mode",
    "--new-window",
    $Url
)

$startParams = @{
    FilePath     = $browserPath
    ArgumentList = $args
    PassThru     = $true
}

if (-not $Visible) {
    $startParams.WindowStyle = "Minimized"
}

$process = Start-Process @startParams
$deadline = (Get-Date).AddSeconds($WaitSeconds)
$endpoint = $null
$actualPort = $null

while ((Get-Date) -lt $deadline) {
    if ($Port -gt 0) {
        $candidateEndpoint = "http://127.0.0.1:$Port"
        if (Test-CdpEndpoint -Endpoint $candidateEndpoint) {
            $endpoint = $candidateEndpoint
            $actualPort = $Port
            break
        }
    } elseif (Test-Path -LiteralPath $activePortPath) {
        $lines = Get-Content -LiteralPath $activePortPath -ErrorAction SilentlyContinue
        if ($lines.Count -ge 1) {
            $parsedPort = 0
            if ([int]::TryParse($lines[0], [ref]$parsedPort)) {
                $candidateEndpoint = "http://127.0.0.1:$parsedPort"
                if (Test-CdpEndpoint -Endpoint $candidateEndpoint) {
                    $endpoint = $candidateEndpoint
                    $actualPort = $parsedPort
                    break
                }
            }
        }
    }

    Start-Sleep -Milliseconds 300
}

if (-not $endpoint) {
    throw "Chrome started but no CDP endpoint became available within $WaitSeconds seconds. Profile: $ProfileDir"
}

$state = [ordered]@{
    endpoint   = $endpoint
    port       = $actualPort
    profileDir = (Resolve-Path -LiteralPath $ProfileDir).Path
    pid        = $process.Id
    browser    = $browserPath
    startedAt  = (Get-Date).ToString("o")
}

$state | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $statePath -Encoding UTF8

[ordered]@{
    status     = "started"
    endpoint   = $endpoint
    port       = $actualPort
    profileDir = $state.profileDir
    pid        = $process.Id
    session    = "browser-agent"
} | ConvertTo-Json -Depth 3
