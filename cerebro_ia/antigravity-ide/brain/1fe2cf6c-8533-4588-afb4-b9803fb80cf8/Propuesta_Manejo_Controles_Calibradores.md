# Propuesta de Diseño: Registro de Controles, Calibradores y Kits

Este documento analiza la estructura del listado de inventario suministrado (donde se diferencian `CONTROL`, `CALIBRADOR`, `REACTIVO`, y `KIT`) y presenta las alternativas para adaptarlo al flujo actual de Controlab IA.

---

## 📋 Diagnóstico del Listado del Cliente

Al analizar el listado de reactivos, observamos dos comportamientos comerciales diferentes:

1. **Items Independientes (Venta Individual):**
   * *Ejemplo:* `CONTROL` Wiener Lab `1001134` (6x5ML) o `CALIBRADOR` Wiener Lab `1001204` (1x2ML).
   * Estos productos se compran de forma individual, tienen su propia caja, lote y código de catálogo. No vienen dentro de un kit de reactivos.
2. **Componentes Integrados (Bundled Kits):**
   * *Ejemplo:* El `REACTIVO` Mindray `FE013` contiene en la misma caja: `Reactivo 1 (R1)`, `Reactivo 2 (R2)`, `Calibrador (1.5 ml)` y `Control (5 ml)`.
   * Vienen todos dentro de una única caja física bajo un único código de catálogo (`FE013`).

---

## 🛠️ Alternativas de Adaptación en Controlab IA

Presentamos las 3 opciones de diseño para soportar esto en el sistema:

### Alternativa 1: Registro Individual en Catálogo (RECOMENDADA)
Consiste en registrar cada Control, Calibrador y Reactivo como **items independientes** en la base de datos (con su propio código y control de lotes).

* **Cómo se adapta en el Kit Integrado (ej. `FE013`):**
  * Registramos en la base de datos 3 items separados:
    1. `FE013` - Reactivo Glucemia (Categoría: *Reactivo*)
    2. `FE013-CAL` - Calibrador Glucemia (Categoría: *Calibrador*)
    3. `FE013-CTRL` - Control Glucemia (Categoría: *Control*)
  * Cuando se registre la compra del kit en el inventario, se crean los 3 lotes independientes en el módulo de Reactivos con sus respectivos mililitros (`40 ml` para reactivo, `1.5 ml` para calibrador, `5 ml` para control).
* **Pros:**
  * **100% compatible** con la base de datos actual de Controlab (no requiere migraciones complejas).
  * Soporta tanto controles independientes (Wiener Lab `1001134`) como los integrados en kits.
  * Permite auditar y llevar kárdex de consumo individual para cada vial (puedes ver exactamente cuántos ml de calibrador quedan).
  * Maneja vencimientos independientes (a veces el calibrador vence meses antes que el reactivo de la misma caja).
* **Contras:** El usuario debe registrar los 3 componentes por separado al dar de alta el kit en el inventario.

---

### Alternativa 2: Kit Multi-Componente en Base de Datos
Modificar la estructura de la base de datos (tabla `LotesReactivos`) para permitir que un solo lote tenga múltiples viales internos con volúmenes independientes.

* **Cómo se adapta:**
  * Se añaden columnas como `CantidadActualCalibrador`, `CantidadActualControl`, `ConsumoCalibrador`, etc.
  * El formulario de lotes en la interfaz se rediseña para permitir ingresar R1, R2, Calibrador y Control en una misma pantalla para un solo item.
* **Pros:** El usuario registra una sola fila para todo el kit.
* **Contras:** 
  * Requiere una migración de base de datos invasiva.
  * No resuelve el caso de los controles que se compran **por separado** (ya que estos no tienen un reactivo padre al cual asociar el lote).
  * Hace más compleja la lógica de kárdex (el kárdex actual rastrea movimientos por `item_id`).

---

### Alternativa 3: Consumo por Merma Teórica Consolidada
No registrar físicamente las botellas de calibrador y control en el inventario. En su lugar, el sistema calcula un porcentaje de merma teórica adicional sobre el lote de reactivo cada vez que se detecta una calibración o QC.

* **Pros:** Cero cambios de código.
* **Contras:** No hay control real de cuántos ml de calibrador quedan físicamente en el laboratorio. Es una aproximación matemática, no un control real.

---

## 🎯 Recomendación de Implementación: **Alternativa 1**

Es la alternativa estándar de la industria (ERP y LIMS). Para implementarla de forma óptima en tu laptop y entorno de desarrollo de mañana, realizaremos dos pequeños ajustes visuales en el código:

1. **Ajustar el Selector de Categorías:**
   Modificaremos el componente [Inventory.js](file:///c:/controlab-desa/frontend/src/features/inventory/pages/Inventory.js) para agregar `Calibrador`, `Control` y `Kit` al listado de Categorías disponibles.
2. **Mapeo del Sniffer:**
   Cuando el sniffer reciba una calibración de la prueba `GLUCOSA`, el webhook buscará el reactivo mapeado con la categoría `Calibrador` (ej. `FE013-CAL`) y restará el consumo de su lote respectivo de forma directa.
