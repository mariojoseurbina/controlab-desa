@echo off
title Sniffer Controlab IA - Mindray BC 5380 (Npcap)
color 0a
cls

echo =====================================================================
echo       CONTROLAB IA - SNIFFER PASIVO MINDRAY BC-5380 (NPCAP)
echo =====================================================================
echo  - Analizador : Mindray BC 5380
echo  - IP PC      : 192.168.10.62 (Loopback / Infolab)
echo  - Servidor   : http://192.168.40.251:5000/api/sniffer/webhook
echo  - Motor      : Npcap (Cero interferencia con Infolab)
echo =====================================================================
echo.

cd /d "%~dp0"
wpcap_sniffer_final_loopback.exe --device "Mindray BC 5380" --url "http://192.168.40.251:5000/api/sniffer/webhook" --ip "192.168.10.62"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Si muestra error de wpcap.dll, asegurate de tener instalado Npcap en esta PC.
    echo     Descarga oficial Npcap: https://npcap.com/#download
)

pause
