# Plan de Trabajo: Creación de Instalador Único con Inno Setup (Controlab-IA)

Este plan detalla el procedimiento para simplificar la copia e instalación de Controlab-IA en computadoras de clientes. Actualmente, copiar la carpeta del proyecto tarda demasiado tiempo debido a los miles de archivos pequeños en `node_modules`. 

El objetivo es compilar y unificar la aplicación en un único archivo instalador (`Setup_ControlabIA.exe`) de aproximadamente 80-100 MB que se copie en segundos e instale el sistema automáticamente.

---

## 🛠️ Alternativas de Empaquetado

### Opción A: Compilación Completa (Recomendada y Offline)
* **Backend:** Usar la herramienta `pkg` para compilar el backend de Node.js a un único archivo `.exe`.
* **C# Processor:** Compilar el procesador a un ejecutable optimizado en la carpeta `Release`.
* **Frontend:** Servir la carpeta `build/` de React directamente desde el backend en Express, unificando todo en un único puerto (puerto 5000).
* **Beneficio:** Cero carpetas `node_modules` y cero dependencias sueltas. El instalador solo contendrá 2 ejecutables y la base de datos.

### Opción B: Empaquetado Comprimido en Instalador (Rápido y Sencillo)
* **Descripción:** Mantener la estructura actual del proyecto, pero configurar Inno Setup para que tome las carpetas del backend y frontend y las **comprima internamente**.
* **Beneficio:** No requiere reescribir código para servir la interfaz desde Express ni compilar a binario. Inno Setup se encarga de empaquetar los miles de archivos en un solo archivo comprimido, y los extrae en la computadora destino en menos de 1 minuto.

---

## 📋 Propuesta de Script para Inno Setup (`controlab-installer.iss`)

Crearemos un archivo de configuración para Inno Setup en la raíz del proyecto. Este script le dirá al compilador cómo empaquetar y estructurar el instalador:

```pascal
[Setup]
AppName=Controlab-IA
AppVersion=1.0.0
DefaultDirName={autopf}\Controlab-IA
DefaultGroupName=Controlab-IA
UninstallDisplayIcon={app}\logo-controlab-ia.ico
Compression=lzma2/max
SolidCompression=yes
OutputDir=c:\controlab-ia\dist
OutputBaseFilename=Setup_Controlab_IA

[Files]
; Archivos del Backend (Ejecutable principal)
Source: "c:\controlab-ia\backend\server-produccion.js"; DestDir: "{app}\backend"; Flags: ignoreversion
Source: "c:\controlab-ia\backend\package.json"; DestDir: "{app}\backend"; Flags: ignoreversion
Source: "c:\controlab-ia\backend\.env"; DestDir: "{app}\backend"; Flags: ignoreversion
; Nota: En el script definitivo incluiremos los node_modules comprimidos o el binario PKG

; Frontend (Producción Build)
Source: "c:\controlab-ia\frontend\build\*"; DestDir: "{app}\frontend\build"; Flags: ignoreversion recursesubdirs createallsubdirs

; Procesador C#
Source: "c:\controlab-ia\InventarioAutoProcessor\bin\Release\*"; DestDir: "{app}\processor"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Controlab-IA"; Filename: "{app}\backend\controlab-backend.exe"
Name: "{commondesktop}\Controlab-IA"; Filename: "{app}\backend\controlab-backend.exe"; IconFilename: "{app}\logo-controlab-ia.ico"

[Run]
; Comando opcional para levantar la base de datos SQL o registrar el servicio C#
Filename: "{app}\backend\controlab-backend.exe"; Description: "Iniciar Controlab-IA"; Flags: nowait postinstall skipifsilent
```

---

## ⏱️ Plan de Ejecución (Paso a Paso)

```markdown
- [ ] Paso 1: Configurar Express (`backend/server-produccion.js`) para que sirva los archivos estáticos de React (`frontend/build`) y así eliminar la necesidad de ejecutar dos servidores por separado.
- [ ] Paso 2: Crear el script de Inno Setup `controlab-installer.iss` en la raíz del proyecto.
- [ ] Paso 3: Descargar e instalar Inno Setup 6 (Herramienta Gratuita).
- [ ] Paso 4: Ejecutar la compilación del instalador y generar el archivo `Setup_Controlab_IA.exe`.
- [ ] Paso 5: Realizar la validación de copia e instalación en una computadora de pruebas limpia.
```

## User Review Required

> [!IMPORTANT]
> **¿Cómo prefieres lanzar la aplicación en el cliente?**
> A. **Servidor Unificado (Recomendado):** Hacemos que el backend en Node.js sirva la interfaz de React. De esta forma, el usuario solo ejecuta un programa y entra a la dirección `http://localhost:5000` en su navegador.
> B. **Ejecución Separada (Como ahora):** El instalador instala Node.js de fondo y ejecuta el servidor de desarrollo en el puerto 5000 y el frontend en el puerto 3000 por separado.
