# launcher-icons.ps1 — rasterize the Play store icon capture into the Android
# launcher mipmaps so the phone icon and the store icon are the same artwork.
# Usage: powershell -ExecutionPolicy Bypass -File tools\launcher-icons.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Add-Type -AssemblyName System.Drawing
$srcPath = Join-Path $root 'play\icon-512.png'
if (-not (Test-Path $srcPath)) { throw "missing $srcPath (regenerate with tools\play-assets.ps1)" }
$src = [System.Drawing.Image]::FromFile($srcPath)
$w = $src.Width; $h = $src.Height
if ($w -ne 512 -or $h -ne 512) {
  $src.Dispose()
  throw "store icon is ${w}x${h}, want 512x512"
}
$sizes = @(
  @{ dpi = 'mdpi';    n = 48 },
  @{ dpi = 'hdpi';    n = 72 },
  @{ dpi = 'xhdpi';   n = 96 },
  @{ dpi = 'xxhdpi';  n = 144 },
  @{ dpi = 'xxxhdpi'; n = 192 }
)
foreach ($s in $sizes){
  $n = [int]$s.n
  $dir = Join-Path $root ('android\app\src\main\res\mipmap-' + $s.dpi)
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  $dst = Join-Path $dir 'ic_launcher.png'
  $bmp = New-Object System.Drawing.Bitmap $n, $n
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $rect = New-Object System.Drawing.Rectangle 0, 0, $n, $n
  $g.DrawImage($src, $rect)
  $g.Dispose()
  $bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $chk = [System.Drawing.Image]::FromFile($dst)
  $cw = $chk.Width; $ch = $chk.Height
  $chk.Dispose()
  if ($cw -ne $n -or $ch -ne $n) { throw "$dst is ${cw}x${ch}, want ${n}x${n}" }
  Write-Output ('wrote ' + $dst + ' (' + $n + 'x' + $n + ')')
}
$src.Dispose()
Write-Output 'launcher mipmaps now match play/icon-512.png'
