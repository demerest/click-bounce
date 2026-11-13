# pwa-assets.ps1 — derive the PWA shell files from the Play store capture:
# apple-touch-icon.png (180x180, Apple home screen) and manifest.webmanifest
# with a 192x192 icon embedded as a data URI, so the manifest stays one file.
# Usage: powershell -ExecutionPolicy Bypass -File tools\pwa-assets.ps1
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

function Save-Scaled([System.Drawing.Image]$img, [int]$n, [string]$dst){
  $bmp = New-Object System.Drawing.Bitmap $n, $n
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, $n, $n))
  $g.Dispose()
  $bmp.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  $chk = [System.Drawing.Image]::FromFile($dst)
  $cw = $chk.Width; $ch = $chk.Height
  $chk.Dispose()
  if ($cw -ne $n -or $ch -ne $n) { throw "$dst is ${cw}x${ch}, want ${n}x${n}" }
}

$touch = Join-Path $root 'apple-touch-icon.png'
Save-Scaled $src 180 $touch
$tmp = Join-Path $env:TEMP 'keepup-manifest-192.png'
Save-Scaled $src 192 $tmp
$src.Dispose()
$b64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($tmp))
Remove-Item $tmp -Force

$json = @"
{
  "name": "KEEP IT UP: Jelly Bounce",
  "short_name": "KEEP IT UP",
  "description": "One-click jelly-bounce arcade. Keep the ball off the floor.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#0d1017",
  "theme_color": "#0d1017",
  "icons": [
    { "src": "data:image/png;base64,$b64", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "apple-touch-icon.png", "sizes": "180x180", "type": "image/png", "purpose": "any" }
  ]
}
"@
$manifest = Join-Path $root 'manifest.webmanifest'
[System.IO.File]::WriteAllText($manifest, $json, (New-Object System.Text.UTF8Encoding $false))
Write-Output ("wrote " + $touch + " (180x180)")
Write-Output ("wrote " + $manifest + " (" + (Get-Item $manifest).Length + " bytes, 192 icon embedded)")
