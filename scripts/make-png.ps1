Add-Type -AssemblyName System.Drawing

function Key-Magenta([string]$src, [string]$dest) {
  $original = [System.Drawing.Image]::FromFile($src)
  $bmp = New-Object System.Drawing.Bitmap $original.Width, $original.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.DrawImage($original, 0, 0, $original.Width, $original.Height)
  $g.Dispose()
  $original.Dispose()

  $rect = New-Object System.Drawing.Rectangle 0, 0, $bmp.Width, $bmp.Height
  $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, $bmp.PixelFormat)
  $bytes = [Math]::Abs($data.Stride) * $bmp.Height
  $buf = New-Object byte[] $bytes
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $buf, 0, $bytes)
  for ($y = 0; $y -lt $bmp.Height; $y++) {
    $row = $y * $data.Stride
    for ($x = 0; $x -lt $bmp.Width; $x++) {
      $i = $row + ($x * 4)
      $b = $buf[$i]
      $gc = $buf[$i + 1]
      $r = $buf[$i + 2]
      $score = [Math]::Abs($r - 255) + $gc + [Math]::Abs($b - 255)
      $alpha = 255
      if ($score -lt 30) { $alpha = 0 }
      elseif ($score -lt 78) { $alpha = [int](($score - 30) * 255 / 48) }
      $buf[$i + 3] = [byte]$alpha
    }
  }
  [System.Runtime.InteropServices.Marshal]::Copy($buf, 0, $data.Scan0, $bytes)
  $bmp.UnlockBits($data)
  $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

function Crop-Circle([string]$src, [string]$dest, [int]$size) {
  $original = [System.Drawing.Image]::FromFile($src)
  $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::Transparent)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddEllipse(1, 1, $size - 3, $size - 3)
  $g.SetClip($path)
  $scale = [Math]::Max($size / $original.Width, $size / $original.Height)
  $w = $original.Width * $scale
  $h = $original.Height * $scale
  $x = ($size - $w) / 2
  $y = ($size - $h) / 2
  $g.DrawImage($original, $x, $y, $w, $h)
  $g.Dispose()
  $path.Dispose()
  $original.Dispose()
  $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

$root = "c:\Users\Gerson\Documents\EMBEKO\danielgame"
$assets = "C:\Users\Gerson\.cursor\projects\c-Users-Gerson-Documents-EMBEKO-danielgame\assets"
New-Item -ItemType Directory -Force -Path "$root\public\sprites" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\public\art" | Out-Null
New-Item -ItemType Directory -Force -Path "$root\public\micro" | Out-Null

$sprites = @{
  "pyogenes" = "bug-pyogenes.jpg"
  "ecoli" = "bug-ecoli.jpg"
  "fragilis" = "bug-fragilis.jpg"
  "mrsa" = "bug-mrsa.jpg"
  "klebsiella" = "bug-klebsiella.jpg"
}
foreach ($name in $sprites.Keys) {
  Key-Magenta (Join-Path $assets $sprites[$name]) "$root\public\sprites\$name.png"
  Write-Host "sprite $name"
}

$mechs = @{
  "pared" = "mech-pared.jpg"
  "proteina" = "mech-proteina.jpg"
  "acidos" = "mech-acidos.jpg"
  "membrana" = "mech-membrana.jpg"
  "folato" = "mech-folato.jpg"
}
foreach ($name in $mechs.Keys) {
  Key-Magenta (Join-Path $assets $mechs[$name]) "$root\public\art\$name.png"
  Write-Host "mech $name"
}

$photos = @("pyogenes", "ecoli", "fragilis", "mrsa", "klebsiella")
foreach ($name in $photos) {
  Crop-Circle "$root\public\micro\raw\$name.jpg" "$root\public\micro\$name.png" 640
  Write-Host "photo $name"
}
