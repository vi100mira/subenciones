Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$secret = Read-Host "Introduce DRAFT_WORKER_GITHUB_TOKEN (entrada oculta)" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try {
  $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  if ([string]::IsNullOrWhiteSpace($token) -or -not ($token.StartsWith("github_pat_") -or $token.StartsWith("ghp_"))) {
    throw "El token no tiene el formato esperado de GitHub."
  }

  $startInfo = [Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = "cmd.exe"
  $startInfo.Arguments = "/d /c vercel env add DRAFT_WORKER_GITHUB_TOKEN production --sensitive --force"
  $startInfo.UseShellExecute = $false
  $startInfo.RedirectStandardInput = $true
  $startInfo.RedirectStandardOutput = $true
  $startInfo.RedirectStandardError = $true
  $startInfo.CreateNoWindow = $true

  $process = [Diagnostics.Process]::new()
  $process.StartInfo = $startInfo
  [void]$process.Start()
  $process.StandardInput.Write($token)
  $process.StandardInput.Close()
  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()
  if ($process.ExitCode -ne 0) {
    throw "Vercel no pudo guardar la credencial: $stderr"
  }
} finally {
  if ($pointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
  $token = $null
}

Write-Output "Credencial de despacho instalada en Vercel Production. El token no se ha mostrado."
