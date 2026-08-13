[CmdletBinding()]
param(
    [string]$TabId,
    [string]$UrlPattern
)

$script = @'
(() => {
  const textOf = (node) => (node.innerText || node.value || node.getAttribute("aria-label") || node.getAttribute("title") || "").trim().replace(/\s+/g, " ");
  const elements = Array.from(document.querySelectorAll("a,button,input,textarea,select,[role]")).slice(0, 200).map((node, index) => ({
    index,
    tag: node.tagName.toLowerCase(),
    role: node.getAttribute("role") || "",
    type: node.getAttribute("type") || "",
    text: textOf(node).slice(0, 160),
    href: node.href || "",
    name: node.getAttribute("name") || "",
    id: node.id || ""
  }));

  return {
    title: document.title,
    url: location.href,
    bodyText: (document.body?.innerText || "").trim().replace(/\s+/g, " ").slice(0, 4000),
    elements
  };
})()
'@

$args = @("-ExecutionPolicy", "Bypass", "-File", (Join-Path $PSScriptRoot "eval.ps1"), "-Script", $script)
if ($TabId) {
    $args += @("-TabId", $TabId)
}
if ($UrlPattern) {
    $args += @("-UrlPattern", $UrlPattern)
}

& powershell @args
