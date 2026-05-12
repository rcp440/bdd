@echo off
title Sistema de Asistencia - Arranque
color 0A

echo.
echo  ================================================
echo   SISTEMA DE ASISTENCIA - Iniciando servicios
echo  ================================================
echo.

cd /d C:\bdd

:: ---- Verificar Node.js ----
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js no encontrado. Instala Node.js y vuelve a intentar.
    pause
    exit /b 1
)

:: ---- Instalar PM2 si no esta ----
where pm2 >nul 2>&1
if errorlevel 1 (
    echo [INFO] PM2 no encontrado. Instalando...
    npm install -g pm2
    if errorlevel 1 (
        echo [ERROR] No se pudo instalar PM2.
        pause
        exit /b 1
    )
    echo [OK] PM2 instalado.
    echo.
)

:: ---- Verificar cloudflared ----
where cloudflared >nul 2>&1
if errorlevel 1 (
    if exist "C:\bdd\cloudflared.exe" (
        set CF_CMD=C:\bdd\cloudflared.exe
    ) else (
        echo [ERROR] cloudflared.exe no encontrado.
        echo         Descargalo desde:
        echo         https://github.com/cloudflare/cloudflared/releases/latest
        echo         y copialo a C:\bdd\cloudflared.exe
        pause
        exit /b 1
    )
) else (
    set CF_CMD=cloudflared
)

:: ---- Verificar .env ----
if not exist "C:\bdd\.env" (
    echo.
    echo [ERROR] No se encontro el archivo C:\bdd\.env
    echo.
    echo  Crealo con el siguiente contenido:
    echo  ----------------------------------------
    echo  SQL_SERVER=723d061ff476.sn.mynetname.net
    echo  SQL_PORT=2433
    echo  SQL_DATABASE=AsistenciaDB
    echo  SQL_USER=tu_usuario
    echo  SQL_PASSWORD=tu_contrasena
    echo  SQL_ENCRYPT=false
    echo  PORT=3000
    echo  ----------------------------------------
    echo.
    pause
    exit /b 1
)

:: ---- Detener procesos previos si existen ----
echo [INFO] Deteniendo procesos previos (si los hay)...
pm2 delete asistencia >nul 2>&1
pm2 delete tunnel >nul 2>&1
echo.

:: ---- Iniciar Cloudflare Tunnel con PM2 ----
echo [1/2] Iniciando Cloudflare Tunnel en segundo plano...
pm2 start "%CF_CMD%" --name tunnel -- tunnel --url http://localhost:3000
echo.

:: ---- Iniciar servidor Node.js con PM2 ----
echo [2/2] Iniciando servidor Node.js en segundo plano...
pm2 start server.js --name asistencia
echo.

:: ---- Guardar lista para que PM2 la recuerde ----
pm2 save

echo.
echo  ================================================
echo   Servicios iniciados - Ninguna ventana queda abierta
echo  ================================================
echo.
pm2 status
echo.
echo  Para ver la URL del tunel Cloudflare ejecuta:
echo    pm2 logs tunnel --lines 50
echo.
echo  Otros comandos utiles:
echo    pm2 status            - Estado de los servicios
echo    pm2 logs asistencia   - Logs del servidor Node
echo    pm2 restart all       - Reiniciar todo
echo    pm2 stop all          - Detener todo
echo.
echo  Para que arranque automatico al iniciar Windows (solo 1 vez):
echo    Ejecuta este comando como Administrador:
echo    pm2 startup
echo    Luego copia y ejecuta el comando que te muestre.
echo.
pause
