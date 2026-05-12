# ============================================================
# tunnel.ps1 — Inicia un túnel Cloudflare y actualiza la URL
# Uso: .\tunnel.ps1
# ============================================================

$logFile   = "$env:TEMP\cloudflared_tunnel.log"
$repoDir   = $PSScriptRoot
$archivos  = @("index.html", "app.html", "admin.html", "stats.html")
$timeoutSeg = 30

# Limpiar log anterior
if (Test-Path $logFile) { Remove-Item $logFile -Force }

Write-Host ""
Write-Host "=== TUNNEL CLOUDFLARE ===" -ForegroundColor Cyan
Write-Host "Iniciando cloudflared..." -ForegroundColor Yellow

# Arrancar cloudflared en background capturando stderr (donde aparece la URL)
$proc = Start-Process cloudflared `
    -ArgumentList "tunnel --url http://localhost:3000" `
    -RedirectStandardError $logFile `
    -PassThru -NoNewWindow

# Esperar hasta que aparezca la URL en el log
$url = $null
$elapsed = 0
Write-Host "Esperando URL" -NoNewline
while (-not $url -and $elapsed -lt $timeoutSeg) {
    Start-Sleep -Seconds 1
    $elapsed++
    Write-Host "." -NoNewline
    if (Test-Path $logFile) {
        $txt = Get-Content $logFile -Raw -ErrorAction SilentlyContinue
        $m = [regex]::Match($txt, "https://[a-z0-9\-]+\.trycloudflare\.com")
        if ($m.Success) { $url = $m.Value }
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
