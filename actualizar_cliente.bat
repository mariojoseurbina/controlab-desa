@echo off
title CONTROLAB IA - ACTUALIZAR EN CLIENTE
color 0B
echo ========================================================
echo   CONTROLAB IA - DESCARGAR ACTUALIZACION EN EL CLIENTE
echo ========================================================
cd /d "%~dp0"

echo 1. Descargando las ultimas modificaciones desde GitHub...
git pull origin main

echo 2. Actualizando esquema de base de datos...
if exist "backend\run_prisma_raw_migration.js" (
  cd backend
  node run_prisma_raw_migration.js
  cd ..
)

echo ========================================================
echo   ¡EL SISTEMA HA SIDO ACTUALIZADO EN EL CLIENTE!
echo ========================================================
pause
