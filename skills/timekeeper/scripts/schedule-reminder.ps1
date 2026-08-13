[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)]
    [string]$Message,

    [int]$DelayMinutes,

    [datetime]$At,

    [string]$TaskName
)

$ErrorActionPreference = "Stop"

if ($DelayMinutes -le 0 -and -not $PSBoundParameters.ContainsKey("At")) {
    throw "Specify either -DelayMinutes greater than 0 or -At."
}

if ($DelayMinutes -gt 0 -and $PSBoundParameters.ContainsKey("At")) {
    throw "Specify only one of -DelayMinutes or -At."
}

$startAt = if ($DelayMinutes -gt 0) { (Get-Date).AddMinutes($DelayMinutes) } else { $At }
if ($startAt -le (Get-Date).AddSeconds(15)) {
    throw "Scheduled time must be at least 15 seconds in the future."
}

$taskRoot = Join-Path $env:USERPROFILE ".codex\timekeeper\reminders"

if ([string]::IsNullOrWhiteSpace($TaskName)) {
    $TaskName = "Codex-Reminder-{0}" -f (Get-Date -Format "yyyyMMdd-HHmmss")
}

$safeTaskFileName = ($TaskName -replace '[^A-Za-z0-9_.-]', '_')
$runnerPath = Join-Path $taskRoot "$safeTaskFileName.ps1"
$messagePath = Join-Path $taskRoot "$safeTaskFileName.message.txt"
$logPath = Join-Path $taskRoot "$safeTaskFileName.log"

$runner = @"
`$ErrorActionPreference = "Continue"
`$messagePath = "$messagePath"
`$logPath = "$logPath"

function Add-ReminderLog {
    param([string]`$Text)
    Add-Content -LiteralPath `$logPath -Value ("[{0}] {1}" -f (Get-Date -Format "o"), `$Text)
}

`$message = Get-Content -LiteralPath `$messagePath -Raw -Encoding UTF8
Add-ReminderLog "Showing reminder."

try {
    `$msgExe = Join-Path `$env:WINDIR "System32\msg.exe"
    if (Test-Path -LiteralPath `$msgExe) {
        & `$msgExe * /TIME:300 `$message
        Add-ReminderLog "Displayed via msg.exe."
        exit 0
    }
} catch {
    Add-ReminderLog ("msg.exe failed: " + `$_.Exception.Message)
}

try {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show(`$message, "Codex Reminder", "OK", "Information") | Out-Null
    Add-ReminderLog "Displayed via MessageBox."
    exit 0
} catch {
    Add-ReminderLog ("MessageBox failed: " + `$_.Exception.Message)
    exit 1
}
"@

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument ('-NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $runnerPath)
$trigger = New-ScheduledTaskTrigger -Once -At $startAt
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -Compatibility Win8 -StartWhenAvailable -MultipleInstances IgnoreNew

if ($PSCmdlet.ShouldProcess($TaskName, "Register local reminder for $($startAt.ToString('yyyy-MM-dd HH:mm:ss zzz'))")) {
    New-Item -ItemType Directory -Force -Path $taskRoot | Out-Null
    Set-Content -LiteralPath $messagePath -Value $Message -Encoding UTF8
    Set-Content -LiteralPath $runnerPath -Value $runner -Encoding UTF8
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Local reminder created by Codex timekeeper skill." -Force | Out-Null
}

[ordered]@{
    taskName    = $TaskName
    runAt       = $startAt.ToString("yyyy-MM-dd HH:mm:ss zzz")
    messageFile = $messagePath
    runnerFile  = $runnerPath
    logFile     = $logPath
} | ConvertTo-Json -Depth 3
