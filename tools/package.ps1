<#
.SYNOPSIS
  Packages the itch.io upload archive: a zip with index.html at its root.

.DESCRIPTION
  The shipped index.html is fully self-contained (inline CSS + JS, zero assets,
  zero dependencies, zero network requests), so the archive needs nothing else:
  itch.io serves index.html straight from the zip. Rebuilds first so the zip
  always matches src/.

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
Compress-Archive -Path (Join-Path $root 'index.html') -DestinationPath $zip
Write-Host ("ok   archive: {0} ({1} bytes, index.html at root)" -f $zip, (Get-Item $zip).Length) -ForegroundColor Green
