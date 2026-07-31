$ErrorActionPreference = 'Stop'
$root = Join-Path $env:LOCALAPPDATA 'InsertiaLocalBridge'
$base = 'https://subvenciones-rag.vercel.app/local-bridge/20260731r1'
$runner = 'run-folder-inventory.mjs'
$hashes = @{ 'connector.mjs'='3E080646049354DA5AAE660702B685954C3BB8717230E67F9EA9E30D79175662'; 'run-folder-inventory.mjs'='CFF94D9CD1BF6ADAE20DC603A0374B729162F93E3E7FEE9F5E806E622DF6F92D' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Instala Node.js 20 o superior antes de continuar.' }
New-Item -ItemType Directory -Force -Path $root | Out-Null
$connector = Join-Path $root 'connector.mjs'; $inventory = Join-Path $root $runner
Invoke-WebRequest -UseBasicParsing "$base/connector.mjs" -OutFile $connector
Invoke-WebRequest -UseBasicParsing "$base/$runner" -OutFile $inventory
if ((Get-FileHash $connector -Algorithm SHA256).Hash -ne $hashes['connector.mjs'] -or (Get-FileHash $inventory -Algorithm SHA256).Hash -ne $hashes[$runner]) { throw 'La comprobación de integridad del conector ha fallado.' }
Get-NetTCPConnection -LocalPort 43173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
$launcher = "@echo off`r`nnode `"$root\connector.mjs`"`r`n"
Set-Content -Path (Join-Path $root 'Iniciar Insertia Local Bridge.cmd') -Value $launcher -Encoding ascii
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "`"$root\Iniciar Insertia Local Bridge.cmd`"" -WindowStyle Hidden
Write-Host 'Conector local actualizado. Vuelve a Insertia y pulsa Continuar.'
