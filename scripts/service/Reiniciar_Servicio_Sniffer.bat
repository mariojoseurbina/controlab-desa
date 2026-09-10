@echo off
title Reiniciar Servicio Sniffer Controlab IA
color 0e
cls

echo =====================================================================
echo         CONTROLAB IA - REINICIAR SERVICIO SNIFFER
echo =====================================================================
echo.

set NSSM="C:\controlab-desa\tools\nssm.exe"
set SERVICE_NAME=ControlabSniffer

echo Reiniciando servicio '%SERVICE_NAME%'...
%NSSM% restart %SERVICE_NAME%

echo.
echo Estado actual:
%NSSM% status %SERVICE_NAME%
echo.
pause
