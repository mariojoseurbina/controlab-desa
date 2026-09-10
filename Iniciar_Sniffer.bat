@echo off
title Sniffer Controlab IA - Captura de Red Analizadores
color 0a
cls

echo =====================================================================
echo                CONTROLAB IA - INICIADOR DE SNIFFER
echo =====================================================================
echo.
echo Analizadores configurados en el laboratorio:
echo   - CM 260i:       192.168.10.188 (Puerto 5050)
echo   - Mindray BS-230: 192.168.30.148 (Puerto 5150 / 5050)
echo.
echo =====================================================================
echo  [1] Iniciar WPCAP Sniffer para CM 260i (wpcap_sniffer_final_loopback.exe)
echo  [2] Iniciar TCP Proxy Sniffer v5 (controlab-sniffer-v5/server.js)
echo  [3] Iniciar WPCAP Sniffer en modo General (todos los analizadores)
echo  [4] Salir
echo =====================================================================
set /p opt="Seleccione una opcion (1, 2, 3 o 4): "

if "%opt%"=="4" exit

if "%opt%"=="1" (
    echo.
    echo Iniciando wpcap_sniffer_final_loopback.exe configurado para CM 260i...
    cd /d "C:\controlab-desa"
    start "" "C:\controlab-desa\wpcap_sniffer_final_loopback.exe" --device "CM 260i" --url "http://localhost:5000/api/sniffer/webhook" --ip "192.168.10.188"
    goto end
)

if "%opt%"=="2" (
    echo.
    echo Iniciando controlab-sniffer-v5/server.js (Proxy Puente)...
    cd /d "C:\controlab-desa\controlab-sniffer-v5"
    start cmd /k "title Sniffer Proxy v5 && node server.js"
    goto end
)

if "%opt%"=="3" (
    echo.
    echo Iniciando wpcap_sniffer_final_loopback.exe en modo General...
    cd /d "C:\controlab-desa"
    start "" "C:\controlab-desa\wpcap_sniffer_final_loopback.exe" --url "http://localhost:5000/api/sniffer/webhook"
    goto end
)

:end
echo.
echo =====================================================================
echo  Sniffer iniciado. Monitorea las tramas en vivo en:
echo  http://localhost:3000 (Auditoria Red - Sniffer)
echo =====================================================================
echo.
pause
