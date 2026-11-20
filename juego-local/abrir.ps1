$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
if (-not $root.EndsWith("\")) { $root = $root + "\" }
$port = 4173
$prefix = "http://127.0.0.1:$port/"
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)

try {
  $listener.Start()
} catch {
  Write-Host "No se pudo abrir $prefix"
  Write-Host $_
  exit 1
}

Start-Process $prefix
Write-Host "Selectiva esta en $prefix"

$types = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "text/javascript; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".svg"  = "image/svg+xml"
  ".json" = "application/json"
  ".ico"  = "image/x-icon"
  ".woff" = "font/woff"
  ".woff2" = "font/woff2"
}

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $rel = [Uri]::UnescapeDataString($context.Request.Url.AbsolutePath)
    if ([string]::IsNullOrWhiteSpace($rel) -or $rel -eq "/") { $rel = "/index.html" }
    $rel = $rel.TrimStart("/") -replace "/", [IO.Path]::DirectorySeparatorChar
    $file = [IO.Path]::GetFullPath((Join-Path $root $rel))
    if (-not $file.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
      $context.Response.StatusCode = 403
      $context.Response.Close()
      continue
    }
    if (-not (Test-Path -LiteralPath $file -PathType Leaf)) {
      $file = Join-Path $root "index.html"
    }
    $bytes = [IO.File]::ReadAllBytes($file)
    $ext = [IO.Path]::GetExtension($file).ToLowerInvariant()
    $contentType = $types[$ext]
    if (-not $contentType) { $contentType = "application/octet-stream" }
    $context.Response.ContentType = $contentType
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    $context.Response.Close()
  }
} finally {
  if ($listener.IsListening) { $listener.Stop() }
  $listener.Close()
}
