# Plan de Trabajo: Refactorización de Server-Minimo y Módulo Avanzado de Estructura de Costos

Este plan describe el enfoque de arquitectura de software y visión de negocio de laboratorio para optimizar el backend (desmantelando `server-minimo.js` y consolidando en `server.js`) e implementar el motor avanzado de cálculo de costos unitarios de pruebas clínicas en el módulo de **Estructura de Costos**.

---

## Perspectiva de Negocio (Dueño de Laboratorio) vs. Técnica (Arquitecto de Software)

### 🏥 Visión de Negocio (Dueño de Laboratorio)
Para rentabilizar un laboratorio clínico, cada prueba de laboratorio (como la **glicemia**) no es solo el reactivo que se consume en el equipo. Representa una cadena de costos fijos y variables. Para calcular el **costo real** y establecer un margen de ganancia saludable en porcentaje contra el precio de venta al paciente, debemos agrupar y prorratear cinco factores operativos clave:
1. **Fase Pre-analítica (Toma de muestra y consumibles de preparación):** Tubo tapa amarilla, aguja/scalp, algodón, alcohol, curita y guantes.
2. **Fase Analítica (Procesamiento):** Consumo neto del reactivo por prueba (con factor de desperdicio/calibración), prorrateo mensual de calibradores, controles, soluciones de lavado de equipos y consumibles del bioanalista (guantes y puntas amarillas).
3. **Gastos Administrativos Generales:** Servicios (luz, agua, internet), contratos de mantenimiento de equipos, papelería de reportes, impuestos, etc., divididos entre el volumen de pruebas del mes.
4. **Costo de Mano de Obra y Personal:** Nómina del personal administrativo, técnico y bioanalistas, dividida entre los estudios procesados en el mismo período.
5. **Ganancia Neta:** Cálculo del margen de ganancia versus el costo total y el precio de venta final al paciente.

### 📐 Visión Técnica (Arquitecto de Software)
1. **Refactorización de `server-minimo.js`:** Este archivo heredado de 3428 líneas genera duplicidades e interfiere con el servidor unificado `server.js`. Proponemos migrar cualquier lógica faltante a los controladores/servicios correspondientes y actualizar los scripts de ejecución (`.bat`) para que solo corra `server.js` en el puerto `5000`.
2. **Arquitectura del Motor de Costos:**
   - Crear una estructura de datos en la base de datos para almacenar la configuración de costos globales (gastos administrativos y personal del mes).
   - Crear una tabla de consumibles estándar vinculados a cada prueba.
   - Implementar un servicio de cálculo matemático en `costos.service.js` que realice el prorrateo automático y retorne el desglose detallado de costos variables, fijos y el porcentaje de ganancia.

---

## User Review Required

> [!IMPORTANT]
> **Cambios en Base de Datos y Modelos:**
> Agregaremos tablas para configurar los costos globales mensuales y el desglose de consumibles por prueba. Esto requiere una migración en SQL Server mediante Prisma.
>
> **Desactivación de `server-minimo.js`:**
> Se eliminará la ejecución de `server-minimo.js` del script de inicio `iniciar controlab.bat`. En su lugar, el servidor modular unificado `server.js` asumirá el control completo en el puerto `5000`.

---

## Open Questions

> [!WARNING]
> 1. **Prorrateo de Calibradores y Controles:** ¿La base de datos del laboratorio ya registra el número total de pruebas realizadas al mes de cada tipo para dividir el costo de calibradores/controles de forma dinámica, o prefieres ingresar valores estimados de pruebas mensuales (ej: "300 pruebas de química al mes") por equipo/calibrador para realizar el cálculo?
> 2. **Gestión de Consumibles:** ¿Quieres poder seleccionar los insumos de la toma de muestra (tubos, agujas, etc.) directamente desde los productos existentes en `items_inventario` (para que use su precio de costo actual en inventario), o prefieres un formulario simple con valores fijos en dinero para cada consumible? *(Recomendamos vincularlos a `items_inventario` para automatizar actualizaciones de precios de costo de los insumos al registrar nuevas compras).*
> 3. **Fórmula del Margen:** ¿El margen se calculará sobre el precio de venta o sobre el costo?
>    - *Fórmula del Margen sobre Venta (Estándar de Negocios):* `((Precio Venta - Costo Total) / Precio Venta) * 100`
>    - *Fórmula del Margen sobre Costo:* `((Precio Venta - Costo Total) / Costo Total) * 100`
>    - *Por favor, confírmanos cuál fórmula prefieres usar.*

