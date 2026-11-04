$studioRoot = $PSScriptRoot
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) {
    & $nodeCommand.Source (Join-Path $studioRoot 'server.mjs')
} else {
  $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
  if ($pythonCommand) {
    Write-Host 'GSN Studio: open http://localhost:4187 in your browser. Press Ctrl+C to stop.'
    & $pythonCommand.Source -m http.server 4187 --bind 127.0.0.1 --directory $studioRoot
  } else {
    Write-Host 'Python was not found. Open index.html directly for editing; HTML export requires serving this folder with a local static server.'
    Start-Process -FilePath (Join-Path $studioRoot 'index.html')
  }
}
