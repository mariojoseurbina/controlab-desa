@echo off
title Detener Sniffer Controlab IA
color 0e
cls

echo =====================================================================
echo              CONTROLAB IA - DETENER SNIFFER
echo =====================================================================
echo.

echo Deteniendo proceso wpcap_sniffer_final_loopback.exe...
taskkill /F /IM wpcap_sniffer_final_loopback.exe >nul 2>&1

echo.
echo [OK] El Sniffer ha sido detenido correctamente.
echo.
pause
