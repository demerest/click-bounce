<#
.SYNOPSIS
  Packages the itch.io upload archive: index.html plus the PWA shell at its root.

.DESCRIPTION
  The shipped index.html is fully self-contained (inline CSS + JS, zero assets,
  zero dependencies, zero network requests); the manifest, service worker and
  Apple touch icon beside it are platform-install files only, referenced
  relatively. Rebuilds first so the zip always matches src/.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\package.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$root = Split-Path -Parent $root

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'build.ps1')
if ($LASTEXITCODE -ne 0) { throw 'build failed' }

$outDir = Join-Path $root 'itch'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$zip = Join-Path $outDir 'keep-it-up.zip'
Remove-Item $zip -Force -ErrorAction SilentlyContinue
$shell = @('index.html', 'manifest.webmanifest', 'sw.js', 'apple-touch-icon.png') |
  ForEach-Object { Join-Path $root $_ }
Compress-Archive -Path $shell -DestinationPath $zip
Write-Host ("ok   archive: {0} ({1} bytes, index.html + PWA shell at root)" -f $zip, (Get-Item $zip).Length) -ForegroundColor Green
