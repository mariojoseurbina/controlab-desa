# Plan de Tareas: Módulo de Estructura de Costos y Base de Datos

- `[x]` **Fase 1: Cambios en Base de Datos y Schema Prisma**
  - `[x]` Crear y ejecutar un script de migración SQL nativo para alterar `items_inventario`, `compras_inventario` y crear `pruebas_maestra` y `vinculo_prueba_item` de forma 100% segura sin pérdida de datos.
  * `[x]` Actualizar el archivo `schema.prisma` con las nuevas columnas y tablas maestras.
  * `[x]` Ejecutar `npx prisma generate` para regenerar el cliente.
- `[x]` **Fase 2: Desarrollo del Backend (Dominio de Costos)**
  - `[x]` Implementar el archivo `costos.service.js` con las lógicas de cálculo financiero multimoneda agregada, conteo por prueba genérica y análisis de impacto fiscal del IVA.
  - `[x]` Implementar `costos.controller.js` para exponer y validar las acciones de pruebas, vínculos y agregaciones.
  - `[x]` Implementar `costos.routes.js` con el enrutamiento del módulo.
  - `[x]` Registrar el nuevo enrutador de costos en `server-minimo.js` y `server-minimo2.js`.
- `[x]` **Fase 3: Actualización del Módulo de Compras (Backend)**
  - `[x]` Modificar el servicio `purchases.service.js` para recibir e insertar las nuevas columnas financieras (`tasa_cambio`, `precio_unitario_usd`, `precio_unitario_ves`, etc.) calculando los totales al crear o actualizar compras.
- `[x]` **Fase 4: Desarrollo del Frontend (Módulo de Costos)**
  - `[x]` Crear el componente de navegación y la página principal `Costos.jsx` con tres pestañas:
    - Pestaña 1: **Análisis de Costos por Prueba** (Visualización del total gastado en USD/VES consolidado).
    - Pestaña 2: **Configuración de Vínculos** (Interfaz para asociar reactivos comerciales del inventario a pruebas genéricas).
    - Pestaña 3: **Impacto Fiscal** (Métricas de IVA e impuestos por área operativa).
  - `[x]` Actualizar el menú de navegación principal del frontend para incluir el acceso a **Estructura de Costos**.
  - `[x]` Actualizar el formulario `FormularioCompra.jsx` para permitir ingresar los datos multimoneda de compras (tasa de cambio, precio neto en USD/VES e impuesto) al crear nuevas compras.
- `[x]` **Fase 5: Verificación y Pruebas**
  - `[x]` Validar la inserción de pruebas maestras y vínculos.
  - `[x]` Validar que el flujo completo de compras actualiza correctamente los costos consolidados de las pruebas.
  - `[x]` Generar el reporte del Walkthrough final.
