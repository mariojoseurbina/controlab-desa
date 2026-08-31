@echo off
echo =======================================================
echo Ejecutando Migracion de Campos y Vaciado de Inventario...
echo =======================================================
cd /d %~dp0
node run_prisma_raw_migration.js
echo =======================================================
echo Proceso finalizado.
echo =======================================================
pause
