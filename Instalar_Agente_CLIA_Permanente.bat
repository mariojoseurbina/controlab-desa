@echo off
title Instalador Permanente - Agente CLIA 900i
color 0a
cls

echo =====================================================================
echo       INSTALACION PERMANENTE DEL AGENTE CONTROLAB (CLIA 900i)
echo =====================================================================
echo.
echo Este script instalara el Agente para que se inicie de forma
echo automatica y silenciosa cada vez que se encienda esta computadora.
echo.
pause

:: Crear directorio
if not exist "C:\Controlab_Agente" mkdir "C:\Controlab_Agente"

:: Copiar el ejecutable a la carpeta segura
echo Copiando Agente_CLIA_Local.exe a C:\Controlab_Agente...
copy /Y "%~dp0Agente_CLIA_Local.exe" "C:\Controlab_Agente\Agente_CLIA_Local.exe" >nul

:: Crear un VBScript para que corra oculto (sin ventana negra)
echo set WshShell = CreateObject("WScript.Shell") > "C:\Controlab_Agente\RunAgenteHidden.vbs"
echo WshShell.Run chr(34) ^& "C:\Controlab_Agente\Agente_CLIA_Local.exe" ^& Chr(34), 0 >> "C:\Controlab_Agente\RunAgenteHidden.vbs"
echo Set WshShell = Nothing >> "C:\Controlab_Agente\RunAgenteHidden.vbs"

:: Copiar el VBScript al inicio automatico de Windows
echo Configurando el Inicio Automatico de Windows...
copy /Y "C:\Controlab_Agente\RunAgenteHidden.vbs" "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Controlab_Agente.vbs" >nul

:: Matar el proceso si ya estaba corriendo
taskkill /f /im Agente_CLIA_Local.exe >nul 2>&1

:: Iniciar el proceso oculto ahora mismo
start "" "C:\Controlab_Agente\RunAgenteHidden.vbs"

echo.
echo =====================================================================
echo [EXITO] El Agente ha sido instalado permanentemente.
echo [EXITO] Se ejecutara invisiblemente al encender la computadora.
echo [EXITO] Ya puedes cerrar esta ventana y usar el analizador normal.
echo =====================================================================
pause
