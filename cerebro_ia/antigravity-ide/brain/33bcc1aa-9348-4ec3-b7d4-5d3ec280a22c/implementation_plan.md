# Plan de Diseño de Base de Datos y Estructura de Costos

Este plan refina la propuesta de diseño de base de datos y detalla el desarrollo del nuevo módulo **Estructura de Costos** para responder a tus preguntas y evitar confusiones en la carga de datos del inventario.

---

## User Review Required

> [!IMPORTANT]
> **Separación de Responsabilidades para Simplificar la Carga de Datos:**
> Para evitar que registrar un producto en el inventario sea complicado, proponemos la siguiente división de campos:
> 
> 1. **Ficha del Item (Inventario):** Solo almacena clasificación operativa y de naturaleza:
>    * `area_operativa` (ej. Química, Hematología).
>    * `naturaleza` (ej. Reactivo, Calibrador, Control).
>    * *No se colocan precios ni impuestos aquí, ya que estos varían con cada factura.*
> 2. **Registro de Compra (Compras):** Aquí se introduce la información fiscal y financiera que cambia en cada transacción:
>    * Moneda, tasa de cambio, desglose de IVA (USD/VES), subtotal y total de línea.
> 3. **Pruebas y Vínculos (Módulo Estructura de Costos):** La agrupación de reactivos (marcas) bajo una prueba genérica (`pruebas_maestra`) se realiza en una vista dedicada dentro del nuevo módulo de costos, evitando sobrecargar las pantallas de inventario.

---

## Open Questions

> [!NOTE]
> 1. **Opciones Predefinidas en Formulario:** ¿Prefieres que los campos `area_operativa` (ej. Química, Hematología) y `naturaleza` (Reactivo, Calibrador, Control) sean de texto libre o listas desplegables con opciones cerradas para evitar errores de ortografía?
> 2. **Ubicación en el Menú:** ¿Deseas que el nuevo módulo de **Estructura de Costos** aparezca como una sección principal en la barra lateral de navegación o como una subsección dentro de Compras?

---

## Proposed Changes

### Base de Datos / ORM (Prisma Schema)

#### [MODIFY] [schema.prisma](file:///c:/controlab-ia/backend/prisma/schema.prisma)
* Modificar el modelo `ItemInventario` (`items_inventario`) para añadir clasificación estable:
  * `area_operativa` (String / NVarChar)
  * `naturaleza` (String / NVarChar)
  * `estado_calidad` (String, default "ACTIVO")
  * `nota_desincorporacion` (String / NVarChar)
* Modificar el modelo `compras_inventario` para soportar finanzas multimoneda y desglose fiscal:
  * `tasa_cambio` (Decimal)
  * `moneda_factura` (String, default "USD")
  * `precio_unitario_usd` (Decimal)
  * `precio_unitario_ves` (Decimal)
  * `porcentaje_impuesto` (Decimal)
  * `monto_impuesto_usd` (Decimal)
  * `monto_impuesto_ves` (Decimal)
  * `subtotal_usd` (Decimal)
  * `subtotal_ves` (Decimal)
  * `total_linea_usd` (Decimal)
  * `total_linea_ves` (Decimal)
* [NEW] Añadir el modelo `pruebas_maestra` (Tabla maestra de pruebas genéricas):
  * `id` (Int, PK, AutoIncrement)
  * `nombre_prueba` (String, Unique)
  * `activo` (Boolean, default true)
  * `fecha_creacion` (DateTime, default now)
* [NEW] Añadir el modelo `vinculo_prueba_item` (Relación muchos a muchos para agrupar marcas/reactivos comerciales por prueba genérica):
  * `id` (Int, PK, AutoIncrement)
  * `prueba_id` (Int, FK a `pruebas_maestra`)
  * `item_id` (Int, FK a `items_inventario`)
  * `activo` (Boolean, default true)
  * `fecha_vinculo` (DateTime, default now)

---

### Backend (Node.js)

#### [NEW] [costos.routes.js](file:///c:/controlab-ia/backend/src/modules/costos/costos.routes.js)
* Definir los endpoints de control financiero:
  * `GET /api/costos/pruebas` -> Listar pruebas genéricas y sus marcas asociadas.
  * `POST /api/costos/pruebas` -> Registrar una nueva prueba genérica.
  * `POST /api/costos/vinculos` -> Asociar un reactivo de inventario a una prueba genérica.
  * `DELETE /api/costos/vinculos/:id` -> Desasociar un reactivo.
  * `GET /api/costos/analisis` -> Consolidar e informar costos y gastos acumulados (netos e impuestos) en USD/VES agrupados por prueba genérica y área operativa.

#### [NEW] [costos.controller.js](file:///c:/controlab-ia/backend/src/modules/costos/costos.controller.js)
* Manejar peticiones HTTP, validaciones y formato de respuesta para las consultas financieras.

#### [NEW] [costos.service.js](file:///c:/controlab-ia/backend/src/modules/costos/costos.service.js)
* Lógica para agrupar e iterar vínculos, sumando subtotales de compras en USD y VES de todos los productos relacionados a una prueba genérica.

#### [MODIFY] [server-minimo.js](file:///c:/controlab-ia/backend/server-minimo.js) y [server-minimo2.js](file:///c:/controlab-ia/backend/server-minimo2.js)
* Importar y registrar las rutas bajo `/api/costos`.

---

### Frontend (React)

#### [NEW] [Costos.jsx](file:///c:/controlab-ia/frontend/src/pages/Costos/Costos.jsx)
* Diseñar una interfaz interactiva de **Estructura de Costos** con tres pestañas:
  1. **Análisis de Gastos por Prueba**: Muestra la lista de pruebas genéricas (ej. Glucosa, Colesterol) y calcula dinámicamente el costo total consolidado de adquisición sumando todas las marcas asociadas (resolviendo la pregunta: *¿Cuánto gastamos en reactivos para Glucosa?*).
  2. **Configuración de Vínculos**: Permite al usuario crear pruebas genéricas y vincularles productos de inventario de forma rápida mediante selectores de búsqueda inteligente.
  3. **Impacto Fiscal por Área**: Un panel visual (Dashboard) que resume el IVA acumulado de compras divididas por áreas operativas (ej. Inmunología, Química).

---

## Verification Plan

### Automated Tests
* Ejecutar un script SQL local para verificar que los comandos DDL alteran las tablas de SQL Server y crean las nuevas relaciones de forma correcta.
* Validar la integridad referencial haciendo consultas mock a través de Prisma.

### Manual Verification
1. Crear una prueba genérica "Glucosa" desde la interfaz de costos.
2. Asociarle dos productos del catálogo (ej. "Reactivo Glucosa Wiener" y "Reactivo Glucosa Wiener Calibrador").
3. Registrar compras para ambos productos con tasas de cambio e IVA.
4. Entrar a la pestaña de "Análisis de Gastos por Prueba" y corroborar que el costo total de "Glucosa" refleja de forma correcta la suma en USD y VES de ambos ítems.
