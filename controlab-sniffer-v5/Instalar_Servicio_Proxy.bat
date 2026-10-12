@echo off
title Instalar Servicio Proxy Controlab
color 0a



set NSSM="C:\controlab-desa\tools\nssm.exe"
set SERVICE_NAME="ControlabProxyV5"
set APP_DIR="C:\controlab-desa\controlab-sniffer-v5"
set LOG_DIR="C:\controlab-desa\logs"

if not exist %LOG_DIR% mkdir %LOG_DIR%

echo Deteniendo servicio anterior si existia...
%NSSM% stop %SERVICE_NAME% >nul 2>&1
%NSSM% remove %SERVICE_NAME% confirm >nul 2>&1

echo Instalando servicio de Node.js...
%NSSM% install %SERVICE_NAME% "C:\Program Files\nodejs\node.exe" "\"C:\controlab-desa\controlab-sniffer-v5\server.js\""

%NSSM% set %SERVICE_NAME% AppDirectory %APP_DIR%
%NSSM% set %SERVICE_NAME% Description "Controlab IA TCP Proxy (CM 260i, Mindray BS-230, CLIA 900i)"
%NSSM% set %SERVICE_NAME% DisplayName "Controlab IA Proxy Server"
%NSSM% set %SERVICE_NAME% Start SERVICE_AUTO_START
%NSSM% set %SERVICE_NAME% AppRestartDelay 5000
%NSSM% set %SERVICE_NAME% AppStdout "%LOG_DIR%\proxy_service.log"
%NSSM% set %SERVICE_NAME% AppStderr "%LOG_DIR%\proxy_service_err.log"

echo Iniciando servicio...
%NSSM% start %SERVICE_NAME%

echo ¡Servicio Controlab Proxy instalado y corriendo!
pause
