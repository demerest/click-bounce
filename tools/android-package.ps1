<#
.SYNOPSIS
  Builds the Google Play package: a signed AAB wrapping the shipped index.html
  in a framework-only WebView shell (no native rewrite, no third-party code).

.DESCRIPTION
  Steps:
    1. rebuild index.html from src/ so the APK assets match the web build
    2. copy it into android/app/src/main/assets/
    3. write android/local.properties (sdk.dir) for this machine
    4. generate android/upload-keystore.p12 + gitignored keystore.properties
       once per machine (BACK BOTH UP: they are the Play upload key)
    5. run gradlew bundleRelease and report the AAB path

  Requires JDK 17 and the Android SDK (platform 36 + build-tools) as installed
  by the 2026-11-04 session: Temurin at C:\Program Files\Eclipse Adoptium\...,
  SDK at C:\Android. Override with -JavaHome / -AndroidHome.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\android-package.ps1
#>
[CmdletBinding()]
param(
  [string]$JavaHome = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.21.9-hotspot',
  [string]$AndroidHome = 'C:\Android'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$root = Split-Path -Parent $root
$android = Join-Path $root 'android'

if (-not (Test-Path -LiteralPath (Join-Path $JavaHome 'bin\java.exe'))) {
  throw "JDK not found at $JavaHome (pass -JavaHome)"
}
if (-not (Test-Path -LiteralPath (Join-Path $AndroidHome 'platforms'))) {
  throw "Android SDK not found at $AndroidHome (pass -AndroidHome)"
}

Write-Host '== web build ==' -ForegroundColor Cyan
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $root 'build.ps1')
if ($LASTEXITCODE -ne 0) { throw 'build failed' }

Write-Host ''
Write-Host '== assets ==' -ForegroundColor Cyan
$assets = Join-Path $android 'app\src\main\assets'
New-Item -ItemType Directory -Force -Path $assets | Out-Null
Copy-Item (Join-Path $root 'index.html') (Join-Path $assets 'index.html') -Force
Write-Host ("ok   assets/index.html ({0} bytes)" -f (Get-Item (Join-Path $assets 'index.html')).Length)

$lp = Join-Path $android 'local.properties'
Set-Content -LiteralPath $lp -Value ("sdk.dir=" + ($AndroidHome -replace '\\','\\')) -Encoding ASCII

Write-Host ''
Write-Host '== upload key ==' -ForegroundColor Cyan
$ks = Join-Path $android 'upload-keystore.p12'
$kpf = Join-Path $android 'keystore.properties'
if (-not (Test-Path -LiteralPath $ks)) {
  $alphabet = [char[]](97..122) + [char[]](65..90) + [char[]](48..57)   # a-z A-Z 0-9
  $pwd = -join (1..28 | ForEach-Object { $alphabet[(Get-Random -Minimum 0 -Maximum $alphabet.Length)] })
  & (Join-Path $JavaHome 'bin\keytool.exe') -genkeypair -keystore $ks -storetype PKCS12 `
    -alias upload -keyalg RSA -keysize 2048 -validity 10000 `
    -storepass $pwd -keypass $pwd `
    -dname 'CN=KEEP IT UP, OU=games, O=demerest, C=US' | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'keytool failed' }
  Set-Content -LiteralPath $kpf -Value @(
    'storeFile=upload-keystore.p12',
    "storePassword=$pwd",
    'keyAlias=upload',
    "keyPassword=$pwd"
  ) -Encoding ASCII
  Write-Host 'generated upload-keystore.p12 + keystore.properties (both gitignored)' -ForegroundColor Yellow
  Write-Host 'BACK BOTH UP: they sign every Play upload; with Play App Signing the' -ForegroundColor Yellow
  Write-Host 'upload key can be reset, but losing them still costs you a support ticket.' -ForegroundColor Yellow
} else {
  Write-Host 'reusing existing upload-keystore.p12'
}

Write-Host ''
Write-Host '== bundleRelease ==' -ForegroundColor Cyan
$env:JAVA_HOME = $JavaHome
$env:ANDROID_HOME = $AndroidHome
$env:Path = (Join-Path $JavaHome 'bin') + ';' + $env:Path
Push-Location $android
try {
  cmd /c "gradlew.bat --no-daemon --console=plain bundleRelease"
  if ($LASTEXITCODE -ne 0) { throw 'gradle bundleRelease failed' }
} finally {
  Pop-Location
}

$aab = Join-Path $android 'app\build\outputs\bundle\release\app-release.aab'
if (-not (Test-Path -LiteralPath $aab)) { throw 'AAB was not produced' }
Write-Host ''
Write-Host ("ok   AAB: {0} ({1} bytes)" -f $aab, (Get-Item $aab).Length) -ForegroundColor Green
Write-Host 'upload this file in Play Console once the developer account is approved.'
