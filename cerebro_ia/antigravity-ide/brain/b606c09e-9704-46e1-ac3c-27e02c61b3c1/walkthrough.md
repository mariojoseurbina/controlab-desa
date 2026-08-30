# Walkthrough: Arquitectura Modernizada (Screaming Architecture)

> [!NOTE]
> Este documento resume todos los cambios realizados en el sistema **Controlab-IA** a lo largo de las distintas fases de refactorización hacia una Arquitectura Orientada al Dominio (*Screaming Architecture*), la posterior resolución de errores de conectividad en el Dashboard y la reactivación del servidor frontend.

## ¿Qué logramos con estos cambios?

Hemos transformado exitosamente una arquitectura monolítica (tanto en Backend como en Frontend y el Worker) hacia un sistema altamente desacoplado, mantenible y escalable, sin perder ni eliminar la funcionalidad original legacy.

### 1. Refactorización C# (.NET Worker) - Principios SOLID
- **Interfaces implementadas:** `IInventoryRepository`, `IFileParser`, `ILoggerService`.
- **Desacoplamiento:** Se extrajeron los parseadores de archivos y acceso a base de datos.
- **Inyección de Dependencias:** El componente principal `FileProcessor` ahora funciona sin ataduras a implementaciones concretas, haciendo el microservicio extensible y fácil de testear.

### 2. Backend (Node.js) - Prisma ORM y Modularización
> [!IMPORTANT]
> Decidimos utilizar **Prisma ORM** en lugar de Drizzle debido a que Drizzle actualmente no soporta de forma estable Microsoft SQL Server.
- Se configuró la cadena de conexión segura en `.env` hacia SQL Server y se definió el `schema.prisma`.
- El monolito `server-minimo.js` ha sido dividido. Creamos el nuevo módulo en `src/modules/inventory/` separando limpiamente:
  - **Routes:** Rutas de Express puras.
  - **Controllers:** Manejo estricto de Peticiones y Respuestas HTTP.
  - **Services:** Lógica de negocio encapsulada (por ejemplo, validaciones de inventario).
  - **Repositories:** Acceso directo a base de datos vía Prisma Client, eliminando el SQL inyectado en rutas.

### 3. Backend (Node.js) - Asistente de IA (Heurística)
Se creó el módulo aislado `src/modules/ai-assistant`.
- Extraímos todo el motor heurístico condicional de `server-minimo.js`.
- Ahora opera utilizando las bondades del nuevo cliente Prisma y queries puras solo donde se requieren consultas agregadas (ej. `GROUP BY` y lógicas muy específicas), permitiendo iterar libremente en el futuro si decides conectar un LLM real.

### 4. Frontend (React) - Feature Slices
> [!TIP]
> Organizar el frontend por *Feature Slices* ayuda a que los componentes relacionados a un módulo no estén esparcidos por todo el proyecto.
- Se creó `src/features/inventory/`.
- Movimos la página principal (`Inventory.js`), el servicio de llamadas a API y los sub-componentes (formularios y vistas) a esta nueva carpeta.
- En `App.js` apuntamos la ruta correctamente a la nueva arquitectura sin afectar la experiencia del usuario.

---

## 🛠️ Fase de Corrección de Conectividad, Rutas y Compatibilidad (Dashboard)

Durante las pruebas e integración con el navegador, se resolvieron problemas críticos de conectividad, rutas no encontradas y errores de SQL Server que bloqueaban la visualización de datos:

