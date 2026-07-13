param(
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\.."))
)

$envPath = Join-Path $ProjectRoot ".env.local"
$secret = Read-Host "Introduce OPENAI_API_KEY (entrada oculta)" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
  $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
}
if ([string]::IsNullOrWhiteSpace($apiKey) -or -not $apiKey.StartsWith("sk-")) {
  throw "La clave no tiene el formato esperado de OpenAI."
}

$values = [ordered]@{
  AI_DRAFT_PROVIDER = "openai"
  AI_DRAFT_MODEL = "gpt-5.6-luna"
  AI_DRAFT_MONTHLY_BUDGET_EUR = "20"
  AI_DRAFT_MAX_OUTPUT_TOKENS = "6000"
  OPENAI_API_KEY = $apiKey
}
$lines = if (Test-Path $envPath) { [Collections.Generic.List[string]](Get-Content $envPath) } else { [Collections.Generic.List[string]]::new() }
foreach ($entry in $values.GetEnumerator()) {
  $prefix = "$($entry.Key)="
  $index = -1
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i].StartsWith($prefix)) { $index = $i; break }
  }
  if ($index -ge 0) { $lines[$index] = "$prefix$($entry.Value)" } else { $lines.Add("$prefix$($entry.Value)") }
}
[IO.File]::WriteAllLines($envPath, $lines, [Text.UTF8Encoding]::new($false))
Write-Output "Redactor OpenAI configurado localmente. La clave no se ha mostrado."
