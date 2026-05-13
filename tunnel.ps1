# ============================================================
# tunnel.ps1 — Inicia un túnel Cloudflare y actualiza la URL
# Uso: .\tunnel.ps1
# ============================================================

$logFile   = "$env:TEMP\cloudflared_tunnel.log"
$repoDir   = $PSScriptRoot
$archivos  = @("index.html", "app.html", "admin.html", "stats.html")
$timeoutSeg = 40

Write-Host ""
Write-Host "=== TUNNEL CLOUDFLARE ===" -ForegroundColor Cyan

# Buscar cloudflared: PATH primero, luego ubicaciones comunes
$cloudflaredExe = $null
$ubicacionesComunes = @(
    "$env:USERPROFILE\Desktop\cloudflared.exe",
    "$env:USERPROFILE\Downloads\cloudflared.exe",
    "C:\cloudflared\cloudflared.exe",
    "C:\tools\cloudflared.exe",
    "C:\Program Files\cloudflared\cloudflared.exe"
)

if (Get-Command cloudflared -ErrorAction SilentlyContinue) {
    $cloudflaredExe = "cloudflared"
} else {
    foreach ($ruta in $ubicacionesComunes) {
        if (Test-Path $ruta) { $cloudflaredExe = $ruta; break }
    }
}

if (-not $cloudflaredExe) {
    Write-Host ""
    Write-Host "[ERROR] No se encontro cloudflared.exe" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Descargalo desde:" -ForegroundColor Yellow
    Write-Host "  https://github.com/cloudflare/cloudflared/releases/latest" -ForegroundColor Cyan
    Write-Host "  -> Bajar: cloudflared-windows-amd64.exe" -ForegroundColor Cyan
    Write-Host "  -> Renombrarlo a cloudflared.exe" -ForegroundColor Cyan
    Write-Host "  -> Copiarlo al Escritorio o a C:\cloudflared\" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}

Write-Host "Usando: $cloudflaredExe" -ForegroundColor DarkGray
Write-Host "Iniciando cloudflared..." -ForegroundColor Yellow

# Limpiar log anterior
if (Test-Path $logFile) { Remove-Item $logFile -Force }

# Arrancar cloudflared en background capturando stderr y stdout (la URL puede aparecer en cualquiera)
$proc = Start-Process $cloudflaredExe `
    -ArgumentList "tunnel --url http://localhost:3000" `
    -RedirectStandardError $logFile `
    -RedirectStandardOutput "$logFile.stdout" `
    -PassThru -NoNewWindow

# Esperar hasta que aparezca la URL en el log (stderr o stdout)
$url = $null
$elapsed = 0
Write-Host "Esperando URL" -NoNewline
while (-not $url -and $elapsed -lt $timeoutSeg) {
    Start-Sleep -Seconds 1
    $elapsed++
    Write-Host "." -NoNewline
    foreach ($f in @($logFile, "$logFile.stdout")) {
        if (Test-Path $f) {
            $txt = Get-Content $f -Raw -ErrorAction SilentlyContinue
            if ($txt) {
                $m = [regex]::Match($txt, "https://[a-z0-9\-]+\.trycloudflare\.com")
                if ($m.Success) { $url = $m.Value; break }
            }
        }
    }
}
Write-Host ""

if (-not $url) {
    Write-Host "[ERROR] No se pudo obtener la URL en $timeoutSeg segundos." -ForegroundColor Red
    Write-Host "        Verifique que cloudflared esté instalado y el servidor Node esté corriendo." -ForegroundColor Red
    $proc | Stop-Process -Force -ErrorAction SilentlyContinue
    exit 1
}

$apiUrl = "$url/api"
Write-Host ""
Write-Host "[URL]  $url" -ForegroundColor Green
Write-Host "[API]  $apiUrl" -ForegroundColor Green
Write-Host ""

# Actualizar archivos HTML
foreach ($archivo in $archivos) {
    $ruta = Join-Path $repoDir $archivo
    if (-not (Test-Path $ruta)) {
        Write-Host "[SKIP] No existe: $archivo" -ForegroundColor DarkGray
        continue
    }
    $contenido = Get-Content $ruta -Raw -Encoding UTF8
    $anterior = [regex]::Match($contenido, "https://[^'`"]+\.trycloudflare\.com/api").Value
    if (-not $anterior) {
        Write-Host "[SKIP] Sin URL Cloudflare: $archivo" -ForegroundColor DarkGray
        continue
    }
    $contenido = $contenido -replace [regex]::Escape($anterior), $apiUrl
    Set-Content $ruta -Value $contenido -Encoding UTF8 -NoNewline
    Write-Host "[OK]   $archivo actualizado" -ForegroundColor Green
    Write-Host "       $anterior" -ForegroundColor DarkGray
    Write-Host "    -> $apiUrl" -ForegroundColor White
}

# Push a GitHub
Write-Host ""
$confirmar = Read-Host "Publicar en GitHub ahora? (s/n)"
if ($confirmar -eq "s" -or $confirmar -eq "S") {
    Set-Location $repoDir
    git add ($archivos | ForEach-Object { $_ })
    git commit -m "Actualizar URL Cloudflare: $url"
    git push
    Write-Host ""
    Write-Host "[OK] Publicado en GitHub." -ForegroundColor Green
} else {
    Write-Host "No publicado. Ejecute git push cuando quiera." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Túnel activo. Presione Ctrl+C para detenerlo." -ForegroundColor Cyan
$proc.WaitForExit()
