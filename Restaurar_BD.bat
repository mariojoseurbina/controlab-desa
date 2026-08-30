@echo off
echo ==============================================
echo    RESTAURACION DE BASE DE DATOS CONTROLAB IA
echo ==============================================
echo.
echo Asegurate de tener SQL Server instalado y el usuario "controlab_user" con acceso.
echo.
sqlcmd -S localhost -U controlab_user -P "Delicia1." -Q "RESTORE DATABASE ControlabIA FROM DISK='%~dp0ControlabIA.bak' WITH REPLACE"
echo.
echo Restauracion completada (Revisa mensajes de error arriba si los hay).
pause
