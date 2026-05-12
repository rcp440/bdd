# Actualiza la URL de Cloudflare en index.html y app.html, luego pushea a GitHub

$nuevaUrl = Read-Host "Pega la nueva URL de Cloudflare (ej: https://xxxx.trycloudflare.com)"
$nuevaUrl = $nuevaUrl.TrimEnd('/')

if (-not $nuevaUrl.StartsWith("https://")) {
    Write-Host "[ERROR] La URL debe comenzar con https://" -ForegroundColor Red
    exit 1
}

$apiUrl = "$nuevaUrl/api"

$archivos = @(
    ".\index.html",
    ".\app.html"
)

foreach ($archivo in $archivos) {
    if (-not (Test-Path $archivo)) {
        Write-Host "[AVISO] No se encontro: $archivo" -ForegroundColor Yellow
        continue
    }

    $contenido = Get-Content $archivo -Raw -Encoding UTF8
    $urlAnterior = [regex]::Match($contenido, "https://[^']+\.trycloudflare\.com/api").Value

    if ($urlAnterior -eq "") {
        Write-Host "[AVISO] No se encontro URL de Cloudflare en $archivo" -ForegroundColor Yellow
        continue
    }

    $contenido = $contenido -replace [regex]::Escape($urlAnterior), $apiUrl
    Set-Content $archivo -Value $contenido -Encoding UTF8 -NoNewline

    Write-Host "[OK] $archivo actualizado" -ForegroundColor Green
    Write-Host "     $urlAnterior  ->  $apiUrl"
}

Write-Host ""
$confirmar = Read-Host "Publicar en GitHub ahora? (s/n)"
if ($confirmar -eq "s" -or $confirmar -eq "S") {
    git add index.html app.html
    git commit -m "Actualizar URL Cloudflare: $nuevaUrl"
    git push
    Write-Host ""
    Write-Host "[OK] Publicado en GitHub. La app ya usa la nueva URL." -ForegroundColor Green
} else {
    Write-Host "No se publico. Cuando quieras, ejecuta: git add index.html app.html && git commit -m 'url' && git push" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Listo." -ForegroundColor Cyan
