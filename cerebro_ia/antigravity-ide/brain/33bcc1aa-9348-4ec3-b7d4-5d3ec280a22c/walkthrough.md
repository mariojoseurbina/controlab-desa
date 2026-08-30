# Walkthrough - Módulo de Estructura de Costos (Controlab IA)

Este documento detalla la implementación y validación del nuevo módulo **Estructura de Costos** y las extensiones multimoneda y fiscales añadidas al sistema. Estas características garantizan la viabilidad comercial y el control financiero detallado que exigen los laboratorios clínicos y clínicas modernas.

---

## 1. Diseño y Cambios en la Base de Datos

Para soportar las finanzas duales (USD/VES), el desglose impositivo (IVA) y la agrupación de marcas comerciales por prueba genérica, se modificó el esquema de base de datos a través de Prisma y DDL nativos:

### A. Clasificación en Catálogo (`items_inventario`)
Se agregaron columnas estables para evitar sobrecargar la carga diaria del inventario:
* `area_operativa` (ej. Química, Hematología, Inmunología).
* `naturaleza` (ej. Reactivo, Calibrador, Control).
* `estado_calidad` (ACTIVO, BLOQUEADO_CALIDAD, BLOQUEADO_COSTO, DESCONTINUADO).
* `nota_desincorporacion` (justificaciones de calidad o costo).

### B. Finanzas y Desglose Fiscal en Transacciones (`compras_inventario`)
Los campos financieros que varían en cada factura se trasladaron a la tabla de transacciones de compra:
* `moneda_factura` (USD o VES).
* `tasa_cambio` (tasa oficial de facturación).
* `porcentaje_impuesto` (IVA del 0%, 16% o especial).
* Desgloses duales automáticos: `precio_unitario_usd/ves`, `monto_impuesto_usd/ves`, `subtotal_usd/ves`, y `total_linea_usd/ves`.

### C. Nuevas Tablas Maestras y de Vínculos (Muchos a Muchos)
* `pruebas_maestra`: Catálogo de pruebas genéricas (ej. "Glucosa", "Hemoglobina", "HIV").
* `vinculo_prueba_item`: Relaciona múltiples reactivos y marcas de inventario a una única prueba genérica.

---

## 2. Desarrollo e Integración del Backend

### A. Endpoints Financieros (`/api/costos`)
Se creó un nuevo enrutador y controlador en Node.js que expone los siguientes servicios:
* `GET /api/costos/pruebas` -> Retorna las pruebas maestras con sus reactivos comerciales vinculados.
* `POST /api/costos/pruebas` -> Registra un nuevo tipo de prueba genérica.
* `POST /api/costos/vinculos` -> Vincula una marca de reactivo comercial a una prueba genérica.
* `DELETE /api/costos/vinculos/:id` -> Elimina una relación comercial de forma segura.
* `GET /api/costos/analisis` -> Consolida dinámicamente las compras realizadas, sumando subtotales e impuestos en USD y VES de todas las marcas asociadas a una prueba.
* `GET /api/costos/impacto` -> Agrupa y audita el impacto tributario total del IVA por cada `area_operativa`.

### B. Extensión de Compras (`purchases.service.js`)
Se modificó la lógica de inserción de compras. Al guardar una compra (USD o VES), el backend calcula automáticamente los equivalentes en la otra moneda aplicando la tasa de cambio y el porcentaje de IVA especificado, persistiendo la fila con total exactitud matemática.

---

## 3. Desarrollo del Frontend y Experiencia de Usuario

Se diseñó la interfaz de **Estructura de Costos** bajo una estética premium, consistente con el tema general del sistema:

### A. Dashboard de Costos (`Costos.jsx`)
Ubicado en la ruta `/costos`, se compone de tres paneles de control:
1. **Análisis de Costos por Prueba:** Muestra tarjetas de métricas globales de inversión y una grilla con las pruebas genéricas. Cada tarjeta detalla el gasto neto acumulado, impuestos pagados y costo de adquisición total en USD y VES, listando las marcas y stock disponible mediante chips interactivos.
2. **Configuración de Vínculos:** Permite registrar nuevas pruebas genéricas y asociarles productos del catálogo del inventario de forma ágil gracias a buscadores inteligentes (`Autocomplete`). Incluye controles para romper vínculos con confirmación mediante popups de seguridad.
3. **Impacto Fiscal por Área:** Genera un balance detallado del IVA acumulado. Incluye una tabla fiscal por área de laboratorio (Química, Hematología, Inmunología, etc.) y una representación visual de porcentaje de contribución mediante barras de progreso temáticas.

### B. Formulario de Compra Multimoneda (`FormularioCompra.jsx`)
Se expandió la sección de costos del formulario de creación y edición:
* Incorpora selectores para la **Moneda de la Factura** (USD / VES) y la **Tasa de Cambio**.
* Permite ingresar el **Porcentaje de IVA** con accesos rápidos para fijarlo en `0% (Exento)` o `16% (IVA General)` mediante un solo clic.
* Renderiza un panel de resumen en tiempo real que detalla el Subtotal, IVA y Total de la línea en la moneda seleccionada, junto con su equivalencia exacta en la otra moneda.

### C. Visualizador de Detalle de Compra (`DetalleCompra.js`)
* Se adaptó para mostrar los parámetros fiscales de la transacción (moneda original, tasa de cambio aplicada, porcentaje de IVA).
* Presenta una tabla comparativa dual que confronta, en columnas paralelas de color verde (USD) y azul (VES), el precio unitario, subtotal neto, IVA pagado y total general de la factura.

---

## 4. Verificación y Resultados

* **Persistencia Backwards-Compatible:** Los registros antiguos sin datos de tasa o IVA se mapean automáticamente a USD con tasa `1.0` y `0%` de impuesto, previniendo fallas de compatibilidad en reportes.
* **Flujo Operativo Completo:**
  1. El usuario crea la prueba genérica "Glucosa".
  2. Vincula múltiples marcas (ej. "Glucosa Wiener", "Glucosa BioSystems") del catálogo.
  3. Al registrar facturas en VES o USD con IVA y tasa de cambio, el backend recalcula los precios correspondientes.
  4. El panel de costos consolida de inmediato el total invertido por prueba genérica y el IVA pagado por área operativa en ambas monedas.
