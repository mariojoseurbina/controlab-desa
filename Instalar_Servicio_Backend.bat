@echo off
title CONTROLAB - INSTALAR SERVICIO WINDOWS 24/7
color 0A
chcp 65001 > nul
cd /d "%~dp0"

echo ============================================================
echo   CONTROLAB - INSTALACION DE SERVICIO WINDOWS 24/7
echo   El servidor se iniciara automaticamente con Windows
echo   y se reiniciara solo si falla. Sin intervencion manual.
echo ============================================================
echo.

REM Verificar que se ejecuta como Administrador
net session > nul 2>&1
if errorlevel 1 (
    echo [ERROR] Debe ejecutar este script como ADMINISTRADOR.
    echo Click derecho en el archivo -> "Ejecutar como administrador"
    pause
    exit /b 1
)

set NSSM=C:\controlab-desa\tools\nssm.exe
set NODE=C:\Program Files\nodejs\node.exe
set SERVER=C:\controlab-desa\backend\server.js
set SERVICE_NAME=ControlabBackend
set LOG_DIR=C:\controlab-desa\logs
set APP_DIR=C:\controlab-desa\backend

REM Verificar existencia de archivos clave
if not exist "%NSSM%" (
    echo [ERROR] No se encontro nssm.exe en %NSSM%
    pause
    exit /b 1
)
if not exist "%NODE%" (
    echo [ERROR] No se encontro node.exe en %NODE%
    pause
    exit /b 1
)
if not exist "%SERVER%" (
    echo [ERROR] No se encontro server.js en %SERVER%
    pause
    exit /b 1
)

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

echo [1/7] Deteniendo servicio anterior si existe...
"%NSSM%" stop %SERVICE_NAME% > nul 2>&1
"%NSSM%" remove %SERVICE_NAME% confirm > nul 2>&1
REM Tambien limpiar el servicio viejo de node-windows si existe
sc stop "controlabiaserver.exe" > nul 2>&1
sc delete "controlabiaserver.exe" > nul 2>&1
echo     OK

echo [2/7] Instalando servicio Windows "%SERVICE_NAME%"...
"%NSSM%" install %SERVICE_NAME% "%NODE%" "%SERVER%"
if errorlevel 1 (
    echo [ERROR] No se pudo instalar el servicio. Ejecute como Administrador.
    pause
    exit /b 1
)
echo     OK

echo [3/7] Configurando directorio de trabajo...
"%NSSM%" set %SERVICE_NAME% AppDirectory "%APP_DIR%"
"%NSSM%" set %SERVICE_NAME% DisplayName "Controlab IA - Servidor Backend (24/7)"
"%NSSM%" set %SERVICE_NAME% Description "Servidor API de Controlab IA. Se inicia automaticamente con Windows y se recupera solo ante fallos o cortes de luz."
echo     OK

echo [4/7] Configurando inicio AUTOMATICO con Windows...
"%NSSM%" set %SERVICE_NAME% Start SERVICE_AUTO_START
echo     OK

echo [5/7] Configurando recuperacion automatica ante fallos...
REM Si el servidor cae: reiniciar en 5 segundos (3 intentos, luego 30 segundos)
"%NSSM%" set %SERVICE_NAME% AppRestartDelay 5000
"%NSSM%" set %SERVICE_NAME% AppThrottle 10000
REM Recuperacion ante fallo de Windows (primer fallo: reiniciar, segundo: reiniciar, tercero: reiniciar)
sc failure %SERVICE_NAME% reset= 86400 actions= restart/5000/restart/10000/restart/30000 > nul 2>&1
echo     OK

echo [6/7] Configurando logs rotativos...
"%NSSM%" set %SERVICE_NAME% AppStdout "%LOG_DIR%\controlab_backend.log"
"%NSSM%" set %SERVICE_NAME% AppStderr "%LOG_DIR%\controlab_backend_error.log"
"%NSSM%" set %SERVICE_NAME% AppRotateFiles 1
"%NSSM%" set %SERVICE_NAME% AppRotateBytes 10485760
echo     OK

echo [7/7] Iniciando el servicio...
"%NSSM%" start %SERVICE_NAME%
timeout /t 3 /nobreak > nul

REM Verificar que el servicio inicio correctamente
sc query %SERVICE_NAME% | findstr "RUNNING" > nul 2>&1
if errorlevel 1 (
    echo [AVISO] El servicio puede estar iniciando, verifique en algunos segundos.
    echo         Para ver el estado: sc query %SERVICE_NAME%
    echo         Para ver logs: type %LOG_DIR%\controlab_backend_error.log
) else (
    echo     OK - Servicio RUNNING
)

echo.
echo ============================================================
echo   SERVICIO INSTALADO EXITOSAMENTE
echo.
echo   Nombre: %SERVICE_NAME%
echo   Estado: Se verifica con -> sc query %SERVICE_NAME%
echo   Logs:   %LOG_DIR%\controlab_backend.log
echo.
echo   El servidor se inicia automaticamente con Windows.
echo   Si el proceso falla, se reinicia solo en 5 segundos.
echo   NO necesita intervencion manual en el cliente.
echo ============================================================
echo.
pause
