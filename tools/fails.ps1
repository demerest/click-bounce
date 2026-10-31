# Prints just the FAIL / skip / info lines from a dumped harness DOM, one per line.
param([Parameter(Mandatory = $true)][string]$Path)
$ErrorActionPreference = 'Stop'
$html = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
$m = [regex]::Matches($html, '<div class="(f|s)">(.*?)</div>')
if ($m.Count -eq 0) { Write-Host 'no failures or skips' }
foreach ($x in $m) {
  $t = $x.Groups[2].Value
  $t = $t -replace '&lt;', '<' -replace '&gt;', '>' -replace '&amp;', '&' -replace '&quot;', '"'
  Write-Host $t
}
$s = [regex]::Match($html, '<div id="summary"[^>]*>(.*?)</div>')
Write-Host ''
Write-Host $s.Groups[1].Value