---

## Proposed Changes

### 🗄️ Base de Datos (SQL Server & Prisma)

#### [MODIFY] [schema.prisma](file:///c:/controlab-ia/backend/prisma/schema.prisma)
Agregar los siguientes modelos de base de datos para soportar la parametrización de costos:

```prisma
// Configuración de Costos Operativos Globales Mensuales
model GastoMensualGlobal {
  id                   Int      @id @default(autoincrement())
  mes                  Int      // 1-12
  anio                 Int      // Año
  gastos_administrativos Decimal  @db.Decimal(18, 2) // Alquiler, servicios, papelería, etc.
  gastos_personal       Decimal  @db.Decimal(18, 2) // Nóminas, bonos, etc.
  total_pruebas_mes     Int      // Denominador para prorrateo
  fecha_registro       DateTime @default(now())
  
  @@unique([mes, anio])
}

// Configuración de Soluciones y Calibradores por Equipo/Área
model CostoEquipoSolucion {
  id                  Int      @id @default(autoincrement())
  nombre_equipo       String   @db.NVarChar(100)
  gasto_soluciones    Decimal  @db.Decimal(18, 2) // Gasto mensual en soluciones de este equipo
  gasto_calibradores  Decimal  @db.Decimal(18, 2) // Gasto mensual en calibradores
  gasto_controles     Decimal  @db.Decimal(18, 2) // Gasto mensual en controles
  total_pruebas_equipo Int      // Volumen de pruebas procesadas en este equipo al mes
}

// Configuración específica de costos unitarios de una prueba
model CostoPruebaConfig {
  id                 Int                  @id @default(autoincrement())
  prueba_id          Int                  @unique // Relación 1-1 con pruebas_maestra
  precio_venta       Decimal              @db.Decimal(18, 2)
  desperdicio_pct    Decimal              @default(5.00) @db.Decimal(5, 2) // Porcentaje de desperdicio de reactivo (calibración/desecho)
  pruebas_por_kit    Int                  // Número de pruebas estimadas por kit
  reactivo_id        Int                  // Reactivo principal asociado (items_inventario)
  consumibles        ConsumiblePrueba[]
  prueba             pruebas_maestra      @relation(fields: [prueba_id], references: [id], onDelete: Cascade)
}

// Consumibles detallados vinculados a una prueba genérica
model ConsumiblePrueba {
  id                 Int                @id @default(autoincrement())
  costo_config_id    Int
  item_id            Int                // Insumo de items_inventario (tubo, aguja, algodón, punta amarilla, guantes)
  cantidad           Decimal            @db.Decimal(10, 2) // Cantidad utilizada (ej: 1 tubo, 0.1 de algodón, etc.)
  fase               String             @db.NVarChar(50)   // "TOMA_MUESTRA" o "PROCESAMIENTO"
  costo_config       CostoPruebaConfig  @relation(fields: [costo_config_id], references: [id], onDelete: Cascade)
  item               ItemInventario     @relation(fields: [item_id], references: [id])
}
```

---

### 🖥️ Backend (Node.js)

#### [MODIFY] [costos.service.js](file:///c:/controlab-ia/backend/src/modules/costos/costos.service.js)
Implementar la lógica matemática del cálculo de costo unitario total para una prueba genérica:
1. **Costo de Reactivo:** Obtener el precio de costo del reactivo en el catálogo, calcular el valor unitario por prueba `(precio_compra / pruebas_por_kit)`. Aplicar el factor de desperdicio: `CostoReactivo * (1 + desperdicio_pct / 100)`.
2. **Costo de Toma de Muestra:** Sumar todos los consumibles asociados a la fase `TOMA_MUESTRA` multiplicando su precio de costo actual en inventario por la cantidad definida.
3. **Costo de Procesamiento (Insumos):** Sumar consumibles de la fase `PROCESAMIENTO` (ej: 1 punta amarilla, guantes del bioanalista) multiplicados por su costo en inventario.
4. **Costo de Procesamiento (Calibradores/Controles/Equipo):**
   - Obtener los gastos mensuales del equipo asociado.
   - Sumar `(gasto_soluciones + gasto_calibradores + gasto_controles) / total_pruebas_equipo`.
