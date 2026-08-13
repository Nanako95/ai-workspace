[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)]
    [string]$Prompt,

    [int]$DelayMinutes,

    [datetime]$At,

    [string]$TaskName,

    [string]$WorkDir = (Get-Location).Path,

    [ValidateSet("workspace-write", "read-only")]
    [string]$Sandbox = "workspace-write"
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

$codex = Get-Command codex -ErrorAction Stop
$codexPath = $codex.Source
$resolvedWorkDir = (Resolve-Path -LiteralPath $WorkDir).Path
$taskRoot = Join-Path $env:USERPROFILE ".codex\timekeeper\tasks"

if ([string]::IsNullOrWhiteSpace($TaskName)) {
    $TaskName = "Codex-Timekeeper-{0}" -f (Get-Date -Format "yyyyMMdd-HHmmss")
}

$safeTaskFileName = ($TaskName -replace '[^A-Za-z0-9_.-]', '_')
$runnerPath = Join-Path $taskRoot "$safeTaskFileName.ps1"
$promptPath = Join-Path $taskRoot "$safeTaskFileName.prompt.txt"
$logPath = Join-Path $taskRoot "$safeTaskFileName.log"

$runner = @"
`$ErrorActionPreference = "Stop"
`$codexPath = "$codexPath"
`$logPath = "$logPath"
`$promptPath = "$promptPath"
`$workDir = "$resolvedWorkDir"
`$sandbox = "$Sandbox"

function Add-TaskLog {
    param([string]`$Message)
    Add-Content -LiteralPath `$logPath -Value ("[{0}] {1}" -f (Get-Date -Format "o"), `$Message)
}

Add-TaskLog "Starting scheduled Codex callback."
Push-Location -LiteralPath `$workDir
try {
    `$prompt = Get-Content -LiteralPath `$promptPath -Raw
    & `$codexPath --ask-for-approval never exec --cd `$workDir --sandbox `$sandbox --skip-git-repo-check `$prompt *>&1 |
        Tee-Object -FilePath `$logPath -Append
    `$exitCode = `$LASTEXITCODE
    Add-TaskLog "Codex exited with code `$exitCode."
    exit `$exitCode
} catch {
    Add-TaskLog ("Failed: " + `$_.Exception.Message)
    exit 1
} finally {
    Pop-Location
}
"@

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument ('-NoProfile -ExecutionPolicy Bypass -File "{0}"' -f $runnerPath)
$trigger = New-ScheduledTaskTrigger -Once -At $startAt
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -Compatibility Win8 -StartWhenAvailable -MultipleInstances IgnoreNew

if ($PSCmdlet.ShouldProcess($TaskName, "Register scheduled Codex callback for $($startAt.ToString('yyyy-MM-dd HH:mm:ss zzz'))")) {
    New-Item -ItemType Directory -Force -Path $taskRoot | Out-Null
    Set-Content -LiteralPath $promptPath -Value $Prompt -Encoding UTF8
    Set-Content -LiteralPath $runnerPath -Value $runner -Encoding UTF8
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Codex delayed callback created by timekeeper skill." -Force | Out-Null
}

[ordered]@{
    taskName   = $TaskName
    runAt      = $startAt.ToString("yyyy-MM-dd HH:mm:ss zzz")
    workDir    = $resolvedWorkDir
    promptFile = $promptPath
    runnerFile = $runnerPath
    logFile    = $logPath
} | ConvertTo-Json -Depth 3
