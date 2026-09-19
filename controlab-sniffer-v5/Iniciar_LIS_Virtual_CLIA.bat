@echo off
title LIS Virtual - Receptor Directo CLIA 900i (Puerto 5150)
color 0b
cls

echo =====================================================================
echo            CONTROLAB IA - LIS VIRTUAL (EMULADOR CLIA 900i)
echo =====================================================================
echo.
echo Este modulo recibe las tramas directamente del CLIA 900i en el 
echo puerto 5150 y las envia al sistema Controlab sin necesidad de sniffer.
echo.
echo Presiona Ctrl+C para detener.
echo =====================================================================
echo.

cd /d "C:\controlab-desa"
node LIS_Virtual_CLIA.js
pause
