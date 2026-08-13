param(
    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [Parameter(Mandatory = $true)]
    [string]$Summary,

    [string]$Target = ".",

    [switch]$DryRun,

    [switch]$AllowUnrelatedChanges
)

$ErrorActionPreference = "Stop"
if ($null -ne (Get-Variable PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue)) {
    $PSNativeCommandUseErrorActionPreference = $false
}

function Invoke-Git {
    param([Parameter(Mandatory = $true)][string[]]$Arguments)
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = & git -C $RepoRoot @Arguments 2>&1
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousPreference
    if ($exitCode -ne 0) {
        throw "git $($Arguments -join ' ') failed:`n$($output -join "`n")"
    }
    return @($output)
}

if (-not (Test-Path -LiteralPath $RepoRoot -PathType Container)) {
    throw "Repository path does not exist: $RepoRoot"
}
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path

$gitRoot = (Invoke-Git @("rev-parse", "--show-toplevel") | Select-Object -First 1).Trim()
if ([IO.Path]::GetFullPath($gitRoot) -ne [IO.Path]::GetFullPath($RepoRoot)) {
    throw "RepoRoot is not the repository root. Expected: $gitRoot"
}

$branch = (Invoke-Git @("branch", "--show-current") | Select-Object -First 1).Trim()
if ([string]::IsNullOrWhiteSpace($branch)) {
    throw "The repository is in a detached HEAD state. Check out a branch before publishing."
}

$remote = (Invoke-Git @("remote", "get-url", "origin") | Select-Object -First 1).Trim()
if ([string]::IsNullOrWhiteSpace($remote)) {
    throw "The repository has no origin remote. Add the intended GitHub remote before publishing."
}

$status = @(Invoke-Git @("status", "--porcelain"))
$changed = @($status | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | ForEach-Object {
    $line = $_.ToString()
    if ($line.Length -gt 3) { $line.Substring(3).Trim('"') } else { $line.Trim() }
})

$sensitivePattern = '(?i)(^|[\\/])\.env([^\\/]*$)|(^|[\\/])(id_rsa|credentials?|secrets?)([._-]|$)|\.(pem|key|p12|pfx)$|(^|[\\/])(node_modules|\.cache|\.codex|coverage|dist)([\\/]|$)'
$sensitive = @($changed | Where-Object { $_ -match $sensitivePattern })
if ($sensitive.Count -gt 0) {
    throw "Refusing to publish sensitive or generated paths:`n$($sensitive -join "`n")"
}

$targetPath = $Target.Replace('/', '\').Trim()
if ([string]::IsNullOrWhiteSpace($targetPath)) { $targetPath = "." }
if ($targetPath -ne "." -and ($targetPath -match '(^|[\\/])\.\.?([\\/]|$)' -or $targetPath.StartsWith('..'))) {
    throw "Target must stay inside the repository: $Target"
}

$targetChanged = @($changed | Where-Object {
    $normalized = $_.Replace('/', '\')
    $targetPath -eq "." -or $normalized -eq $targetPath -or $normalized.StartsWith("$targetPath\")
})
$unrelated = @($changed | Where-Object { $targetChanged -notcontains $_ })
if ($unrelated.Count -gt 0 -and -not $AllowUnrelatedChanges -and -not $DryRun) {
    throw "Unrelated working-tree changes detected. Review or pass -AllowUnrelatedChanges only with explicit user approval:`n$($unrelated -join "`n")"
}

if ($DryRun) {
    [pscustomobject]@{
        Branch = $branch
        Remote = $remote
        Target = $targetPath
        Changed = $changed
        PlannedSummary = $Summary
        Action = "No files changed; no commit or push performed"
    } | ConvertTo-Json -Depth 4
    exit 0
}

Invoke-Git @("fetch", "origin", $branch) | Out-Null
$remoteRef = "origin/$branch"
$remoteExists = $true
try { Invoke-Git @("show-ref", "--verify", "--quiet", "refs/remotes/$remoteRef") | Out-Null }
catch { $remoteExists = $false }
if ($remoteExists) {
    $counts = ((Invoke-Git @("rev-list", "--left-right", "--count", "HEAD...$remoteRef")) | Select-Object -First 1).Trim() -split '\s+'
    if ([int]$counts[1] -gt 0) {
        throw "Remote branch $remoteRef is ahead by $($counts[1]) commit(s). Pull/reconcile it before publishing."
    }
}

$changeLog = Join-Path $RepoRoot "CHANGELOG.md"
$today = Get-Date -Format "yyyy-MM-dd"
$fileLines = if ($targetChanged.Count -gt 0) { ($targetChanged | ForEach-Object { "- " + $_ }) -join [Environment]::NewLine } else { "- No tracked file changes were present before the changelog update." }
$entry = @"
## $today - $Summary
- Target: $targetPath
- Changed paths:
$fileLines
- Validation: git diff --check plus the project-specific checks reported by the AI.

"@
if (Test-Path -LiteralPath $changeLog) {
    $existing = Get-Content -LiteralPath $changeLog -Raw -Encoding utf8
    Set-Content -LiteralPath $changeLog -Value ($existing.TrimEnd() + [Environment]::NewLine + [Environment]::NewLine + $entry.Trim() + [Environment]::NewLine) -Encoding utf8
} else {
    Set-Content -LiteralPath $changeLog -Value ("# Change Log" + [Environment]::NewLine + [Environment]::NewLine + $entry) -Encoding utf8
}

Invoke-Git @("diff", "--check") | Out-Null
Invoke-Git @("add", "--", $targetPath) | Out-Null
if ($targetPath -ne ".") { Invoke-Git @("add", "--", "CHANGELOG.md") | Out-Null }

$staged = @(Invoke-Git @("diff", "--cached", "--name-only"))
if ($staged.Count -eq 0) {
    throw "Nothing is staged for publication. Check Target and the local diff."
}

$commitMessage = "Update: $Summary"
Invoke-Git @("commit", "-m", $commitMessage) | Out-Null
$commit = (Invoke-Git @("rev-parse", "HEAD") | Select-Object -First 1).Trim()
Invoke-Git @("push", "origin", $branch) | Out-Null
$remoteCommit = (Invoke-Git @("ls-remote", "origin", "refs/heads/$branch") | Select-Object -First 1).ToString().Split("`t")[0]
if ($remoteCommit -ne $commit) {
    throw "Push completed but remote verification failed. Local: $commit; remote: $remoteCommit"
}

[pscustomobject]@{
    Branch = $branch
    Commit = $commit
    Remote = $remote
    Target = $targetPath
    PublishedPaths = $staged
    GitHub = $remote
} | ConvertTo-Json -Depth 4