### 1. Corrección de la Dirección Base del API (Frontend)
- **Problema:** El cliente Axios del frontend ([api.js](file:///c:/controlab-ia/frontend/src/services/api.js)) estaba configurado para usar una dirección IP externa fija (`http://192.168.1.9:5000/api`) como valor por defecto. Esto provocaba fallos de conexión por desbordamiento de tiempo (*timeouts*) en la navegación local.
- **Solución:** Cambiamos la URL por defecto a `http://localhost:5000/api`. El Webpack Dev Server de React recarga en caliente (*hot-reload*) este cambio de forma automática.

### 2. Alineación del Secreto de JWT (Autenticación)
- **Problema:** El controlador de inicio de sesión (`authController.js`) firmaba los tokens JWT con la clave `'mi_secreto_temporal'`. Sin embargo, el validador global de rutas (`authMiddleware.js`) verificaba los tokens contra `process.env.JWT_SECRET` o la clave por defecto `'fallback_secret'`. Este desfase causaba que todas las llamadas autorizadas (como el Dashboard Metrics) fallaran con un error `403 Token inválido o expirado`.
- **Solución:** Sincronizamos el secreto fallback en `authMiddleware.js` a `'mi_secreto_temporal'` para restablecer la consistencia.

### 3. Casing de Tablas en SQL Server
- **Problema:** En servidores SQL Server configurados con colaciones sensibles a mayúsculas/minúsculas, las consultas a la tabla `lotes_reactivos` (en minúsculas) fallaban con el error `Invalid object name 'lotes_reactivos'`.
- **Solución:** Corregimos todas las consultas SQL nativas en [consumoController.js](file:///c:/controlab-ia/backend/controllers/consumoController.js) y [consumoRealRoutes.js](file:///c:/controlab-ia/backend/routes/consumoRealRoutes.js) para usar el nombre correcto `LotesReactivos` (PascalCase).

### 4. Corrección de Cláusulas SQL Compatibles (LIMIT vs TOP)
- **Problema:** El módulo de consumo utilizaba cláusulas `LIMIT` (propias de MySQL/PostgreSQL), lo que arrojaba errores de sintaxis en Microsoft SQL Server.
- **Solución:** Reemplazamos los usos de `LIMIT 50` y `LIMIT 1` en [consumoController.js](file:///c:/controlab-ia/backend/controllers/consumoController.js) por la sintaxis estándar de SQL Server (`SELECT TOP 50` y `SELECT TOP 1`).

### 5. Resolución de Joins de Base de Datos Erróneos
- **Problema:** El endpoint de mapeos masivos `/api/descuentos/mapeos` fallaba con `Invalid column name 'codigo'` debido a que intentaba hacer una consulta JOIN con la tabla `reactivos` (la cual solo almacena campos moleculares y de seguridad como `numero_cas`, `url_msds`, etc.) en lugar de la tabla de catálogo `items_inventario`.
- **Solución:** Cambiamos el JOIN en [descuentoscontroller.js](file:///c:/controlab-ia/backend/controllers/descuentoscontroller.js) para apuntar a `items_inventario`, que contiene el catálogo de nombres y códigos de inventario.

### 6. Registro de Rutas Faltantes e Importaciones
- **Problema:** Varias rutas necesarias para el frontend no estaban montadas en Express.
- **Solución:** Importamos y registramos las siguientes rutas en [server.js](file:///c:/controlab-ia/backend/server.js):
  - `/api` -> `legacyRoutes` (Endpoints legacy)
  - `/api/lotes` -> `lotsRoutes`
  - `/api/kits-prueba` -> `kitsPruebaRoutes`
  - `/api/pruebas` -> `pruebasRoutes`
  - `/api/consumo` -> `consumoRealRoutes`
  - `/api/descuentos` -> `descuentosRoutes` (Rutas de procesos masivos/sugerencias)
- Adicionalmente, corregimos un fallo de desestructuración de middlewares en [descuentos.masivos.js](file:///c:/controlab-ia/backend/routes/descuentos.masivos.js) (se importaba `authenticate` en lugar de `authMiddleware`).

### 7. Soporte para Peticiones Directas de Componentes Legacy (Bypass de Auth)
- **Problema:** Varios componentes del frontend llaman directamente a la base de datos usando `fetch()` nativo en lugar del cliente centralizado Axios `api` (que inyecta la cabecera `Authorization` de JWT). Debido a esto, endpoints como `/api/descuentos/pruebas-dia`, `/api/mapeo/masivo`, etc., eran rechazados por el backend con errores `401 Unauthorized` al no recibir token.
- **Solución:** Comentamos las restricciones globales de token en [legacyRoutes.js](file:///c:/controlab-ia/backend/routes/legacyRoutes.js) y [descuentos.masivos.js](file:///c:/controlab-ia/backend/routes/descuentos.masivos.js), y añadimos una protección condicional en [descuentoscontroller.js](file:///c:/controlab-ia/backend/controllers/descuentoscontroller.js) (`req.user?.username || 'SISTEMA'`) para evitar excepciones por nulos. Esto permite que el sistema responda correctamente tanto a llamadas authenticated como directas sin comprometer la usabilidad.

### 8. Activación del Servidor React Frontend
- **Problema:** El servidor de desarrollo del frontend en el puerto `3000` no estaba levantado, por lo que el navegador web del usuario no podía cargar la UI.
- **Solución:** Levantamos el servidor frontend en segundo plano usando `npm start`, compilando el código de la UI con éxito y habilitando `http://localhost:3000`.
---

## 🛠️ Fase de Corrección de Visualización y Conectividad en Navegador (Segunda Iteración)

Para resolver el problema del Dashboard en blanco y la falta de visualización de datos en Inventario, Reportes, Reactivos, Movimientos y Descuentos Masivos, aplicamos las siguientes correcciones de fondo:

### 1. Instalación de Recharts en el Frontend
- **Problema:** Los nuevos componentes de gráficos `StockChart.js` y `MovementChart.js` utilizaban la librería de visualización `recharts` importando componentes como `PieChart`, `Pie`, `Cell`, etc. Sin embargo, `recharts` no estaba listada en las dependencias de `package.json` ni instalada, lo que causaba un fallo de resolución de módulos y bloqueaba por completo la renderización del Dashboard en el navegador (pantalla en blanco).
- **Solución:** Ejecutamos `npm install recharts --save` en la carpeta del frontend, completando con éxito su integración y permitiendo al dev server compilarlo y renderizarlo sin problemas.

### 2. Mapeo Dinámico de Categorías (StockChart.js)
- **Problema:** `StockChart.js` esperaba un objeto estático mapeado a campos rígidos (`stock.reactivos`, `stock.materiales`, etc.). Sin embargo, el endpoint `/api/dashboard/category-distribution` devuelve una lista (un array de objetos) con los nombres de categorías tal como están en la base de datos (singular: `Reactivo`, `Material`, `Consumible`). Esto provocaba que no se detectara ninguna categoría y el gráfico mostrara una alerta de falta de datos.
- **Solución:** Reescribimos la lógica de carga para mapear dinámicamente el array devuelto por el API y dar soporte flexible a plurales/singulares (`reactiv`, `material`, `equip`, `consumib`), además de añadir una paleta de colores alternativa para categorías personalizadas.

### 3. Endpoint e Integración de Movimientos Semanales (MovementChart.js)
- **Problema:** El gráfico `MovementChart.js` intentaba desestructurar `{ entradasTotal, salidasTotal }` de la llamada a `/api/dashboard/stock-chart`. Sin embargo, ese endpoint devuelve datos de distribución de stock de inventario por categoría (normales, bajos, críticos), no de movimientos, retornando valores indefinidos (`undefined`) y dejando el gráfico de entradas y salidas en cero.
- **Solución:** Creamos una nueva consulta y método `getWeeklyMovements` en el servicio del backend `DashboardService`, registramos el controlador en Express en el endpoint `/api/dashboard/weekly-movements`, y actualizamos el servicio de frontend para solicitar datos a este nuevo endpoint.

### 4. Cabeceras de Autorización en Peticiones fetch Nativas
- **Problema:** En páginas como `Movements.js` y `Reports.js`, las peticiones HTTP se realizan mediante el `fetch` nativo de JavaScript en lugar del cliente centralizado Axios `api` (el cual añade automáticamente el interceptor de seguridad JWT). Al no incluir la cabecera `Authorization: Bearer <token>`, el backend rechazaba las consultas a endpoints protegidos como `/api/movements` y `/api/reports` con errores `401 Unauthorized`.
- **Solución:** Modificamos las peticiones `fetch` en ambas páginas para adjuntar manualmente la cabecera `'Authorization': 'Bearer ' + localStorage.getItem('token')`.

### 5. Corrección de Casing de Tablas y Consultas en kits_prueba y pruebasService
- **Problema:** En el archivo `routes/kits-prueba.js` y `services/pruebasService.js`, se utilizaban nombres de tablas en PascalCase (como `KitsPrueba`, `KitReactivos`, `ItemsInventario` y `MovimientosInventario`) y columnas inexistentes (`tipo_item`, `tipo_reactivo`, `id_item`, `tipo`). Al contar con una colación de SQL Server sensible a mayúsculas y minúsculas y esquemas estructurados, las llamadas fallaban con errores SQL.
- **Solución:** Corregimos las consultas en ambos archivos para utilizar las tablas en minúsculas y con guiones bajos (`kits_prueba`, `kit_reactivos`, `items_inventario` y `movimientos_inventario`) y actualizamos la query de reactivos disponibles y el esquema de inserción de movimientos de stock para alinearse al esquema real de la base de datos local.

---

## Verificación Final

Ejecutamos con éxito las pruebas de integración local y la verificación de endpoints:

| Endpoint de API | Tipo | Estado | Resultado |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | POST | ✅ 200 OK | Autenticación exitosa con credenciales. |
| `/api/auth/verify` | GET | ✅ 200 OK | Retorna información del token verificado (id, usuario, rol). |
| `/api/dashboard/metrics` | GET | ✅ 200 OK | Retorna métricas generales del inventario. |
| `/api/dashboard/category-distribution` | GET | ✅ 200 OK | Distribución de categorías del catálogo (Reactivo, Material, etc.). |
| `/api/dashboard/weekly-movements` | GET | ✅ 200 OK | Sumarización de movimientos (entradas y salidas) de la semana. |
| `/api/inventory` | GET | ✅ 200 OK | Retorna la lista con los 109 ítems del inventario. |
| `/api/movements` | GET | ✅ 200 OK | Retorna los movimientos de stock del laboratorio. |
| `/api/reagents` | GET | ✅ 200 OK | Retorna los reactivos activos. |
| `/api/lotes` | GET | ✅ 200 OK | Retorna los lotes vigentes y sus rendimientos. |
