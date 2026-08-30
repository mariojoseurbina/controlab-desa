@echo off
echo ===============================================
echo DIAGNOSTICO COMPLETO CONTROLAB-IA
echo ===============================================

echo.
echo 1. VERIFICANDO NODE.JS...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado
    goto :error
)

echo.
echo 2. VERIFICANDO BACKEND...
cd backend
if not exist package.json (
    echo ERROR: No se encuentra package.json en backend
    goto :error
)

echo.
echo 3. INSTALANDO DEPENDENCIAS...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Fallo la instalacion de dependencias
    goto :error
)

echo.
echo 4. VERIFICANDO ARCHIVO .ENV...
if not exist .env (
    echo ERROR: No existe archivo .env
    echo Creando archivo .env de ejemplo...
    (
        echo NODE_ENV=development
        echo PORT=5000
        echo JWT_SECRET=controlab-ia-secret-key-produccion
        echo DB_SERVER=localhost
        echo DB_NAME=ControlabIA
        echo DB_USER=sa
        echo DB_PASSWORD=TuPassword123
        echo DB_PORT=1433
        echo DB_ENCRYPT=true
        echo DB_TRUST_CERT=true
    ) > .env
    echo EDITA el archivo .env con tus credenciales reales de SQL Server
    goto :error
)

echo.
echo 5. VERIFICANDO SQL SERVER...
sqlcmd -S localhost -U sa -Q "SELECT @@VERSION" 2>nul
if %errorlevel% neq 0 (
    echo ERROR: No se puede conectar a SQL Server
    echo Verifica que:
    echo - SQL Server este corriendo
    echo - Las credenciales en .env sean correctas
    echo - La autenticacion SQL este habilitada
    goto :error
)

echo.
echo 6. VERIFICANDO BASE DE DATOS...
sqlcmd -S localhost -U sa -d ControlabIA -Q "SELECT COUNT(*) as total_usuarios FROM usuarios" 2>nul
if %errorlevel% neq 0 (
    echo ERROR: No se puede acceder a la base de datos ControlabIA
    echo Verifica que la base de datos exista
    goto :error
)

echo.
echo 7. INICIANDO BACKEND...
echo El backend se iniciara en esta ventana...
echo Mantenla abierta y ve a http://localhost:3000 en tu navegador
echo.
npm start

goto :exit

:error
echo.
echo ===============================================
echo CORRIGE LOS ERRORES ANTES DE CONTINUAR
echo ===============================================
pause

:exit