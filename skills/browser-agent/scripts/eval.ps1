[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$Script,

    [string]$TabId,

    [string]$UrlPattern
)

$ErrorActionPreference = "Stop"

function Receive-CdpMessage {
    param([System.Net.WebSockets.ClientWebSocket]$Socket)

    $memory = New-Object System.IO.MemoryStream
    do {
        $bytes = New-Object byte[] 16384
        $segment = [ArraySegment[byte]]::new($bytes)
        $result = $Socket.ReceiveAsync($segment, [System.Threading.CancellationToken]::None).Result
        if ($result.Count -gt 0) {
            $memory.Write($bytes, 0, $result.Count)
        }
    } while (-not $result.EndOfMessage)

    [System.Text.Encoding]::UTF8.GetString($memory.ToArray()) | ConvertFrom-Json
}

function Send-CdpCommand {
    param(
        [System.Net.WebSockets.ClientWebSocket]$Socket,
        [int]$Id,
        [string]$Method,
        [hashtable]$Params
    )

    $payload = @{ id = $Id; method = $Method; params = $Params } | ConvertTo-Json -Depth 20 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
    $segment = [ArraySegment[byte]]::new($bytes)
    $Socket.SendAsync($segment, [System.Net.WebSockets.WebSocketMessageType]::Text, $true, [System.Threading.CancellationToken]::None).Wait()
}

$statePath = Join-Path $env:USERPROFILE ".codex\browser-agent\session.json"
if (-not (Test-Path -LiteralPath $statePath)) {
    throw "No browser-agent session exists. Run start-chrome.ps1 first."
}

$state = Get-Content -LiteralPath $statePath -Raw -Encoding UTF8 | ConvertFrom-Json
$tabs = Invoke-WebRequest -UseBasicParsing -Uri "$($state.endpoint)/json/list" -TimeoutSec 5 |
    Select-Object -ExpandProperty Content |
    ConvertFrom-Json

$tab = $null
if ($TabId) {
    $tab = $tabs | Where-Object { $_.id -eq $TabId } | Select-Object -First 1
} elseif ($UrlPattern) {
    $tab = $tabs | Where-Object { $_.type -eq "page" -and $_.url -like $UrlPattern } | Select-Object -First 1
} else {
    $tab = $tabs | Where-Object { $_.type -eq "page" } | Select-Object -First 1
}

if (-not $tab) {
    throw "No matching browser-agent tab was found."
}

$socket = [System.Net.WebSockets.ClientWebSocket]::new()
$socket.ConnectAsync([Uri]$tab.webSocketDebuggerUrl, [System.Threading.CancellationToken]::None).Wait()

try {
    $id = 1
    Send-CdpCommand -Socket $socket -Id $id -Method "Runtime.evaluate" -Params @{
        expression    = $Script
        awaitPromise  = $true
        returnByValue = $true
        userGesture   = $true
    }

    while ($true) {
        $message = Receive-CdpMessage -Socket $socket
        if ($message.id -eq $id) {
            $message | ConvertTo-Json -Depth 20
            break
        }
    }
} finally {
    if ($socket.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
        $socket.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "done", [System.Threading.CancellationToken]::None).Wait()
    }
    $socket.Dispose()
}
