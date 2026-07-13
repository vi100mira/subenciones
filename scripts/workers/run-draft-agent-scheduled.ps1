$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$logDir = Join-Path $repoRoot ".tmp"
$logPath = Join-Path $logDir "draft-agent-scheduled.log"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom

Push-Location $repoRoot
try {
  $output = & node "scripts/workers/run-draft-agent.mjs" 2>&1 | Out-String
  $exitCode = $LASTEXITCODE
  [System.IO.File]::AppendAllText($logPath, "[$(Get-Date -Format "o")]$([Environment]::NewLine)$output", $utf8NoBom)
  Write-Output $output.TrimEnd()
  if ($exitCode -ne 0) { throw "El worker del redactor terminó con código $exitCode." }
} finally {
  Pop-Location
}
