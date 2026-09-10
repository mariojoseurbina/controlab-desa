@echo off
title Desinstalar Servicio Sniffer Controlab IA
color 0c

:: Comprobar y solicitar elevacion de Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

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
