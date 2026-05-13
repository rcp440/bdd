# Actualiza la URL de Cloudflare en los HTML del repo y pushea a GitHub

# ---- Directorio del repo ----
# Dejar vacío para detección automática, o poner la ruta completa:
# Ej: $repoDirManual = "C:\bdd"
$repoDirManual = ""

$repoDir = $null
$candidatos = @(
    $PSScriptRoot,
    "C:\bdd",
    "$env:USERPROFILE\bdd",
    "C:\Datos\VSCode\Asistencia\Sql Server"
)
if ($repoDirManual -ne "") { $candidatos = @($repoDirManual) + $candidatos }
foreach ($c in $candidatos) {
    if ($c -and (Test-Path (Join-Path $c "index.html"))) { $repoDir = $c; break }
}
if (-not $repoDir) {
    Write-Host "[ERROR] No se encontro el directorio del repo con los archivos HTML." -ForegroundColor Red
    Write-Host "        Edita actualizar-url.ps1 y pon la ruta en la variable `$repoDirManual" -ForegroundColor Yellow
    exit 1
}
Write-Host "Repo: $repoDir" -ForegroundColor DarkGray

# ---- URL nueva ----
$nuevaUrl = Read-Host "Pega la nueva URL de Cloudflare (ej: https://xxxx.trycloudflare.com)"
$nuevaUrl = $nuevaUrl.TrimEnd('/')

if (-not $nuevaUrl.StartsWith("https://")) {
    Write-Host "[ERROR] La URL debe comenzar con https://" -ForegroundColor Red
    exit 1
}

$apiUrl = "$nuevaUrl/api"

$archivos = @("index.html", "app.html", "admin.html", "stats.html")

foreach ($archivo in $archivos) {
    $ruta = Join-Path $repoDir $archivo
    if (-not (Test-Path $ruta)) {
        Write-Host "[AVISO] No se encontro: $archivo" -ForegroundColor Yellow
        continue
    }

    $contenido = Get-Content $ruta -Raw -Encoding UTF8
    $urlAnterior = [regex]::Match($contenido, "https://[^'`"]+\.trycloudflare\.com/api").Value

    if ($urlAnterior -eq "") {
        Write-Host "[SKIP]  Sin URL Cloudflare: $archivo" -ForegroundColor DarkGray
        continue
    }

    $contenido = $contenido -replace [regex]::Escape($urlAnterior), $apiUrl
    Set-Content $ruta -Value $contenido -Encoding UTF8 -NoNewline

    Write-Host "[OK]   $archivo" -ForegroundColor Green
    Write-Host "       $urlAnterior" -ForegroundColor DarkGray
    Write-Host "    -> $apiUrl" -ForegroundColor White
}

Write-Host ""
$confirmar = Read-Host "Publicar en GitHub ahora? (s/n)"
if ($confirmar -eq "s" -or $confirmar -eq "S") {
    Set-Location $repoDir
    git add index.html app.html admin.html stats.html
    git commit -m "Actualizar URL Cloudflare: $nuevaUrl"
    git push
    Write-Host ""
    Write-Host "[OK] Publicado en GitHub." -ForegroundColor Green
} else {
    Write-Host "No publicado. Ejecuta git push cuando quieras." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Listo." -ForegroundColor Cyan
