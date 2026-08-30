@echo off
echo ==============================================
echo    RESPALDO (BACKUP) DE BASE DE DATOS CONTROLAB IA DESA
echo ==============================================
echo.
echo Generando copia de seguridad .bak de la base de datos ControlabIA_Desa...
echo.
sqlcmd -S localhost -E -Q "BACKUP DATABASE ControlabIA_Desa TO DISK='%~dp0ControlabIA_Desa_Backup_%date:~-4,4%%date:~-7,2%%date:~-10,2%.bak' WITH FORMAT, MEDIANAME='ControlabIA_Desa_Backup', NAME='Full Backup of ControlabIA_Desa';"
echo.
echo Backup completado exitosamente en la carpeta C:\controlab-desa.
pause
