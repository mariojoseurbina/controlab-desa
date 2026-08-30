# Plan de Implementación: Prorrateo de Costos por Área Operativa (Controlab IA)

Este plan describe el diseño e implementación para prorratear los costos de calibradores, soluciones y controles de los equipos analíticos según el volumen de pruebas específico de cada área operativa (e.g. Química, Hematología) en lugar de utilizar un divisor global o fijo de equipo.

---

## User Review Required

> [!IMPORTANT]
> - Se creará una nueva tabla en la base de datos `volumen_area_mensual` para almacenar los volúmenes de pruebas procesadas por área operativa cada mes.
> - Se ejecutará `npx prisma db push` en el backend para aplicar los cambios a SQL Server.
> - En el frontend se extraerán dinámicamente las áreas operativas definidas en el catálogo de inventario e impacto fiscal, permitiendo configurar sus volúmenes en una nueva sección del formulario de gastos fijos mensuales.

---

## Proposed Changes

### Base de Datos & Prisma

#### [MODIFY] [schema.prisma](file:///c:/controlab-ia/backend/prisma/schema.prisma)
- Agregar el modelo `VolumenAreaMensual` con la clave única compuesta `mes_anio_area`:
  ```prisma
  model VolumenAreaMensual {
    id      Int    @id @default(autoincrement())
    mes     Int
    anio    Int
    area    String @db.NVarChar(100)
    volumen Int
    
    @@unique([mes, anio, area], name: "mes_anio_area")
    @@map("volumen_area_mensual")
  }
  ```

### Backend

#### [MODIFY] [costos.service.js](file:///c:/controlab-ia/backend/src/modules/costos/costos.service.js)
1. **`saveGastosGlobales`**:
   - Modificar para aceptar el objeto `volumenes_area` y guardarlos en una transacción transaccional (`prisma.$transaction`) mediante `upsert` en la nueva tabla `VolumenAreaMensual`.
2. **`getGastosGlobales`**:
   - Consultar la tabla `volumen_area_mensual` y mapear los volúmenes por área dentro del objeto de gastos devuelto.
3. **`calcularCostoPrueba`**:
   - Obtener el `area_operativa` del reactivo principal de la prueba.
   - Consultar el volumen registrado para esa área en el mes/año del cálculo.
   - Si existe y es mayor a 0, utilizar dicho volumen como denominador para prorratear los costos de soluciones, calibradores y controles del equipo, en lugar de `eq.total_pruebas_equipo`.

### Frontend

#### [MODIFY] [Costos.jsx](file:///c:/controlab-ia/frontend/src/pages/Costos/Costos.jsx)
1. **Estado de Volúmenes por Área**:
   - Añadir el estado local `volumenesArea` (objeto de `{ [area]: valor }`).
2. **UI de Carga de Volúmenes**:
   - En la tarjeta "Gastos Mensuales Globales" (subTabCostos === 0) y en el desglose (subTabCostos === 2), renderizar una sección dinámica que enumere las áreas operativas activas y sus campos de entrada correspondientes.
3. **Guardado Integrado**:
   - Enviar `volumenes_area` como parte del payload en `handleSaveGastosGlobales`.
4. **Auto-carga**:
   - Al seleccionar o cambiar de mes/año, cargar los volúmenes del área correspondientes al registro cargado desde `gastosGlobales`.

---

## Verification Plan

### Automated Tests
- Escribir un script de prueba de base de datos y negocio `scratch/test-prorrateo-area.js` para simular:
  1. El guardado de volúmenes por área (e.g. Química = 10,000, Hematología = 5,000) en Junio de 2026.
  2. El cálculo de costos de una prueba de Química y comprobar que el divisor utilizado en los costos de soluciones/calibradores coincida exactamente con 10,000.

### Manual Verification
- Ingresar a la aplicación web, cambiar los volúmenes de área en el formulario, guardar y volver a cargar el periodo para confirmar su persistencia.
- Ejecutar una simulación de cálculo y auditar el desglose de fórmulas para ver el volumen del área operativa reflejado.
