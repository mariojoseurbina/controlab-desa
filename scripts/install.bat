@echo off
title Controlab IA - Instalación Completa
echo ===============================================
echo    CONTROLAB - IA - INSTALACION COMPLETA
echo ===============================================
echo.

echo 🔧 Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js no encontrado. Por favor instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js encontrado
echo.

echo 📦 Instalando dependencias del backend...
cd backend
call npm install
if errorlevel 1 (
    echo ❌ Error instalando dependencias del backend
    pause
    exit /b 1
)
echo ✅ Backend dependencias instaladas
cd ..

echo 📦 Instalando dependencias del frontend...
cd frontend
call npm install
if errorlevel 1 (
    echo ❌ Error instalando dependencias del frontend
    pause
    exit /b 1
)
echo ✅ Frontend dependencias instaladas
cd ..

echo.
echo ===============================================
echo    INSTALACION COMPLETADA EXITOSAMENTE
echo ===============================================
echo.
echo 🚀 Para iniciar el sistema:
echo.
echo Terminal 1 - Backend:
echo   cd backend
echo   npm start
echo.
echo Terminal 2 - Frontend:
echo   cd frontend  
echo   npm start
echo.
echo 📊 El sistema estará disponible en:
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000
echo.
echo 👤 Credenciales de acceso:
echo   Usuario: admin
echo   Contraseña: admin123
echo.
pause