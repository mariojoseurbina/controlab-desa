@echo off
echo ==============================================
echo    RESTAURACION DE BASE DE DATOS CONTROLAB IA DESA
echo ==============================================
echo.
echo Ejecutando restauracion local con Autenticacion de Windows (sqlcmd -E)...
echo.
sqlcmd -S localhost -E -Q "RESTORE DATABASE ControlabIA_Desa FROM DISK='%~dp0ControlabIA_Desa.bak' WITH MOVE 'ControlabIA' TO 'C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\DATA\ControlabIA_Desa.mdf', MOVE 'ControlabIA_log' TO 'C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\DATA\ControlabIA_Desa_log.ldf', REPLACE"
echo.
echo Mapeando el usuario controlab_user en ControlabIA_Desa...
sqlcmd -S localhost -E -d ControlabIA_Desa -Q "ALTER USER controlab_user WITH LOGIN = controlab_user;"
echo.
echo Proceso completado.
pause
