@echo off
title LIS Virtual - Conector Cliente CLIA 900i
color 0b
cls

echo =====================================================================
echo            CONTROLAB IA - LIS VIRTUAL (MODO CLIENTE)
echo =====================================================================
echo.
echo Este script se CONECTARA al CLIA 900i asumiendo que el analizador 
echo esta funcionando como Servidor TCP en la IP 192.168.30.211:5150
echo.
echo Presiona Ctrl+C para detener.
echo =====================================================================
echo.

cd /d "C:\controlab-desa"
node LIS_Client_CLIA.js
pause
