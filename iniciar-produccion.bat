@echo off
title Iniciando Servidor Unificado Controlab-IA
:: Moverse a la carpeta del script (funciona en cualquier ruta de instalación)
cd /d "%~dp0\backend"
:: Iniciar el servidor de node en segundo plano
start /b node server.js
:: Esperar 3 segundos para asegurar la conexión con la base de datos
timeout /t 3 /nobreak > nul
:: Abrir el navegador en el puerto unificado 5000
start http://localhost:5000
exit
