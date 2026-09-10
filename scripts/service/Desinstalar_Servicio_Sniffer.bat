@echo off
title Desinstalar Servicio Sniffer Controlab IA
color 0c
cls

echo =====================================================================
echo           CONTROLAB IA - DESINSTALADOR DE SERVICIO WINDOWS
echo =====================================================================
echo.

set NSSM="C:\controlab-desa\tools\nssm.exe"
set SERVICE_NAME=ControlabSniffer

echo Deteniendo y eliminando servicio '%SERVICE_NAME%'...
%NSSM% stop %SERVICE_NAME%
%NSSM% remove %SERVICE_NAME% confirm

echo.
echo [OK] Servicio '%SERVICE_NAME%' desinstalado correctamente.
echo.
pause