5. **Costo Administrativo Unitario:** `gastos_administrativos / total_pruebas_mes`.
6. **Costo Personal Unitario:** `gastos_personal / total_pruebas_mes`.
7. **Costo Total Unitario:** Suma de (1 + 2 + 3 + 4 + 5 + 6).
8. **Margen de Ganancia:** Calcular el porcentaje de ganancia neta basado en el `precio_venta` configurado.

#### [MODIFY] [costos.controller.js](file:///c:/controlab-ia/backend/src/modules/costos/costos.controller.js)
Agregar los siguientes endpoints controladores:
- `obtenerDetalleCalculo(req, res)`: Retorna el desglose matemático de costos variables y fijos de una prueba.
- `guardarConfiguracionCosto(req, res)`: Crea o actualiza precios de venta, desperdicio y consumibles para una prueba.
- `guardarGastosGlobales(req, res)` y `obtenerGastosGlobales(req, res)`: Administra egresos y nóminas mensuales.
- `guardarCostoEquipo(req, res)` y `obtenerCostoEquipos(req, res)`: Administra soluciones y calibradores por equipo.

#### [MODIFY] [costos.routes.js](file:///c:/controlab-ia/backend/src/modules/costos/costos.routes.js)
Registrar las nuevas rutas del backend:
- `GET /api/costos/calcular/:pruebaId`
- `POST /api/costos/configurar`
- `GET /api/costos/gastos-globales`
- `POST /api/costos/gastos-globales`
- `GET /api/costos/equipos`
- `POST /api/costos/equipos`

#### [MODIFY] [server-minimo.js](file:///c:/controlab-ia/backend/server-minimo.js)
- Refactorizar y remover las declaraciones de rutas redundantes que ya han sido migradas al servidor unificado (`server.js`).
- Mantener compatibilidad si es necesario, pero desactivar el puerto 5000 de este archivo para que no colisione con `server.js`.

---

### 🎨 Frontend (React & Material UI)

#### [MODIFY] [Costos.jsx](file:///c:/controlab-ia/frontend/src/pages/Costos/Costos.jsx)
Rediseñar la interfaz incorporando una nueva pestaña interactiva: **"Calculadora de Costos y Simulación de Margen"**.
- **Panel de Gastos Globales y Equipos:** Vista premium con campos dinámicos para configurar alquileres, servicios, nóminas totales, volumen de pruebas al mes, calibradores y controles por equipo.
- **Selector de Insumos Pre-Analíticos y de Procesamiento:** Componentes de selección múltiple tipo Chips donde el usuario asocia tubos, agujas, algodón, curitas, puntas de pipeta y guantes directamente desde el inventario.
- **Ficha de Resultados de Costo Unitario:** Un diseño tipo Card premium con gráficos circulares o barras dinámicas que muestren visualmente el desglose porcentual del costo (ej: 40% Reactivo, 15% Administrativo, 25% Nómina, 20% Consumibles) y el margen de rentabilidad neto con colores semafóricos:
  - 🟢 **Verde:** Margen de ganancia > 50%
  - 🟡 **Amarillo:** Margen entre 20% y 50%
  - 🔴 **Rojo:** Margen < 20% (Alerta de pérdida o rentabilidad crítica).

---

## Verification Plan

### Automated Tests
- Validar las fórmulas matemáticas con scripts de testeo en `scratch/test_cost_formulas.js` ingresando datos simulados:
  - Reactivo de Glicemia de $100 con 500 pruebas estimadas y 5% de desperdicio = $0.21 por prueba.
  - Consumibles de toma de muestra = $0.45.
  - Consumibles de procesamiento = $0.10.
  - Prorrateo de calibración/control/soluciones ($300 / 1000 pruebas) = $0.30.
  - Gastos administrativos ($2000 / 5000 pruebas) = $0.40.
  - Personal y nómina ($4000 / 5000 pruebas) = $0.80.
  - **Costo total calculado esperado = $2.26**. Con un precio de venta de $5.00, margen esperado = 54.8%.

### Manual Verification
- Comprobar que no haya colisiones de puertos al iniciar el sistema con los archivos de lote actualizados.
- Realizar pruebas de carga en la base de datos de SQL Server para verificar que el cálculo masivo de márgenes de ganancia responda en menos de 100 ms.
