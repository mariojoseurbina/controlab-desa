# Walkthrough de Implementación: Sniffer Multiequipo en Desarrollo

He completado el plan de desarrollo piloto para integrar las tramas de los 5 equipos del cliente (`CLIA CL 900`, `BS 230`, `BC 5000`, `BC 5380` y `CA 500`) en el entorno de desarrollo **`controlab-desa`**.

---

## Cambios Realizados

1. **Alteraciones en Base de Datos `ControlabIA_Desa`:**
   - Añadidas las columnas `equipo_origen`, `is_calibracion`, `is_repeticion`, `lote_afectado_id`, y `ml_descontados` a la tabla `log_sniffer`.
   - Creados dos nuevos reactivos de prueba (`TSH` para Inmunología y `TP` para Coagulación) con sus respectivos lotes de `100.00 ml` activos en `LotesReactivos`.
   - Creados los mapeos correspondientes en la tabla `mapeo_pruebas_reactivos` para asociar las tramas de `TSH` (CLIA CL 900), `HEMOGRAMA` (BC 5000/5380) y `TP` (CA 500).
2. **Actualización de Modelos Prisma:**
   - Modificado el archivo [schema.prisma](file:///c:/controlab-desa/backend/prisma/schema.prisma) para reflejar los nuevos campos del log de sniffer.
   - Regenerado el cliente Prisma en la carpeta de backend.
3. **Descuento de Reactivos Directo sobre Lote:**
   - Implementada la lógica de negocio síncrona en el webhook del sniffer en [sniffer.controller.js](file:///c:/controlab-desa/backend/src/modules/sniffer/sniffer.controller.js) para que calcule y ejecute la deducción en ml y asocie la transacción a un lote activo aplicando la política de vencimientos FEFO.
   - Añadida auto-detección de repeticiones (si se detecta el mismo ID de paciente y examen en menos de 10 minutos por el mismo equipo).
4. **Herramientas de Simulación:**
   - Creado el simulador interactivo de consola [Simular_Analizadores.js](file:///c:/controlab-desa/backend/Simular_Analizadores.js) para enviar tramas de cualquiera de los 5 equipos reales con flags de QC, Calibrador o Paciente Normal.
   - Creado el script de arranque [Simular_Analizadores.bat](file:///c:/controlab-desa/Simular_Analizadores.bat).

---

## Guía de Verificación Paso a Paso

1. Inicia los servidores de desarrollo de la carpeta `controlab-desa` haciendo doble clic en **`Iniciar_Desarrollo.bat`** (estará en `C:\controlab-desa\`).
2. Abre una ventana de consola nueva y ejecuta el simulador haciendo doble clic en **`Simular_Analizadores.bat`**.
3. Sigue el menú interactivo para simular el envío de datos de un analizador:
   - Selecciona **BS 230 Mindray (Química)**.
   - Selecciona la prueba **GLUCOSA**.
   - Selecciona la corrida **Control de Calidad (QC_LEVEL_1)**.
4. Revisa los resultados en pantalla:
   - Verás cómo el backend registra la trama, deduce de manera síncrona `0.25 ml` del lote activo de glucosa y actualiza el kárdex con el motivo `Consumo Sniffer (QC) - BS 230 Mindray (Quimica)`.
5. Prueba ahora una **Repetición** seleccionando esa opción en el menú:
   - El simulador enviará dos tramas seguidas para el mismo paciente. El backend detectará automáticamente el duplicado y registrará la segunda prueba como `[REPETICION]`, descontando el reactivo correspondiente.
