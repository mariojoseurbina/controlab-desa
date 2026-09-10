@echo off
title Estado Servicio Sniffer Controlab IA
color 0b
cls

echo =====================================================================
echo         CONTROLAB IA - CONSULTA DE ESTADO SERVICIO SNIFFER
echo =====================================================================
echo.

set NSSM="C:\controlab-desa\tools\nssm.exe"
set SERVICE_NAME=ControlabSniffer
set LOG_FILE="C:\controlab-desa\logs\sniffer_service.log"

echo Estado del Servicio en Windows:
%NSSM% status %SERVICE_NAME%

echo.
echo Proceso en Ejecucion:
tasklist /fi "imagename eq wpcap_sniffer_final_loopback.exe"

echo.
echo =====================================================================
echo  Ultimas lineas del Log de Captura (%LOG_FILE%):
echo =====================================================================
if exist %LOG_FILE% (
    powershell -Command "Get-Content '%LOG_FILE%' -Tail 15"
) else (
    echo [!] El archivo de log aun no ha sido generado.
)

echo.
pause
