# Plan de Implementación: Sniffer Multiequipo y Descuento Directo sobre Lotes

Este plan detalla los cambios técnicos que realizaremos en la carpeta de desarrollo **`controlab-desa`** para habilitar el sniffer piloto de 5 analizadores y el descuento directo sobre los lotes de reactivos en la base de datos `ControlabIA_Desa`.

---

## Proposed Changes

### Database & Models

#### [MODIFY] [schema.prisma](file:///c:/controlab-desa/backend/prisma/schema.prisma)
Actualizaremos el modelo `LogSniffer` para incluir los nuevos campos que mapean el equipo de origen y el estado de la prueba (QC, calibración, repetición y lote/ml afectados).

```prisma
model LogSniffer {
  id              Int       @id @default(autoincrement())
  test_name       String    @db.VarChar(100)
  patient_id      String    @db.VarChar(100)
  is_qc           Boolean   @default(false)
  raw_frame       String?   @db.VarChar(Max)
  fecha_registro  DateTime  @default(now())
  procesado       Boolean   @default(false)
  equipo_origen   String?   @db.VarChar(100)
  is_calibracion  Boolean   @default(false)
  is_repeticion   Boolean   @default(false)
  lote_afectado_id Int?
  ml_descontados  Decimal?  @db.Decimal(10, 4)

  @@map("log_sniffer")
}
```

*Nota: La alteración física de las columnas en la base de datos SQL Server `ControlabIA_Desa` ya fue ejecutada con éxito.*

---

### Backend Logic

#### [MODIFY] [sniffer.controller.js](file:///c:/controlab-desa/backend/src/modules/sniffer/sniffer.controller.js)
Actualizaremos el controlador del webhook (`webhookSniffer`) para:
1. Leer los nuevos campos (`equipo_origen`, `is_calibracion`, `is_repeticion`) del cuerpo de la petición.
2. Identificar de manera automática si es QC, calibración o repetición si estos flags no vienen explícitamente pero el ID del paciente coincide con los patrones acordados (ej. `QC_`, `CTRL_`, `CAL_`).
3. **Ejecutar el descuento directo:** Si es un control, calibración o repetición, buscará el reactivo mapeado para la prueba, identificará su **lote activo** y restará el volumen por prueba (`consumo_por_prueba`) directamente de `CantidadActual`.
4. Registrar el movimiento en la tabla `movimientos_inventario` asociando el lote y el motivo (ej. `CONSUMO_SNIFFER_QC` o `CONSUMO_SNIFFER_CALIB`).

---

### Simulation & Scripts

#### [NEW] [Simular_Analizadores.js](file:///c:/controlab-desa/backend/Simular_Analizadores.js)
Crearemos un script de simulación avanzado de los 5 equipos del cliente que enviará peticiones de prueba al webhook en nombre de:
* **CLIA CL 900** (Pruebas de Inmunología como TSH, Prolactina)
* **BS 230 Mindray** (Pruebas de Química como Glucosa, Colesterol)
* **BC 5000 Mindray** (Pruebas de Hematología)
* **BC 5380 Mindray** (Pruebas de Hematología)
* **CA 500 Sysmex** (Pruebas de Coagulación como TP, TTPA)

Este script permitirá simular muestras de pacientes reales, de controles de calidad (QC) y de calibradores para ver cómo el sistema descuenta el stock en tiempo real según el equipo seleccionado.

#### [NEW] [Simular_Analizadores.bat](file:///c:/controlab-desa/Simular_Analizadores.bat)
Un ejecutable `.bat` en la raíz del proyecto de desarrollo para que puedas lanzar la consola de simulación de los 5 equipos con un solo doble clic.

---

## Verification Plan

### Automated/Interactive Testing
1. Iniciaremos el servidor de desarrollo en `controlab-desa` usando `Iniciar_Desarrollo.bat`.
2. Lanzaremos el simulador con `Simular_Analizadores.bat`.
3. Seleccionaremos un equipo (ej. `BS 230 Mindray`) y enviaremos un control de calidad de `GLUCOSA`.
4. Verificaremos en la consola que el backend:
   - Detecta la trama como QC.
   - Encuentra el lote activo de reactivo Glucosa.
   - Aplica el descuento exacto (ej. `0.20 ml`) en la base de datos `ControlabIA_Desa`.
   - Registra el log y el movimiento de almacén correspondiente.
5. Consultaremos el dashboard del sniffer en el frontend para validar que se visualiza el nombre del analizador que envió los datos.
