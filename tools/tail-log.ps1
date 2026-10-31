# Prints the last N harness log entries from a dumped DOM (diagnosing hangs).
param([Parameter(Mandatory = $true)][string]$Path, [int]$Last = 8)
$ErrorActionPreference = 'Stop'
$html = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
$ms = [regex]::Matches($html, '<div class="(p|sec|f|s)">([^<]*)</div>')
Write-Host ("total log entries: " + $ms.Count)
$start = [Math]::Max(0, $ms.Count - $Last)
for ($i = $start; $i -lt $ms.Count; $i++) {
  Write-Host ("[" + $ms[$i].Groups[1].Value + "] " + $ms[$i].Groups[2].Value)
}
$s = [regex]::Match($html, '<div id="summary"[^>]*>([^<]*)</div>')
Write-Host ''
Write-Host $s.Groups[1].Value
