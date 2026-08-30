@echo off
:: Ejecutar el script de PowerShell saltándose las políticas de restricción de Windows
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0local_sniff_tshark.ps1"
pause
