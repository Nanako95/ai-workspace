[CmdletBinding()]
param(
    [switch]$Json
)

$now = Get-Date
$utc = $now.ToUniversalTime()
$tz = [System.TimeZoneInfo]::Local
$offset = $tz.GetUtcOffset($now)

$data = [ordered]@{
    local       = $now.ToString("yyyy-MM-dd HH:mm:ss zzz")
    localIso    = $now.ToString("o")
    utc         = $utc.ToString("yyyy-MM-dd HH:mm:ss 'UTC'")
    utcIso      = $utc.ToString("o")
    timezoneId  = $tz.Id
    displayName = $tz.DisplayName
    offset      = ("{0}{1:00}:{2:00}" -f $(if ($offset.Ticks -lt 0) { "-" } else { "+" }), [Math]::Abs($offset.Hours), [Math]::Abs($offset.Minutes))
}

if ($Json) {
    $data | ConvertTo-Json -Depth 3
} else {
    "{0} ({1})" -f $data.local, $data.timezoneId
}
