$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$logDir = Join-Path $repoRoot ".tmp"
$logPath = Join-Path $logDir "public-radars-scheduled.log"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom
$env:PYTHONIOENCODING = "utf-8"

function Add-LogLine {
  param([string]$Text)
  [System.IO.File]::AppendAllText($logPath, "$Text$([Environment]::NewLine)", $utf8NoBom)
}

$pythonCandidates = @()
if ($env:PYTHON_BIN) {
  $pythonCandidates += $env:PYTHON_BIN
}

$pythonCommand = Get-Command python -ErrorAction SilentlyContinue
if ($pythonCommand) {
  $pythonCandidates += $pythonCommand.Source
}

$bundledPython = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if (Test-Path -LiteralPath $bundledPython) {
  $pythonCandidates += $bundledPython
}

$workingPython = $null
foreach ($candidate in ($pythonCandidates | Select-Object -Unique)) {
  try {
    & $candidate -c "import pypdf, pdfplumber" 2>$null
    if ($LASTEXITCODE -eq 0) {
      $workingPython = $candidate
      break
    }
  } catch {
    continue
  }
}

if (-not $workingPython) {
  throw "No se encontro un Python con pypdf y pdfplumber para los radares publicos."
}

$env:PYTHON_BIN = $workingPython
$startedAt = Get-Date -Format "o"
Add-LogLine "[$startedAt] Inicio de los workers publicos programados"

Push-Location $repoRoot
try {
  foreach ($campaign in @("municipal-social", "general-social")) {
    Add-LogLine "[$(Get-Date -Format "o")] Inicio de campa$([char]0x00F1)a $campaign"
    $output = & node "scripts/workers/run-municipal-radar.mjs" "--campaign=$campaign" "--apply=true" 2>&1 | Out-String
    $workerExitCode = $LASTEXITCODE
    [System.IO.File]::AppendAllText($logPath, $output, $utf8NoBom)
    Write-Output $output.TrimEnd()
    if ($workerExitCode -ne 0) {
      throw "El worker $campaign termino con codigo $workerExitCode."
    }
  }
  Add-LogLine "[$(Get-Date -Format "o")] Inicio de campa$([char]0x00F1)a private-open-funders"
  $output = & node "scripts/workers/run-private-funder-radar.mjs" "--apply=true" 2>&1 | Out-String
  $workerExitCode = $LASTEXITCODE
  [System.IO.File]::AppendAllText($logPath, $output, $utf8NoBom)
  Write-Output $output.TrimEnd()
  if ($workerExitCode -ne 0) {
    throw "El worker private-open-funders termino con codigo $workerExitCode."
  }
} finally {
  Pop-Location
}

$finishedAt = Get-Date -Format "o"
Add-LogLine "[$finishedAt] Fin de los workers publicos programados"
