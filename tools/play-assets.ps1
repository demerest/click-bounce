<#
.SYNOPSIS
  Captures every Google Play store asset from the real shipped build.

.DESCRIPTION
  Loads tools/play-assets.html (which poses runs through the ?debug seam) at the
  exact viewport each asset needs and screenshots it: 512x512 icon, 1024x500
  feature graphic, and four 1080x1920 (9:16) phone shots. No generated imagery:
  every pixel is the game rendering itself.

.PARAMETER Port
  Loopback port for the temporary static server. Default 8145.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\play-assets.ps1
#>
[CmdletBinding()]
param(
  [int]$Port = 8145
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$root = Split-Path -Parent $root
$tmp  = $env:TEMP

$chrome = $null
foreach ($c in @(
  'C:\Program Files\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
)) { if (Test-Path -LiteralPath $c) { $chrome = $c; break } }
if (-not $chrome) { throw 'no Chrome found to use as the capture runtime' }

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'build.ps1')
if ($LASTEXITCODE -ne 0) { throw 'build failed' }

$outDir = Join-Path $root 'play'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$server = Start-Process powershell -ArgumentList @(
  '-NoProfile','-ExecutionPolicy','Bypass','-File',
  ('"' + (Join-Path $root 'tools\serve.ps1') + '"'), '-Port', $Port
) -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2
try {
  $probe = Invoke-WebRequest -UseBasicParsing ("http://127.0.0.1:$Port/tools/play-assets.html") -TimeoutSec 10
  Write-Host "server up on 127.0.0.1:$Port (asset rig $($probe.StatusCode))"
} catch {
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  throw "static server did not come up on port $Port"
}

Add-Type -AssemblyName System.Drawing
# The rig pins the game viewport with ?vp=WxH (fixed-px iframe), so the window
# only has to be comfortably larger than the pinned size; this Chrome's headless
# frame inset (16x151 physical px at dpr 1) then cannot touch the capture. The
# crop takes exactly the pinned viewport, top-left. Phone shots use a real phone
# CSS viewport (360x640) at device-scale 3 => 1080x1920 physical px.
$shots = @(
  @{ scene = 'icon';    cw = 512;  ch = 512; dsf = 1; out = 'icon-512.png' },
  @{ scene = 'feature'; cw = 1024; ch = 500; dsf = 1; out = 'feature-1024x500.png' },
  @{ scene = 'menu';    cw = 360;  ch = 640; dsf = 3; out = 'phone-1-menu.png' },
  @{ scene = 'classic'; cw = 360;  ch = 640; dsf = 3; out = 'phone-2-classic.png' },
  @{ scene = 'climb';   cw = 360;  ch = 640; dsf = 3; out = 'phone-3-climb.png' },
  @{ scene = 'over';    cw = 360;  ch = 640; dsf = 3; out = 'phone-4-over.png' }
)
try {
  foreach ($s in $shots) {
    $png = Join-Path $outDir $s.out
    Remove-Item $png -Force -ErrorAction SilentlyContinue
    $raw = "$tmp\keepup-play-raw-" + $s.scene + '.png'
    Remove-Item $raw -Force -ErrorAction SilentlyContinue
    $prof = "$tmp\keepup-play-" + $s.scene + '-' + [DateTime]::Now.ToString('yyyyMMddHHmmssfff')
    $cw = $s.cw + 32; $ch = $s.ch + 167
    $pw = $s.cw * $s.dsf; $ph = $s.ch * $s.dsf
    $cmdLine = "`"$chrome`" --headless=new --disable-gpu --no-first-run --no-sandbox --mute-audio " +
               "--hide-scrollbars --force-device-scale-factor=$($s.dsf) --window-size=$cw,$ch " +
               "--user-data-dir=`"$prof`" " +
               "--virtual-time-budget=20000 --screenshot=`"$raw`" " +
               "http://127.0.0.1:$Port/tools/play-assets.html?scene=$($s.scene)^&vp=$($s.cw)x$($s.ch)"
    cmd /c "$cmdLine > `"$tmp\keepup-play-$($s.scene).log`" 2>&1"
    if (-not (Test-Path -LiteralPath $raw)) {
      Get-Content "$tmp\keepup-play-$($s.scene).log" -ErrorAction SilentlyContinue | Select-Object -First 6 | ForEach-Object { Write-Host "      $_" }
      throw "screenshot $($s.out) was not produced"
    }
    $bmp = New-Object System.Drawing.Bitmap($raw)
    try {
      $rect = New-Object System.Drawing.Rectangle(0, 0, $pw, $ph)
      $crop = $bmp.Clone($rect, $bmp.PixelFormat)
      try { $crop.Save($png, [System.Drawing.Imaging.ImageFormat]::Png) } finally { $crop.Dispose() }
    } finally { $bmp.Dispose() }
    $chk = New-Object System.Drawing.Bitmap($png)
    $w = $chk.Width; $h = $chk.Height
    $chk.Dispose()
    if ($w -ne $pw -or $h -ne $ph) { throw "$($s.out) is ${w}x${h}, expected ${pw}x${ph}" }
    Write-Host ("ok   {0} ({1}x{2}, {3} bytes)" -f $s.out, $w, $h, (Get-Item $png).Length)
  }
} finally {
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  Write-Host 'server stopped'
}
Write-Host ("all Play assets captured into {0}" -f $outDir) -ForegroundColor Green
