@echo off
title CONTROLAB IA - SUBIR CAMBIOS A GITHUB
color 0A
echo ========================================================
echo   CONTROLAB IA - SUBIR CAMBIOS A GITHUB
echo ========================================================
cd /d "%~dp0"

set "PATH=%~dp0git\cmd;%PATH%"

git config user.name "Mario Jose Urbina"
git config user.email "mariojoseurbina@gmail.com"

git remote set-url origin https://github.com/mariojoseurbina/controlab-desa.git

echo 1. Verificando estado de cambios...
git status -s

echo 2. Preparando archivos modificados...
git add .

echo 3. Registrando commit de cambios recientes...
git commit -m "Actualizacion completa de desarrollo: regularizacion de lotes, sniffer y reglas de negocio" 2>nul

echo 4. Subiendo modificaciones a GitHub (main)...
git branch -M main
git push -u origin main --force

echo ========================================================
echo   PROCESO TERMINADO. VERIFICA ARRIBA EL RESULTADO.
echo ========================================================
pause