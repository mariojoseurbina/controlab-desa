@echo off
echo ==============================================
echo       INICIANDO CONTROLAB - INTELIGENCIA ARTIFICIAL
echo ==============================================
echo.
echo Iniciando servidor local...
cd backend
start /b node server.js
echo.
echo Esperando 3 segundos para abrir el navegador...
timeout /t 3 /nobreak > nul
start http://localhost:5000
echo.
echo ==============================================
echo Listo! Si cierras esta ventana el servidor se detendra.
echo ==============================================
pause
