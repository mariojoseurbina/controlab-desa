@echo off
title Instalador Servicio Sniffer Controlab IA
color 0a
cls

echo =====================================================================
echo           CONTROLAB IA - INSTALADOR DE SERVICIO WINDOWS (24/7)
echo =====================================================================
echo.

set NSSM="C:\controlab-desa\tools\nssm.exe"
set EXE="C:\controlab-desa\wpcap_sniffer_final_loopback.exe"
set APP_DIR="C:\controlab-desa"
set LOG_DIR="C:\controlab-desa\logs"
set SERVICE_NAME=ControlabSniffer

if not exist %NSSM% (
    echo [ERROR] No se encontro nssm.exe en %NSSM%
    pause
    exit /b 1
)

if not exist %EXE% (
    echo [ERROR] No se encontro el ejecutable en %EXE%
    pause
    exit /b 1
)

if not exist %LOG_DIR% mkdir %LOG_DIR%

echo [1/6] Deteniendo servicio anterior si existia...
%NSSM% stop %SERVICE_NAME% >nul 2>&1
%NSSM% remove %SERVICE_NAME% confirm >nul 2>&1

echo [2/6] Instalando servicio de Windows '%SERVICE_NAME%'...
%NSSM% install %SERVICE_NAME% %EXE%
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo registrar el servicio. Asegurese de ejecutar como Administrador.
    pause
    exit /b 1
)

echo [3/6] Configurando directorio de trabajo y descripcion...
%NSSM% set %SERVICE_NAME% AppDirectory %APP_DIR%
%NSSM% set %SERVICE_NAME% Description "Controlab IA - Sniffer de Captura de Red de Analizadores ASTM/HL7 (CM 260i y Mindray BS-230)"
%NSSM% set %SERVICE_NAME% DisplayName "Controlab IA - Sniffer Analizadores (24/7)"

echo [4/6] Configurando inicio automatico y recuperacion ante fallos...
%NSSM% set %SERVICE_NAME% Start SERVICE_AUTO_START
%NSSM% set %SERVICE_NAME% AppRestartDelay 5000
%NSSM% set %SERVICE_NAME% DependOnService npcap

echo [5/6] Configurando captura de logs en disco...
%NSSM% set %SERVICE_NAME% AppStdout "%LOG_DIR%\sniffer_service.log"
%NSSM% set %SERVICE_NAME% AppStderr "%LOG_DIR%\sniffer_service_err.log"
%NSSM% set %SERVICE_NAME% AppRotateFiles 1
%NSSM% set %SERVICE_NAME% AppRotateBytes 10485760

echo [6/6] Iniciando el servicio...
%NSSM% start %SERVICE_NAME%

echo.
echo =====================================================================
echo  [OK] Servicio '%SERVICE_NAME%' instalado e iniciado exitosamente!
echo  Arrancara automaticamente con Windows tras cortes de luz o reinicios.
echo  Consulte logs en: %LOG_DIR%\sniffer_service.log
echo =====================================================================
echo.
pause
