<#
.SYNOPSIS
  Captures the itch.io cover screenshot (630x500) from the real shipped build.

.DESCRIPTION
  Serves the repo, loads tools/cover.html (which plays and poses a run through
  the ?debug seam inside a 630x500 iframe) and grabs a headless-Chrome
  screenshot of exactly that viewport. No generated imagery: every pixel is
  the game rendering itself.

.PARAMETER Port
  Loopback port for the temporary static server. Default 8143.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\cover.ps1
#>
[CmdletBinding()]
param(
  [int]$Port = 8143
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

$outDir = Join-Path $root 'itch'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$png = Join-Path $outDir 'cover-630x500.png'
Remove-Item $png -Force -ErrorAction SilentlyContinue

$server = Start-Process powershell -ArgumentList @(
  '-NoProfile','-ExecutionPolicy','Bypass','-File',
  ('"' + (Join-Path $root 'tools\serve.ps1') + '"'), '-Port', $Port
) -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2
try {
  $probe = Invoke-WebRequest -UseBasicParsing ("http://127.0.0.1:$Port/tools/cover.html") -TimeoutSec 10
  Write-Host "server up on 127.0.0.1:$Port (cover rig $($probe.StatusCode))"
} catch {
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  throw "static server did not come up on port $Port"
}

try {
  $prof = "$tmp\keepup-cover-prof-" + [DateTime]::Now.ToString('yyyyMMddHHmmssfff')
  $cmdLine = "`"$chrome`" --headless=new --disable-gpu --no-first-run --no-sandbox --mute-audio " +
             "--hide-scrollbars --window-size=630,500 " +
             "--user-data-dir=`"$prof`" " +
             "--virtual-time-budget=20000 --screenshot=`"$png`" " +
             "http://127.0.0.1:$Port/tools/cover.html"
  cmd /c "$cmdLine > `"$tmp\keepup-cover.log`" 2>&1"
} finally {
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  Write-Host 'server stopped'
}

if (-not (Test-Path -LiteralPath $png)) {
  Get-Content "$tmp\keepup-cover.log" -ErrorAction SilentlyContinue | Select-Object -First 6 | ForEach-Object { Write-Host "      $_" }
  throw 'cover screenshot was not produced'
}
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap($png)
$w = $bmp.Width; $h = $bmp.Height
$bmp.Dispose()
if ($w -ne 630 -or $h -ne 500) { throw "cover is ${w}x${h}, expected 630x500" }
Write-Host ("ok   cover: {0} ({1} bytes, {2}x{3})" -f $png, (Get-Item $png).Length, $w, $h) -ForegroundColor Green
