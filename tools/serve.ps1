<#
.SYNOPSIS
  Minimal static file server for development and headless testing.

.DESCRIPTION
  There is no python or node on this machine, and ES modules (dev.html) will not
  load over file://. This uses a raw TcpListener instead of HttpListener, so it
  needs no `netsh http add urlacl` reservation and no administrator rights.

  It serves only files under -Root, refuses traversal, and closes every
  connection (HTTP/1.1 with Connection: close). Ctrl+C or Stop-Process to end it.

.PARAMETER Port
  TCP port on 127.0.0.1. Default 8123.

.PARAMETER Root
  Directory to serve. Default: the parent of the tools folder (the project root).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\serve.ps1 -Port 8123
#>
[CmdletBinding()]
param(
  [int]$Port = 8123,
  [string]$Root = ''
)

$ErrorActionPreference = 'Stop'

# $PSScriptRoot is empty under some hosts/versions, so fall back to $MyInvocation.
if ([string]::IsNullOrEmpty($Root)) {
  $scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Definition }
  $Root = Split-Path -Parent $scriptDir
}
$rootFull = [System.IO.Path]::GetFullPath($Root)

$types = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.json' = 'application/json; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.png'  = 'image/png'
  '.ico'  = 'image/x-icon'
}

$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
Write-Host "serving $rootFull on http://127.0.0.1:$Port/  (Ctrl+C to stop)"

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $client.ReceiveTimeout = 5000
      $client.SendTimeout = 5000
      $stream = $client.GetStream()

      # read the request head (up to the blank line); we ignore the body entirely
      $ms = New-Object System.IO.MemoryStream
      $buf = New-Object byte[] 4096
      $head = ''
      while ($true) {
        $n = $stream.Read($buf, 0, $buf.Length)
        if ($n -le 0) { break }
        $ms.Write($buf, 0, $n)
        $head = [System.Text.Encoding]::ASCII.GetString($ms.ToArray())
        if ($head.Contains("`r`n`r`n") -or $head.Contains("`n`n")) { break }
      }

      $reqLine = ($head -split "`r?`n")[0]
      $bits = $reqLine -split '\s+'
      $target = if ($bits.Count -ge 2) { $bits[1] } else { '/' }

      $status = '200 OK'
      $ctype = 'application/octet-stream'
      $body = New-Object byte[] 0

      $rel = [System.Uri]::UnescapeDataString(($target -split '\?')[0]).TrimStart('/')
      if ($rel -eq '') { $rel = 'index.html' }
      $full = [System.IO.Path]::GetFullPath((Join-Path $rootFull $rel))

      if (-not $full.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        $status = '403 Forbidden'
        $body = [System.Text.Encoding]::UTF8.GetBytes('forbidden')
        $ctype = 'text/plain; charset=utf-8'
      } elseif (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
        $status = '404 Not Found'
        $body = [System.Text.Encoding]::UTF8.GetBytes("not found: $rel")
        $ctype = 'text/plain; charset=utf-8'
      } else {
        $body = [System.IO.File]::ReadAllBytes($full)
        $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
        if ($types.ContainsKey($ext)) { $ctype = $types[$ext] }
      }

      $hdr = "HTTP/1.1 $status`r`n" +
             "Content-Type: $ctype`r`n" +
             "Content-Length: $($body.Length)`r`n" +
             "Cache-Control: no-store`r`n" +
             "Connection: close`r`n`r`n"
      $hb = [System.Text.Encoding]::ASCII.GetBytes($hdr)
      $stream.Write($hb, 0, $hb.Length)
      if ($body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
      $stream.Flush()
    } catch {
      # a broken pipe from a browser that hung up is normal; keep serving
    } finally {
      $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
