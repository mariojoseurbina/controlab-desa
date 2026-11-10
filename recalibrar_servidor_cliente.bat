@echo off
chcp 65001 > nul
echo ========================================================================
echo    CONTROLAB - RECALIBRACION Y SINCRONIZACION DE BASE DE DATOS
echo ========================================================================
echo.
cd /d "%~dp0\backend"
node scripts\sanear_stock_y_lotes.js
echo.
echo Presione cualquier tecla para salir...
pause > nul
