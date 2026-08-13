param(
  [Parameter(Mandatory = $true)]
  [string]$Path,

  [Parameter(Mandatory = $true)]
  [int]$RowNumber,

  [int]$TemplateNameColumn = 2,
  [int]$TextColumn = 3,
  [string]$SheetName
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-EntryText {
  param(
    [System.IO.Compression.ZipArchive]$Zip,
    [string]$Name
  )

  $entry = $Zip.GetEntry($Name)
  if (-not $entry) {
    return $null
  }

  $reader = New-Object System.IO.StreamReader($entry.Open())
  try {
    return $reader.ReadToEnd()
  } finally {
    $reader.Dispose()
  }
}

function Convert-ColumnNameToNumber {
  param([string]$CellRef)

  $letters = ([regex]::Match($CellRef, "^[A-Z]+", "IgnoreCase")).Value.ToUpperInvariant()
  $number = 0
  foreach ($ch in $letters.ToCharArray()) {
    $number = ($number * 26) + ([int][char]$ch - [int][char]'A' + 1)
  }
  return $number
}

function Get-CellText {
  param(
    [System.Xml.XmlElement]$Cell,
    [string[]]$SharedStrings
  )

  $type = $Cell.GetAttribute("t")
  if ($type -eq "inlineStr") {
    $texts = @()
    foreach ($node in $Cell.GetElementsByTagName("t")) {
      $texts += $node.InnerText
    }
    return ($texts -join "")
  }

  $valueNodes = $Cell.GetElementsByTagName("v")
  if ($valueNodes.Count -eq 0) {
    return ""
  }

  $value = $valueNodes.Item(0).InnerText
  if ($type -eq "s") {
    $index = [int]$value
    if ($index -ge 0 -and $index -lt $SharedStrings.Count) {
      return $SharedStrings[$index]
    }
  }

  return $value
}

if (-not (Test-Path -LiteralPath $Path)) {
  throw "Excel file not found: $Path"
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$stream = [System.IO.File]::Open(
  $Path,
  [System.IO.FileMode]::Open,
  [System.IO.FileAccess]::Read,
  [System.IO.FileShare]::ReadWrite
)
$zip = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Read, $false)
try {
  $sharedStrings = @()
  $sharedText = Get-EntryText -Zip $zip -Name "xl/sharedStrings.xml"
  if ($sharedText) {
    [xml]$sharedXml = $sharedText
    foreach ($si in $sharedXml.GetElementsByTagName("si")) {
      $parts = @()
      foreach ($t in $si.GetElementsByTagName("t")) {
        $parts += $t.InnerText
      }
      $sharedStrings += ($parts -join "")
    }
  }

  [xml]$workbookXml = Get-EntryText -Zip $zip -Name "xl/workbook.xml"
  [xml]$relsXml = Get-EntryText -Zip $zip -Name "xl/_rels/workbook.xml.rels"

  $sheetNodes = @($workbookXml.GetElementsByTagName("sheet"))
  if ($sheetNodes.Count -eq 0) {
    throw "No worksheet found in $Path"
  }

  $targetSheet = $null
  if ($SheetName) {
    $targetSheet = $sheetNodes | Where-Object { $_.GetAttribute("name") -eq $SheetName } | Select-Object -First 1
    if (-not $targetSheet) {
      throw "Worksheet '$SheetName' not found."
    }
  } else {
    $targetSheet = $sheetNodes[0]
  }

  $relId = $targetSheet.GetAttribute("id", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
  $rel = @($relsXml.GetElementsByTagName("Relationship")) | Where-Object { $_.GetAttribute("Id") -eq $relId } | Select-Object -First 1
  if (-not $rel) {
    throw "Worksheet relationship not found for '$($targetSheet.GetAttribute("name"))'."
  }

  $target = $rel.GetAttribute("Target")
  if ($target.StartsWith("/")) {
    $sheetPath = $target.TrimStart("/")
  } else {
    $sheetPath = "xl/" + $target
  }
  $sheetPath = $sheetPath.Replace("\", "/")

  [xml]$sheetXml = Get-EntryText -Zip $zip -Name $sheetPath
  $row = @($sheetXml.GetElementsByTagName("row")) | Where-Object { [int]$_.GetAttribute("r") -eq $RowNumber } | Select-Object -First 1
  if (-not $row) {
    throw "Row $RowNumber not found in worksheet '$($targetSheet.GetAttribute("name"))'."
  }

  $cellsByColumn = @{}
  foreach ($cell in $row.GetElementsByTagName("c")) {
    $cellRef = $cell.GetAttribute("r")
    $columnNumber = Convert-ColumnNameToNumber -CellRef $cellRef
    $cellsByColumn[$columnNumber] = Get-CellText -Cell $cell -SharedStrings $sharedStrings
  }

  $templateName = ""
  if ($cellsByColumn.ContainsKey($TemplateNameColumn)) {
    $templateName = ([string]$cellsByColumn[$TemplateNameColumn]).Trim()
  }

  $messageText = ""
  if ($cellsByColumn.ContainsKey($TextColumn)) {
    $messageText = ([string]$cellsByColumn[$TextColumn]).Trim()
  }

  if (-not $templateName) {
    throw "Template name is empty at row $RowNumber column $TemplateNameColumn."
  }
  if (-not $messageText) {
    throw "Message text is empty at row $RowNumber column $TextColumn."
  }

  $match = [regex]::Match($messageText, "^.*?\.")
  if (-not $match.Success) {
    throw "No first sentence ending with a period found at row $RowNumber column $TextColumn."
  }

  $headerContent = $match.Value.Trim()
  $body = $messageText.Substring($match.Length).Trim()

  [pscustomobject]@{
    source_path = [System.IO.Path]::GetFullPath($Path)
    sheet_name = $targetSheet.GetAttribute("name")
    row_number = $RowNumber
    template_name = $templateName
    header_content = $headerContent
    header_length = $headerContent.Length
    body = $body
    body_length = $body.Length
  } | ConvertTo-Json -Depth 4
} finally {
  if ($zip) {
    $zip.Dispose()
  }
  if ($stream) {
    $stream.Dispose()
  }
}

