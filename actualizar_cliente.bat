@echo off
title CONTROLAB IA - ACTUALIZAR EN CLIENTE
color 0B
echo ========================================================
echo   CONTROLAB IA - DESCARGAR ACTUALIZACION EN EL CLIENTE
echo ========================================================
cd /d "%~dp0"

:: Usar el motor Git integrado o del sistema
set "GIT_CMD=%~dp0git\cmd\git.exe"
if not exist "%GIT_CMD%" set "GIT_CMD=git"

echo 1. Descargando las ultimas modificaciones desde GitHub...
"%GIT_CMD%" pull origin main

echo.
echo 2. Compilando nueva version del Frontend (React)...
if exist "frontend\package.json" (
  cd frontend
  call npm run build
  cd ..
)

echo.
echo 3. Reiniciando servicio de backend...
if exist "Reiniciar_Controlab.bat" (
  call Reiniciar_Controlab.bat
)

echo ========================================================
echo   ¡EL SISTEMA HA SIDO ACTUALIZADO EN EL CLIENTE!
echo ========================================================
pause