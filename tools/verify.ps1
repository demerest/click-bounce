<#
.SYNOPSIS
  Full verification: rebuild, run the headless integration harness, and prove the
  production rAF loop animates via screenshot diffs.

.DESCRIPTION
  There is no node/python on this machine, so the browser is the test runtime.
  This script:
    1. runs build.ps1 (which also validates CFG keys and PORT-01 purity)
    2. starts tools/serve.ps1 on a loopback port (ES modules need http://)
    3. runs tests/harness.html in headless Chrome and prints pass/fail/skip
    4. screenshots index.html at two virtual times; differing hashes prove the
       requestAnimationFrame loop advances the picture in the shipped build
    5. stops the server

  Exit code is 0 only when the harness reports fail=0 and the screenshots differ.

.PARAMETER Port
  Loopback port for the temporary static server. Default 8137.

.PARAMETER KeepServer
  Leave the server running afterwards (for poking at dev.html by hand).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\verify.ps1
#>
[CmdletBinding()]
param(
  [int]$Port = 8137,
  [switch]$KeepServer
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$root = Split-Path -Parent $root
$tmp  = $env:TEMP

$chrome = $null
foreach ($c in @(
  'C:\Program Files\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
  'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
)) { if (Test-Path -LiteralPath $c) { $chrome = $c; break } }
if (-not $chrome) { throw 'no Chromium browser found to use as the test runtime' }

$failed = $false

Write-Host '== build ==' -ForegroundColor Cyan
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'build.ps1')
if ($LASTEXITCODE -ne 0) { throw 'build failed' }

Write-Host ''
Write-Host '== serve ==' -ForegroundColor Cyan
$server = Start-Process powershell -ArgumentList @(
  '-NoProfile','-ExecutionPolicy','Bypass','-File',
  ('"' + (Join-Path $root 'tools\serve.ps1') + '"'), '-Port', $Port
) -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2
try {
  $probe = Invoke-WebRequest -UseBasicParsing ("http://127.0.0.1:$Port/tests/harness.html") -TimeoutSec 10
  Write-Host "server up on 127.0.0.1:$Port (harness $($probe.StatusCode))"
} catch {
  Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
  throw "static server did not come up on port $Port"
}

try {
  Write-Host ''
  Write-Host '== integration harness ==' -ForegroundColor Cyan
  $out = Join-Path $tmp 'keepup-verify-out.html'
  # a fresh profile per run: a reused one carries localStorage (best scores)
  # from the previous run and would corrupt NEW BEST assertions.
  $prof = "$tmp\keepup-verify-prof-" + [DateTime]::Now.ToString('yyyyMMddHHmmssfff')
  $chromeArgs = @(
    '--headless=new','--disable-gpu','--no-first-run','--no-sandbox','--mute-audio',
    '--autoplay-policy=no-user-gesture-required','--window-size=1600,1200',
    "--user-data-dir=$prof",
    '--virtual-time-budget=180000','--timeout=240000',
    '--dump-dom',"http://127.0.0.1:$Port/tests/harness.html"
  )
  # Start-Process keeps the dump byte-exact; PowerShell's `>` would re-encode as UTF-16.
  Start-Process -FilePath $chrome -ArgumentList $chromeArgs -Wait -NoNewWindow `
    -RedirectStandardOutput $out -RedirectStandardError "$tmp\keepup-verify-chrome.log"
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'tools\fails.ps1') -Path $out
  $raw = [System.IO.File]::ReadAllText($out, [System.Text.Encoding]::UTF8)
  $sm = [regex]::Match($raw, 'SUMMARY pass=(\d+) fail=(\d+)')
  if (-not $sm.Success) {
    Write-Host 'FAIL: the harness did not produce a summary' -ForegroundColor Red
    $failed = $true
  } elseif ($sm.Groups[2].Value -ne '0') {
    $failed = $true
  } else {
    Write-Host ("ok   harness: pass={0} fail=0" -f $sm.Groups[1].Value) -ForegroundColor Green
  }

  Write-Host ''
  Write-Host '== production rAF loop (screenshot diff) ==' -ForegroundColor Cyan
  $png1 = Join-Path $tmp 'keepup-shot-a.png'
  $png2 = Join-Path $tmp 'keepup-shot-b.png'
  Remove-Item $png1, $png2 -Force -ErrorAction SilentlyContinue
  $i = 0
  foreach ($pair in @(@($png1, 1500), @($png2, 6000))) {
    $i++
    # a separate profile per launch: Chrome refuses a second instance on one dir.
    # cmd /c keeps the quoting byte-identical to a hand-typed command line;
    # PowerShell 5.1 mangles some of these native arguments.
    $shotLog = "$tmp\keepup-shot$i.log"
    $cmdLine = "`"$chrome`" --headless=new --disable-gpu --no-first-run --no-sandbox --mute-audio " +
               "--hide-scrollbars --window-size=800,600 " +
               "--user-data-dir=`"$tmp\keepup-verify-shot$i`" " +
               "--virtual-time-budget=$($pair[1]) --screenshot=`"$($pair[0])`" " +
               "`"file:///$($root -replace '\\','/')/index.html`""
    cmd /c "$cmdLine > `"$shotLog`" 2>&1"
    if (-not (Test-Path -LiteralPath $pair[0])) {
      Write-Host "FAIL: screenshot $($pair[0]) was not produced" -ForegroundColor Red
      Get-Content $shotLog -ErrorAction SilentlyContinue | Select-Object -First 6 | ForEach-Object { Write-Host "      $_" }
      $failed = $true
    }
  }
  if ((Test-Path -LiteralPath $png1) -and (Test-Path -LiteralPath $png2)) {
    # A whole-image diff would also pass on the menu's CSS demo-ball animation, so
    # compare a canvas-only strip (left of the centred panel, below the HUD) whose
    # content can only change if the rAF loop advanced the simulation.
    Add-Type -AssemblyName System.Drawing
    function Get-CropHash([string]$path) {
      $bmp = New-Object System.Drawing.Bitmap($path)
      try {
        $rect = New-Object System.Drawing.Rectangle(0, 220, 150, 300)
        $crop = $bmp.Clone($rect, $bmp.PixelFormat)
        try {
          $ms = New-Object System.IO.MemoryStream
          try {
            $crop.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
            return [BitConverter]::ToString([System.Security.Cryptography.MD5]::Create().ComputeHash($ms.ToArray()))
          } finally { $ms.Dispose() }
        } finally { $crop.Dispose() }
      } finally { $bmp.Dispose() }
    }
    $c1 = Get-CropHash $png1
    $c2 = Get-CropHash $png2
    $h1 = (Get-FileHash $png1 -Algorithm MD5).Hash
    $h2 = (Get-FileHash $png2 -Algorithm MD5).Hash
    Write-Host "t=1.5s  whole=$h1  canvas-strip=$c1"
    Write-Host "t=6.0s  whole=$h2  canvas-strip=$c2"
    if ($c1 -eq $c2) {
      Write-Host 'FAIL: the canvas did not change between the two screenshots - the rAF loop did not advance' -ForegroundColor Red
      $failed = $true
    } else {
      Write-Host 'ok   the shipped build animates (rAF loop advances the canvas)' -ForegroundColor Green
    }
  }
} finally {
  if (-not $KeepServer) {
    Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue
    Write-Host ''
    Write-Host 'server stopped'
  } else {
    Write-Host ''
    Write-Host "server left running on http://127.0.0.1:$Port/ (pid $($server.Id))"
  }
}

Write-Host ''
if ($failed) {
  Write-Host 'VERIFY: FAILED' -ForegroundColor Red
  exit 1
}
Write-Host 'VERIFY: OK' -ForegroundColor Green
exit 0
