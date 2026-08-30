@echo off
:: Forzar a Windows a situarse en la carpeta donde está guardado este archivo .bat
cd /d "%~dp0"

echo ==============================================
echo   INICIANDO CONTROLAB IA EN MODO DESARROLLO
echo ==============================================
echo.
echo Iniciando servidor Backend (puerto 5000)...
start cmd /k "cd backend && npm run dev"
echo.
echo Iniciando servidor Frontend (puerto 3000)...
start cmd /k "cd frontend && npm start"
echo.
echo ==============================================
echo Las consolas de desarrollo se estan abriendo en ventanas separadas.
echo Puedes ver los logs de red del Sniffer en la consola del Backend.
echo ==============================================
pause
