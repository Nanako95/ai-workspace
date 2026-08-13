[CmdletBinding()]
param(
    [string]$TabId,
    [string]$UrlPattern = '*backwaba.adakamicorp.id*'
)

$ErrorActionPreference = 'Stop'
$evalScript = Join-Path $env:USERPROFILE '.codex\skills\browser-agent\scripts\eval.ps1'
if (-not (Test-Path -LiteralPath $evalScript)) {
    throw "browser-agent eval script not found: $evalScript"
}

$javascript = @'
(async () => {
  const result = {
    url: location.href,
    loginPage: location.hash.includes('/login'),
    found: false,
    loaded: false,
    resized: false,
    readable: false
  };
  if (!result.loginPage) return result;

  let image = document.querySelector('img.code');
  for (let i = 0; !image && i < 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 300));
    image = document.querySelector('img.code');
  }
  if (!image) return result;
  result.found = true;

  for (let i = 0; i < 10 && !(image.complete && image.naturalWidth > 0 && image.naturalHeight > 0); i++) {
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  const inspect = () => {
    const rect = image.getBoundingClientRect();
    const style = getComputedStyle(image);
    return {
      srcPresent: Boolean(image.currentSrc || image.src),
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      display: style.display,
      visibility: style.visibility,
      opacity: style.opacity
    };
  };

  result.before = inspect();
  result.loaded = result.before.srcPresent && result.before.naturalWidth > 0 && result.before.naturalHeight > 0;
  const visible = result.before.display !== 'none' && result.before.visibility !== 'hidden' && Number(result.before.opacity) > 0;
  if (result.loaded && visible && (result.before.width < 80 || result.before.height < 30)) {
    for (const [property, value] of [
      ['width', '120px'], ['min-width', '120px'], ['max-width', '120px'],
      ['height', '48px'], ['min-height', '48px'], ['max-height', '48px'],
      ['flex-shrink', '0'], ['object-fit', 'fill']
    ]) image.style.setProperty(property, value, 'important');
    result.resized = true;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }
  result.after = inspect();
  result.readable = result.loaded && result.after.display !== 'none' &&
    result.after.visibility !== 'hidden' && Number(result.after.opacity) > 0 &&
    result.after.width >= 80 && result.after.height >= 30;
  return result;
})()
'@

if ($TabId) {
    $raw = & $evalScript -Script $javascript -TabId $TabId
} else {
    $raw = & $evalScript -Script $javascript -UrlPattern $UrlPattern
}
if ($null -ne $LASTEXITCODE -and $LASTEXITCODE -ne 0) {
    throw "Captcha inspection failed with exit code $LASTEXITCODE"
}
$envelope = $raw | ConvertFrom-Json
$value = $envelope.result.result.value
if ($null -eq $value) {
    throw 'Captcha inspection returned no value.'
}

$result = if ($value -is [string]) { $value | ConvertFrom-Json } else { $value }
$result | ConvertTo-Json -Depth 8

if ($result.loginPage -and -not $result.readable) {
    Write-Error 'Ycloud login captcha is not visibly readable. Stop for manual handling.'
    exit 2
}
