# GUÍA COMPLETA: Creación del Nuevo LIS Humano y Conexión de Analizadores (Hematología/Química)

Este documento es una guía práctica, técnica y de negocios para inicializar un nuevo LIS de humanos desde cero (con la misma estructura que `controlab-vet` y `controlab-ia`), y realizar las pruebas de migración de datos de Infolab y conexión de analizadores.

---

## 1. Propuestas de Marca Comercial
*   **CONTROLAB HUMAN LIS:** Coherente con las marcas `controlab-vet` y `controlab-ia`, ideal para vender una suite integral de laboratorios.
*   **BIOLAB LIS / BIOCLINIC LIS:** Nombre moderno y premium si se desea comercializar como una marca independiente del sector veterinario.

---

## 2. Paso a Paso para Crear el Proyecto del Nuevo LIS (Estructura Limpia)

Para estructurar tu nuevo software de la misma forma que `controlab-vet` y `controlab-ia`, debes crear una estructura de dos carpetas principales: `backend` y `frontend`.

Sigue estos comandos en tu terminal de Windows (PowerShell/CMD):

### Paso A: Estructuración y Creación de Carpetas
Crea la carpeta raíz del nuevo proyecto y accede a ella:
```bash
mkdir controlab-human
cd controlab-human
```

### Paso B: Inicializar el Backend (Node.js + Express + Prisma)
1. Crea la carpeta `backend` e inicializa el proyecto Node.js:
   ```bash
   mkdir backend
   cd backend
   npm init -y
   ```
2. Instala las dependencias necesarias de Express, Seguridad y Conectividad:
   ```bash
   npm install express cors helmet dotenv mssql pdfkit
   npm install -D prisma nodemon
   ```
3. Inicializa el ORM Prisma con soporte para SQL Server (la misma base de datos utilizada en Controlab Vet):
   ```bash
   npx prisma init --datasource-provider sqlserver
   ```
   Esto creará la carpeta `prisma` con el archivo `schema.prisma` y un archivo `.env` para configurar tu string de conexión `DATABASE_URL`.

### Paso C: Inicializar el Frontend (React + Vite + Tailwind/CSS)
1. Regresa a la carpeta raíz e inicializa la aplicación React usando Vite (más rápido y ligero que `create-react-app`):
   ```bash
   cd ..
   npx -y create-vite@latest frontend --template react
   ```
2. Accede a la carpeta frontend e instala las librerías de diseño, iconos y peticiones HTTP:
   ```bash
   cd frontend
   npm install
   npm install axios lucide-react
   ```

---

## 3. Arquitectura para Conexión de Equipos (Hematología y Química)

En los laboratorios humanos, la automatización del ingreso de resultados es **mandatoria**. Los bioanalistas descartan cualquier LIS que les obligue a tipear manualmente los resultados clínicos.

### Protocolos Utilizados por Analizadores Clínicos:
1.  **ASTM (E1381 / E1394):** Utilizado por analizadores clásicos y de hematología para enviar tramas de texto estructurado por puerto serial RS-232 o USB virtual.
2.  **HL7 (Health Level Seven):** El estándar moderno basado en paquetes de texto formateados (delimitados por `|`) enviados vía protocolo TCP/IP de red local.

### Cómo Implementar la Conexión de Equipos (Arquitectura de Middleware):
No se debe conectar la base de datos de producción directamente al equipo. En su lugar, se diseña un **Agente Local (Middleware)**:

```
+------------------+         +--------------------+         +-----------------------+
| Equipo Analizador|  ASTM   | Agente Local (C#)  |  HTTPS  | Servidor LIS Backend  |
|  (Hematología)   | ------> | - Lee puerto COM   | ------> | - API REST / Express  |
|                  |  HL7    | - Parsea la trama  |         | - Almacena en SQL     |
+------------------+         +--------------------+         +-----------------------+
```

1.  **El Agente Local (Windows Service):** Una pequeña aplicación en C# (aprovechando tus desarrollos previos de **[FileWatcherServices.cs](file:///c:/controlab-ia/InventarioAutoProcessor/FileWatcherServices.cs)**) o Node.js que se ejecuta en segundo plano en la PC conectada al equipo.
2.  **Escucha activa:** El agente está escuchando en el puerto serial (`COM1`, `COM2`) o en un puerto de red local (ej. port `5000` TCP).
3.  **Procesamiento y Parseo:** El agente captura la trama de datos del analizador clínico. 
    *   *Ejemplo de Trama HL7 del equipo:*
        ```text
        OBX|1|NM|WBC^Glóbulos Blancos|6.8|10^3/uL|4.0-10.0|N|||F
        OBX|2|NM|RBC^Glóbulos Rojos|4.7|10^6/uL|4.5-5.9|N|||F
        ```
    *   El parser extrae el ID de la muestra, el parámetro (`WBC`) y el resultado numérico (`6.8`).
4.  **Envío Seguro al LIS:** Envía un JSON estructurado vía HTTPS al backend del nuevo LIS:
    ```json
    {
      "codigo_orden": "HUM-20260630-001",
      "resultados": [
        { "parametro_codigo": "WBC", "valor": 6.80 },
        { "parametro_codigo": "RBC", "valor": 4.70 }
      ]
    }
    ```

---

## 4. Escenario B: Estrategia de Pruebas con la BD Vieja (Infolab)

Para validar que el nuevo LIS humano funciona y es capaz de importar y reportar resultados usando la base de datos vieja del laboratorio anterior:

1.  **Montar la Base de Datos Histórica:** Restaura la base de datos de Infolab en tu motor local (usualmente Firebird o SQL Server).
2.  **Extraer con un Script de Migración Offline:** Escribe un script en tu backend que extraiga de la base de datos vieja las siguientes tablas:
    *   Pacientes (Nombres, Identificaciones, Sexo, Fecha de Nacimiento).
    *   Exámenes y Resultados Históricos.
3.  **Crear el "Diccionario de Parámetros":** Crea una tabla de mapeo que asocie los códigos que el analizador e Infolab usaban en el laboratorio viejo con los nuevos códigos internos del nuevo LIS (ej: Mapear `WBC` a `G_BLANCOS`).
4.  **Carga de Prueba:** Ejecuta el script para poblar la nueva base de datos SQL Server de tu LIS humano. Esto te permitirá simular reportes reales con data verídica de pacientes humanos.
