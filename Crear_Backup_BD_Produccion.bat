@echo off
echo ==============================================
echo    RESPALDO (BACKUP) DE BASE DE DATOS CONTROLAB IA PRODUCCION
echo ==============================================
echo.
echo Generando copia de seguridad .bak de la base de datos ControlabIA...
echo.
sqlcmd -S localhost -E -Q "BACKUP DATABASE ControlabIA TO DISK='%~dp0ControlabIA_Backup_%date:~-4,4%%date:~-7,2%%date:~-10,2%.bak' WITH FORMAT, MEDIANAME='ControlabIA_Backup', NAME='Full Backup of ControlabIA';"
echo.
echo Backup completado exitosamente en la carpeta C:\controlab-desa.
pause
