@echo off
title Controlab IA - Iniciando Sistema
echo ===============================================
echo    CONTROLAB - IA - INICIANDO SISTEMA
echo ===============================================
echo.

echo 🔍 Verificando instalación...
if not exist "backend\node_modules" (
    echo ❌ Backend no instalado. Ejecute install.bat primero
    pause
    exit /b 1
)

if not exist "frontend\node_modules" (
    echo ❌ Frontend no instalado. Ejecute install.bat primero
    pause
    exit /b 1
)

echo ✅ Sistema verificado
echo.

echo 🚀 Iniciando servicios...
echo.
echo 📍 Abriendo ventanas de comandos...
echo.

start cmd /k "cd backend && echo Iniciando Backend... && npm start"
timeout /t 3 /nobreak >nul

start cmd /k "cd frontend && echo Iniciando Frontend... && npm start"

echo.
echo ✅ Servicios iniciados
echo.
echo 📊 El sistema estará disponible en:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000
echo.
echo ⏰ Espere unos segundos para que los servicios se inicien completamente
echo.
pause