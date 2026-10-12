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
echo   - CLIA 900i:     192.168.30.211 (Puerto 5250 / 5050 / 5100)
echo.
echo =====================================================================
echo  [1] Iniciar WPCAP Sniffer para CM 260i (192.168.10.188)
echo  [2] Iniciar WPCAP Sniffer para Mindray BS-230 (192.168.30.148)
echo  [3] Iniciar WPCAP Sniffer para CLIA 900i (192.168.30.211)
echo  [4] Iniciar TCP Proxy Sniffer v5 (controlab-sniffer-v5/server.js)
echo  [5] Iniciar WPCAP Sniffer en modo General (todos los analizadores)
echo  [6] Salir
echo =====================================================================
set /p opt="Seleccione una opcion (1, 2, 3, 4, 5 o 6): "

if "%opt%"=="6" exit

if "%opt%"=="1" (
    echo.
    echo Iniciando wpcap_sniffer_final_loopback.exe configurado para CM 260i...
    cd /d "C:\controlab-desa"
    start "" "C:\controlab-desa\wpcap_sniffer_final_loopback.exe" --device "CM 260i" --url "http://192.168.40.251:5000/api/sniffer/webhook" --ip "192.168.10.188"
    goto end
)

if "%opt%"=="2" (
    echo.
    echo Iniciando wpcap_sniffer_final_loopback.exe configurado para Mindray BS-230...
    cd /d "C:\controlab-desa"
    start "" "C:\controlab-desa\wpcap_sniffer_final_loopback.exe" --device "Mindray BS 230" --url "http://192.168.40.251:5000/api/sniffer/webhook" --ip "192.168.30.148"
    goto end
)

if "%opt%"=="3" (
    echo.
    echo Iniciando wpcap_sniffer_final_loopback.exe configurado para CLIA 900i...
    cd /d "C:\controlab-desa"
    start "" "C:\controlab-desa\wpcap_sniffer_final_loopback.exe" --device "CLIA 900i" --url "http://192.168.40.251:5000/api/sniffer/webhook" --ip "192.168.30.211"
    goto end
)

if "%opt%"=="4" (
    echo.
    echo Iniciando controlab-sniffer-v5/server.js (Proxy Puente)...
    cd /d "C:\controlab-desa\controlab-sniffer-v5"
    start cmd /k "title Sniffer Proxy v5 && node server.js"
    goto end
)

if "%opt%"=="5" (
    echo.
    echo Iniciando wpcap_sniffer_final_loopback.exe en modo General...
    cd /d "C:\controlab-desa"
    start "" "C:\controlab-desa\wpcap_sniffer_final_loopback.exe" --url "http://192.168.40.251:5000/api/sniffer/webhook"
    goto end
)

:end
echo.
echo =====================================================================
echo  Sniffer iniciado. Monitorea las tramas en vivo en:
echo  http://192.168.40.251:3000 o http://localhost:3000 (Auditoria Red - Sniffer)
echo =====================================================================
echo.
pause
