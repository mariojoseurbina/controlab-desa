@echo off
title CONTROLAB IA - ACTUALIZAR EN CLIENTE
color 0B
echo ========================================================
echo   CONTROLAB IA - DESCARGAR ACTUALIZACION EN EL CLIENTE
echo ========================================================
cd /d "%~dp0"

:: Usar el motor Git integrado
set "GIT_CMD=%~dp0git\cmd\git.exe"
if not exist "%GIT_CMD%" set "GIT_CMD=git"

echo 1. Descargando las ultimas modificaciones desde GitHub...
"%GIT_CMD%" pull origin main

echo.
echo 2. Actualizando esquema de base de datos...
if exist "backend\run_prisma_raw_migration.js" (
  cd backend
  node run_prisma_raw_migration.js
  cd ..
)

echo ========================================================
echo   Â¡EL SISTEMA HA SIDO ACTUALIZADO EN EL CLIENTE!
echo ========================================================
pause