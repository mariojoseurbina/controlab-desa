@echo off
title Instalador Interfaz Controlab IA

:: 1. Validar y auto-solicitar permisos de Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Solicitando permisos de Administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: 2. Ejecutar el instalador de PowerShell
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Instalar_Interfaz_Automatica.ps1"
