@echo off
echo =======================================================
echo Conectando controlab-desa con GitHub (controlabIA)...
echo =======================================================
cd /d C:\controlab-desa

echo [1/5] Inicializando repositorio Git...
git init

echo [2/5] Configurando remoto origin a controlabIA...
git remote remove origin 2>nul
git remote add origin https://github.com/mariojoseurbina/controlabIA.git

echo [3/5] Agregando archivos de codigo...
git add .

echo Configurando identidad de usuario...
git config user.name "Mario Jose Urbina"
git config user.email "mariojoseurbina@gmail.com"

echo [4/5] Creando commit de sincronizacion...
git commit -m "Sincronizacion de controlab-desa como repositorio activo de desarrollo"


echo [5/5] Subiendo cambios a GitHub...
git branch -M main
git push -u origin main --force

echo =======================================================
echo ¡Proceso completado! controlab-desa ahora esta en GitHub.
echo =======================================================
pause
