@echo off
title CONTROLAB - REINICIO LIMPIO DEL SERVIDOR
color 0E
chcp 65001 > nul
cd /d "%~dp0"

echo ============================================================
echo   REINICIO LIMPIO DE CONTROLAB
echo ============================================================
echo.

echo [1/3] Deteniendo todos los procesos Node.js...
taskkill /F /IM node.exe /T > nul 2>&1
timeout /t 2 /nobreak > nul
echo     OK - Procesos detenidos.

echo [2/3] Iniciando backend (servidor API)...
cd backend
start "Controlab Backend" /min cmd /c "node server.js > ..\backend_log.txt 2>&1"
cd ..

echo     OK - Backend iniciando...
timeout /t 4 /nobreak > nul

echo [3/3] Verificando que el servidor responde...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5000/api/dashboard/metrics' -TimeoutSec 10 -UseBasicParsing; Write-Host '    OK - Servidor respondiendo correctamente.' -ForegroundColor Green } catch { Write-Host '    AVISO: Servidor aun iniciando, espere 10 segundos y refresque el navegador.' -ForegroundColor Yellow }"

echo.
echo ============================================================
echo   CONTROLAB REINICIADO
echo   - Si el frontend ya estaba abierto: presiona F5 para refrescar
echo   - El servidor queda corriendo en segundo plano
echo ============================================================
pause
