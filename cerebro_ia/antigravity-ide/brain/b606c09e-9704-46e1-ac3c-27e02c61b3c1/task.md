# Tareas de Refactorización: Controlab-IA

- `[x]` **Fase 1: Microservicio C# (.NET) - Principios SOLID**
  - `[x]` Extraer lógica de acceso a datos a un repositorio (`IInventoryRepository` y `InventoryRepository`).
  - `[x]` Crear interfaz `IFileParser` para el procesamiento de archivos.
  - `[x]` Crear clase `ExcelParser` que implemente `IFileParser`.
  - `[x]` Crear clase `PdfParser` que implemente `IFileParser`.
  - `[x]` Refactorizar `FileProcessor.cs` para delegar responsabilidades usando inyección de dependencias.

- `[x]` **Fase 2: Backend (Node.js) - Setup de Prisma ORM**
  - `[x]` Desinstalar Drizzle e instalar dependencias de Prisma (`prisma`, `@prisma/client`).
  - `[x]` Configurar conexión a la base de datos `ControlabIA` con Prisma (SQL Server).
  - `[x]` Definir el `schema.prisma` para `items_inventario` y `movimientos_inventario`.

- `[x]` **Fase 3: Backend (Node.js) - Módulo de Inventario**
  - `[x]` Crear estructura `src/modules/inventory` (controller, service, repository, routes).
  - `[x]` Migrar endpoints de inventario desde `server-minimo.js` hacia el nuevo módulo.
  - `[x]` Comentar el código original migrado en `server-minimo.js` (sin borrarlo).

- `[x]` **Fase 4: Backend (Node.js) - Módulo de IA (Heurística) y Reportes**
  - `[x]` Crear estructura `src/modules/ai-assistant` y `src/modules/reports`.
  - `[x]` Aislar el motor de reglas de NLP en `ai.service.js`.
  - `[x]` Migrar rutas correspondientes y comentar el código en `server-minimo.js`.

- `[x]` **Fase 5: Frontend (React) - Feature Slices**
  - `[x]` Reorganizar `src/` para agrupar por dominios (`features/inventory`, etc.).
  - `[x]` Actualizar importaciones y rutas en `App.js`.

- `[x]` **Fase 6: Pruebas e Integración del Dashboard en el Navegador**
  - `[x]` Sincronizar fallbacks de secrets de JWT en authMiddleware y authController.
  - `[x]` Corregir base URL de API en frontend (apuntando a localhost:5000).
  - `[x]` Corregir queries incompatibles de SQL Server (LIMIT por TOP y lotes_reactivos por LotesReactivos).
  - `[x]` Corregir joins incorrectos en consultas de mapeos masivos.
  - `[x]` Registrar y montar todas las rutas necesarias en el servidor de Express.
  - `[x]` Ejecutar pruebas de conectividad de extremo a extremo exitosamente.
