param(
  [switch]$IncludePlaywrightArtifacts = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$targets = @()

$tempDir = [System.IO.Path]::GetTempPath()
$targets += Get-ChildItem -LiteralPath $tempDir -Filter "codex-shot-*.png" -ErrorAction SilentlyContinue

if ($IncludePlaywrightArtifacts) {
  $pwDir = Join-Path $env:USERPROFILE ".playwright-cli"
  if (Test-Path -LiteralPath $pwDir) {
    $patterns = @(
      "page-*.yml",
      "console-*.log",
      "*.png",
      "*.jpg",
      "*.jpeg",
      "*.webp",
      "*.zip",
      "*.webm"
    )
    foreach ($pattern in $patterns) {
      $targets += Get-ChildItem -LiteralPath $pwDir -Filter $pattern -ErrorAction SilentlyContinue
    }
  }
}

$unique = $targets | Sort-Object FullName -Unique
$deleted = @()
foreach ($item in $unique) {
  if ($item -and (Test-Path -LiteralPath $item.FullName)) {
    Remove-Item -LiteralPath $item.FullName -Force
    $deleted += $item.FullName
  }
}

[pscustomobject]@{
  DeletedCount = $deleted.Count
  Deleted = $deleted
} | ConvertTo-Json -Depth 3
