@echo off
title CONTROLAB - SUBIR CAMBIOS A GITHUB
color 0A
chcp 65001 > nul
cd /d "%~dp0"

echo ============================================================
echo   CONTROLAB - SUBIR CAMBIOS A GITHUB
echo ============================================================

REM -- Verificar que git esta disponible
git --version > nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git no esta instalado o no esta en el PATH.
    pause
    exit /b 1
)

REM -- Detectar automaticamente la rama actual (nunca falla por nombre)
for /f "tokens=*" %%i in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set RAMA_ACTUAL=%%i

if "%RAMA_ACTUAL%"=="" (
    echo [ERROR] No se pudo detectar la rama actual. Verifica que esto es un repositorio git.
    pause
    exit /b 1
)

echo [INFO] Rama activa detectada: %RAMA_ACTUAL%
echo.

REM -- Configurar identidad git
git config user.name "Mario Jose Urbina"
git config user.email "mariojoseurbina@gmail.com"

REM -- Verificar y corregir el remote
git remote get-url origin > nul 2>&1
if errorlevel 1 (
    echo [INFO] Configurando remote origin...
    git remote add origin https://github.com/mariojoseurbina/controlab-desa.git
) else (
    git remote set-url origin https://github.com/mariojoseurbina/controlab-desa.git
)

echo 1. Preparando archivos modificados...
git add .

echo 2. Verificando si hay cambios para registrar...
git diff --cached --quiet
if not errorlevel 1 (
    echo [INFO] No hay cambios nuevos para subir. El repositorio esta al dia.
    echo ============================================================
    echo   SIN CAMBIOS NUEVOS - GitHub ya esta actualizado.
    echo ============================================================
    pause
    exit /b 0
)

REM -- Generar mensaje de commit automatico con fecha y hora
for /f "tokens=1-3 delims=/ " %%a in ('date /t') do set FECHA=%%a-%%b-%%c
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set HORA=%%a:%%b

set MENSAJE_COMMIT=Actualizacion %FECHA% %HORA% - Cambios en desarrollo Controlab

echo 3. Registrando cambios: %MENSAJE_COMMIT%
git commit -m "%MENSAJE_COMMIT%"

echo 4. Subiendo a GitHub en rama: %RAMA_ACTUAL%
git push origin %RAMA_ACTUAL%

if errorlevel 1 (
    echo.
    echo [ERROR] No se pudo subir a GitHub.
    echo [SOLUCION] Ejecuta: git pull origin %RAMA_ACTUAL% --rebase
    echo           Luego vuelve a ejecutar este script.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   EXITO! TODOS LOS CAMBIOS ESTAN EN GITHUB.
echo   Rama: %RAMA_ACTUAL%
echo   Repositorio: github.com/mariojoseurbina/controlab-desa
echo ============================================================
pause
