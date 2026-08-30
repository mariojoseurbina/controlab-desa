@echo off
title Controlab-DESA - Lanzador de Desarrollo
color 0b
cls

echo =====================================================================
echo                CONTROLAB IA - ENTORNO DE DESARROLLO (DESA)
echo =====================================================================
echo.
echo  [1] Iniciar Servidores normalmente (Mantener base de datos actual)
echo  [2] RESTABLECER Base de Datos de Desarrollo e Iniciar
echo  [3] Salir
echo.
echo =====================================================================
set /p opcion="Seleccione una opcion (1, 2 o 3): "

if "%opcion%"=="3" exit

if "%opcion%"=="2" (
    echo.
    echo [PROCESO] Restableciendo base de datos SQL Server para Desarrollo...
    cd /d c:\controlab-desa\backend
    call npx prisma db push --accept-data-loss
    call node prisma/seed.js
    echo.
    echo [OK] Base de datos de desarrollo inicializada.
    echo.
)

echo.
echo [PROCESO] Iniciando servidor Backend (Express)...
start cmd /k "title Backend Desarrollo && cd /d c:\controlab-desa\backend && npm run dev"

echo [PROCESO] Esperando a que el backend este en linea...
timeout /t 5

echo [PROCESO] Iniciando servidor Frontend (React)...
start cmd /k "title Frontend Desarrollo && cd /d c:\controlab-desa\frontend && npm start"

echo.
echo =====================================================================
echo  🚀 ¡Servidores de desarrollo iniciados en c:\controlab-desa!
echo  - Puedes acceder desde tu navegador en: http://localhost:3000/
echo =====================================================================
echo.
pause