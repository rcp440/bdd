# ============================================================
# deploy.ps1 — Descarga y arranca la última versión del servidor
# Uso: .\deploy.ps1
# ============================================================

$destino   = "C:\bdd"
$zipTmp    = "C:\bdd.zip"
$repoUrl   = "https://github.com/rcp440/bdd/archive/refs/heads/main.zip"
$envOrigen = ""   # <-- Si quiere que el script copie el .env automáticamente,
                  #     ponga aquí la ruta completa, ej: "C:\config\.env"

Write-Host ""
Write-Host "=== DEPLOY bdd ===" -ForegroundColor Cyan

# 1. Detener proceso node anterior si está corriendo
$nodePid = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess | Select-Object -First 1
if ($nodePid) {
    Write-Host "Deteniendo servidor Node anterior (PID $nodePid)..." -ForegroundColor Yellow
    Stop-Process -Id $nodePid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# 2. Borrar carpeta anterior
if (Test-Path $destino) {
    Write-Host "Borrando $destino..." -ForegroundColor Yellow
    Remove-Item -Path $destino -Recurse -Force
}

# 3. Descargar ZIP desde GitHub
Write-Host "Descargando desde GitHub..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $repoUrl -OutFile $zipTmp

# 4. Descomprimir y renombrar
Write-Host "Descomprimiendo..." -ForegroundColor Yellow
Expand-Archive -Path $zipTmp -DestinationPath "C:\" -Force
Rename-Item "C:\bdd-main" $destino
Remove-Item $zipTmp

# 5. Copiar .env si se configuró una ruta origen
if ($envOrigen -and (Test-Path $envOrigen)) {
    Write-Host "Copiando .env desde $envOrigen..." -ForegroundColor Yellow
    Copy-Item -Path $envOrigen -Destination "$destino\.env"
} else {
    Write-Host "AVISO: recuerde copiar el archivo .env a $destino antes de iniciar." -ForegroundColor Magenta
    Write-Host "       (o configure la variable `$envOrigen al inicio de este script)" -ForegroundColor Magenta
}

# 6. Instalar dependencias
Write-Host "Instalando dependencias npm..." -ForegroundColor Yellow
Set-Location $destino
$npmCli = "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js"
if (-not (Test-Path $npmCli)) { $npmCli = "$env:APPDATA\npm\node_modules\npm\bin\npm-cli.js" }
node $npmCli install --silent

# 7. Verificar que existe .env antes de arrancar
if (-not (Test-Path "$destino\.env")) {
    Write-Host ""
    Write-Host "ERROR: No se encontró el archivo .env en $destino" -ForegroundColor Red
    Write-Host "       Copie el .env y luego ejecute:  node server.js" -ForegroundColor Red
    exit 1
}

# 8. Arrancar el servidor
Write-Host ""
Write-Host "Iniciando servidor Node..." -ForegroundColor Green
node server.js
