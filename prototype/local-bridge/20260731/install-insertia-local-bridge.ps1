$ErrorActionPreference = 'Stop'
$root = Join-Path $env:LOCALAPPDATA 'InsertiaLocalBridge'
$base = 'https://subvenciones-rag.vercel.app/local-bridge/20260731'
$files = @('connector.mjs','scripts/local-bridge/run-folder-inventory.mjs')
$pythonBase = 'https://raw.githubusercontent.com/vi100mira/subvenciones/5eb8de8ca9775ae38276b2d696a34bf59130dd82/scripts/private-corpus'
$hashes = @{ 'connector.mjs'='DD1FE478B54F5883B495ED50A920956B2895BB343C7DFC809F488286481A1FF9'; 'scripts/local-bridge/run-folder-inventory.mjs'='A80A0B4088DA0BD0B3F63260DD7704A235C96F84993A7A801B6808AD1CA53A62'; 'inventory_document_templates.py'='C5F63FF1ACD677E885AEC3422F40041076EC1D19863726992B66FCD8D52EDF5C'; 'build_master_draft.py'='3F18F07D98808D15796DD9FEE658B284EB7F42A4C758342A00C3FD764644A104'; 'master_docx.py'='2E0F3149473EB4BDAAE6EB949CA439F51BAFB5B5B9F85F230C8DFC11581FB90B' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Instala Node.js 20 o superior antes de continuar.' }
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw 'Instala Python 3.11 o superior antes de continuar.' }
python -c "import docx,openpyxl,pypdf" 2>$null
if ($LASTEXITCODE -ne 0) { throw 'Instala los lectores locales: pip install python-docx openpyxl pypdf.' }
New-Item -ItemType Directory -Force -Path $root | Out-Null
foreach ($file in $files) { $destination = Join-Path $root $file; New-Item -ItemType Directory -Force -Path (Split-Path $destination) | Out-Null; Invoke-WebRequest -UseBasicParsing "$base/$file" -OutFile $destination; if ((Get-FileHash $destination -Algorithm SHA256).Hash -ne $hashes[$file]) { throw "Integridad inválida: $file" } }
foreach ($file in @('inventory_document_templates.py','build_master_draft.py','master_docx.py')) { $destination = Join-Path $root "scripts/private-corpus/$file"; New-Item -ItemType Directory -Force -Path (Split-Path $destination) | Out-Null; Invoke-WebRequest -UseBasicParsing "$pythonBase/$file" -OutFile $destination; if ((Get-FileHash $destination -Algorithm SHA256).Hash -ne $hashes[$file]) { throw "Integridad inválida: $file" } }
$launcher = "@echo off`r`nnode `"$root\connector.mjs`"`r`n"
Set-Content -Path (Join-Path $root 'Iniciar Insertia Local Bridge.cmd') -Value $launcher -Encoding ascii
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "`"$root\Iniciar Insertia Local Bridge.cmd`"" -WindowStyle Hidden
Write-Host 'Conector local iniciado. Vuelve a Insertia y pulsa Conectar carpeta local.'
