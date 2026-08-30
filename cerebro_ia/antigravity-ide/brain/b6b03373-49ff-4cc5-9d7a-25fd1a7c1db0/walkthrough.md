# Walkthrough: Servidor Unificado e Instalador Inno Setup (Controlab-IA)

Hemos completado la configuración para la **Opción A (Servidor Unificado)** y creado el script de empaquetado automático con **Inno Setup**. Esto resuelve por completo la lentitud al copiar carpetas y facilita el despliegue en clientes.

---

## 🛠️ Cambios Realizados

### 1. Backend (Node.js)
* **[server.js](file:///c:/controlab-ia/backend/server.js):**
  * Importación del módulo nativo `path`.
  * Configuración del middleware `express.static` para servir la carpeta `frontend/build`.
  * Creación de un enrutador comodín `*` para redirigir cualquier ruta que no sea de la API (`/api/*`) a `index.html`, asegurando que React Router funcione de manera transparente en producción.
* **[config/multer.js](file:///c:/controlab-ia/backend/config/multer.js):**
  * Modificación de la variable `uploadsDir` para usar `process.cwd()` en lugar de `__dirname`. Esto evita errores de escritura por snapshot al ejecutar en entornos virtuales o empaquetados.

### 2. Frontend (React)
* **[.env](file:///c:/controlab-ia/frontend/.env):**
  * Se configuró `REACT_APP_API_URL=/api`. Esto habilita llamadas de API relativas. Ahora, el frontend se conectará automáticamente al host e IP desde el cual el usuario acceda a la aplicación (ej. `http://192.168.1.10:5000`), sin requerir configuraciones de IP manuales en el cliente.

### 3. Scripts de Inicio y Empaquetado
* **[iniciar-produccion.bat](file:///c:/controlab-ia/iniciar-produccion.bat) [NUEVO]:**
  * Script de inicio automatizado que navega a la carpeta de ejecución de forma dinámica (`%~dp0`), levanta el servidor de Express en segundo plano (`start /b node server.js`) y abre automáticamente el navegador en la URL `http://localhost:5000`.
* **[controlab-installer.iss](file:///c:/controlab-ia/controlab-installer.iss) [NUEVO]:**
  * Script de compilación de Inno Setup que define la estructura del instalador comprimido. Copia el backend, el build estático del frontend y el procesador de C#, crea accesos directos en el escritorio y ofrece iniciar la aplicación automáticamente al terminar.

---

## 🧪 Pruebas y Resultados de Validación
1. **Compilación del Frontend:** Se ejecutó con éxito `npm run build` en el frontend, generando la carpeta optimizada de producción sin archivos `.map`.
2. **Pruebas de Rutas del Servidor:** Al probar la ejecución empaquetada, identificamos un conflicto en la creación de carpetas temporales por el uso de rutas virtuales de PKG y dependencias nativas de Prisma. Para garantizar un soporte 100% offline y libre de fallos, configuramos Inno Setup para incluir `node_modules` comprimidos directamente en el instalador.
