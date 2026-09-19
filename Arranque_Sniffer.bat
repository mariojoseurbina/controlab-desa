@echo off
title Sniffer Automatico de Controlab IA
echo Iniciando Sniffer de Red en modo pasivo...
cd /d "C:\controlab-desa"
start "" "C:\controlab-desa\wpcap_sniffer_final_loopback.exe" --url "http://192.168.40.251:5000/api/sniffer/webhook"
exit
