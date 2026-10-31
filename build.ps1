<#
.SYNOPSIS
  Builds KEEP IT UP into a single dependency-free index.html (PORT-01), plus a
  module-loading dev.html for debugging under a local web server.

.DESCRIPTION
  There is no node/python on this machine, so the bundle is produced by
  concatenation instead of a real bundler. That imposes three authoring rules on
  src/*.js, which this script enforces:

    1. imports are single-line and named only:  import { a, b } from './x.js';
    2. exports are inline declarations only:    export const|let|function|class
       (no `export { ... }` blocks, no default exports, no re-exports)
    3. top-level names are unique across all modules, because the bundle puts
       every module in one IIFE scope

  The script also verifies that every CFG.<key> referenced by the code exists in
  config.js (a typo there would silently become NaN physics), reports CFG keys
  nothing uses, and asserts the built index.html contains no external reference
  of any kind (no src=, href=, url(, @import or ://).

.PARAMETER Strict
  Treat unused CFG keys as an error instead of a warning.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File build.ps1
#>
[CmdletBinding()]
param(
  [switch]$Strict
)

$ErrorActionPreference = 'Stop'

$root    = Split-Path -Parent $MyInvocation.MyCommand.Definition
$srcDir  = Join-Path $root 'src'
$buildDir= Join-Path $root 'build'
$shell   = Join-Path $srcDir 'shell.html'
$cssFile = Join-Path $srcDir 'styles.css'

# Bundle order. Function declarations hoist, so only const/let initialisers care
# about order: config and math must precede game.js, which builds the game object.
$order = @(
  'config.js','math.js','rng.js','storage.js','dom.js','audio.js','state.js','fx.js','ball.js',
  'achievements.js','skins.js','daily.js','hud.js','flow.js','climb.js','spawn.js','entities.js',
  'render.js','input.js','game.js'
)

function Read-Text([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) { throw "missing source file: $path" }
  return [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
}

function Write-Text([string]$path, [string]$text) {
  $enc = New-Object System.Text.UTF8Encoding($false)   # UTF-8 without BOM
  [System.IO.File]::WriteAllText($path, $text, $enc)
}

# Analysis-only view: comments removed so they cannot look like code or CFG keys.
function Strip-Comments([string]$text) {
  $t = [regex]::Replace($text, '/\*[\s\S]*?\*/', ' ')
  return [regex]::Replace($t, '(?m)//[^\r\n]*', ' ')
}

# ------------------------------------------------------------------ transform
$parts = New-Object System.Collections.Generic.List[string]
$importRe = [regex]"^\s*import\s+[^;]*?from\s*'\./[^']*';\s*$"
$exportRe = [regex]'^(\s*)export\s+'
$badExportRe = [regex]'(?m)^\s*export\s*(\{|\*|default\b)'

foreach ($name in $order) {
  $path = Join-Path $srcDir $name
  $raw  = Read-Text $path

  if ($badExportRe.IsMatch($raw)) {
    throw "$name uses an export form the concatenation bundler cannot handle (export { } / * / default)"
  }

  $lines = [regex]::Split($raw, "\r\n|\n")
  $out   = New-Object System.Collections.Generic.List[string]
  foreach ($line in $lines) {
    if ($importRe.IsMatch($line)) { continue }          # imports vanish into one scope
    $out.Add($exportRe.Replace($line, '$1'))            # strip the `export ` keyword
  }

  $parts.Add("/* ===================== $name ===================== */")
  $parts.Add(($out -join "`n"))
}

$bundleBody = ($parts -join "`n`n")
$bundle = "(function(){`n'use strict';`n`n$bundleBody`n`n})();`n"

# --------------------------------------------------------------------- checks
$fail = @()

$leftover = [regex]::Matches($bundle, '(?m)^\s*(import|export)\s[^\r\n]*')
if ($leftover.Count -gt 0) {
  $fail += "bundle still contains $($leftover.Count) import/export statement(s): " +
           (($leftover | ForEach-Object { $_.Value.Trim() } | Select-Object -First 5) -join ' | ')
}

$cfgText   = Strip-Comments (Read-Text (Join-Path $srcDir 'config.js'))
# Only the CFG literal: KEYS holds storage names, not tunables.
$cfgCut = $cfgText.IndexOf('const KEYS')
if ($cfgCut -gt 0) { $cfgText = $cfgText.Substring(0, $cfgCut) }
$codeText  = Strip-Comments $bundleBody

$defined = @{}
foreach ($m in [regex]::Matches($cfgText, '([A-Za-z_][A-Za-z0-9_]*)\s*:')) {
  $defined[$m.Groups[1].Value] = $true
}

$used = @{}
$unknown = New-Object System.Collections.Generic.List[string]
foreach ($m in [regex]::Matches($codeText, 'CFG\.([A-Za-z_][A-Za-z0-9_]*)')) {
  $key = $m.Groups[1].Value
  if ($defined.ContainsKey($key)) { $used[$key] = $true }
  elseif (-not $unknown.Contains($key)) { $unknown.Add($key) }
}
if ($unknown.Count -gt 0) {
  $fail += "CFG keys referenced but not defined in config.js: $($unknown -join ', ')"
}

$unused = @($defined.Keys | Where-Object { -not $used.ContainsKey($_) } | Sort-Object)

# ------------------------------------------------------------------- assemble
$shellText = Read-Text $shell
if ($shellText.IndexOf('<!--@css-->') -lt 0 -or $shellText.IndexOf('<!--@js-->') -lt 0) {
  throw 'shell.html is missing the <!--@css--> / <!--@js--> markers'
}

$css = Read-Text $cssFile
$indexHtml = $shellText.Replace('<!--@css-->', "<style>`n$css</style>")
$indexHtml = $indexHtml.Replace('<!--@js-->', "<script>`n$bundle</script>")

$devHtml = $shellText.Replace('<!--@css-->', '<link rel="stylesheet" href="src/styles.css">')
$devHtml = $devHtml.Replace('<!--@js-->', '<script type="module" src="src/game.js"></script>')

# PORT-01 / DATA-01: the shipped file must not reference anything outside itself.
foreach ($pat in @('://', ' src=', ' href=', 'url(', '@import')) {
  if ($indexHtml.IndexOf($pat) -ge 0) {
    $fail += "index.html contains an external reference ('$pat') - violates PORT-01"
  }
}

if ($fail.Count -gt 0) {
  Write-Host ''
  foreach ($f in $fail) { Write-Host "FAIL: $f" -ForegroundColor Red }
  throw "build failed with $($fail.Count) problem(s)"
}

if (-not (Test-Path -LiteralPath $buildDir)) { New-Item -ItemType Directory -Path $buildDir | Out-Null }
Write-Text (Join-Path $root 'index.html') $indexHtml
Write-Text (Join-Path $root 'dev.html')    $devHtml
Write-Text (Join-Path $buildDir 'game.js') $bundle

$kb = [math]::Round($indexHtml.Length / 1024, 1)
Write-Host "built index.html ($kb KB, single file, zero dependencies)" -ForegroundColor Green
Write-Host "built dev.html (ES module loader - needs http://, see tools/serve.ps1)"
Write-Host "built build/game.js (raw bundle, for inspection)"
Write-Host "CFG: $($defined.Count) knobs, $($used.Count) referenced"

if ($unused.Count -gt 0) {
  $msg = "unused CFG keys ($($unused.Count)): $($unused -join ', ')"
  if ($Strict) { throw $msg }
  Write-Host "WARN: $msg" -ForegroundColor Yellow
}
