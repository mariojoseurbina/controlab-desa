@echo off
title CONTROLAB IA - SUBIR CAMBIOS A GITHUB
color 0A
echo ========================================================
echo   CONTROLAB IA - SUBIR CAMBIOS DE HOY A GITHUB
echo ========================================================
cd /d "%~dp0"

set "GIT_DIR=%~dp0.git_controlab"
set "GIT_WORK_TREE=%~dp0"

git config user.name "Mario Jose Urbina"
git config user.email "mariojoseurbina@gmail.com"

git remote set-url origin https://github.com/mariojoseurbina/controlab-desa.git 2>nul || git remote add origin https://github.com/mariojoseurbina/controlab-desa.git

echo 1. Preparando archivos modificados del dia de hoy...
git add .

echo 2. Registrando resumen del trabajo realizado...
git commit -m "Actualizacion completa: Salida masiva con carrito, bifurcacion movimientos/sniffer, presentacion de manejo en historial, marcas y mayusculas"

echo 3. Subiendo modificaciones a GitHub (main)...
git branch -M main
git push -u origin main --force

echo ========================================================
echo   ¡EXITO! TODOS LOS CAMBIOS DE HOY ESTAN EN GITHUB.
echo ========================================================
pause
