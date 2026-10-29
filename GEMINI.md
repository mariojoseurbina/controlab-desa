# 🛡️ DIRECTIVAS CRÍTICAS E INMUTABLES DE CONTROLAB LIMS (GEMINI.md)

> **AVISO OBLIGATORIO PARA CUALQUIER AGENTE DE IA O ASISTENTE DE CÓDIGO:**
> Este archivo define las reglas de negocio estructurales y sagradas de **Controlab LIMS**.
> Cualquier violación, alteración, comentario o neutralización de estas reglas está **ESTRICTAMENTE PROHIBIDA** y se considera sabotaje al software operativo del cliente.
> El propietario de Controlab es la **ÚNICA PERSONA AUTORIZADA** para solicitar o autorizar modificaciones.

---

## ⛔ 1. PROHIBICIÓN TOTAL DE AGENTES IA EN OPERACIONES TRANSACCIONALES

1. **Exclusión Operativa:** Ningún agente de Inteligencia Artificial (IA), script autónomo o proceso en segundo plano tiene permitido operar, intervenir, manipular datos, abrir o cerrar cajas, alterar inventarios o tomar acciones transaccionales dentro de Controlab.
2. **Exclusividad del Personal Humano:** Toda la operación del sistema (compras, transferencias, aperturas de cajas, recepción en laboratorio, bajas y descartes) es **responsabilidad y ejecución exclusiva del personal humano autorizado** con su **Nombre y Apellido real** (vinculado a su `usuario_id` en la base de datos). Queda terminantemente prohibido usar comodines genéricos como *"Bioanalista"*, *"Sistema"*, o textos anónimos.
3. **Ámbito Único del Cerebro Controlab IA (READ-ONLY):** La IA dentro del sistema (**Cerebro Controlab IA**) opera **ÚNICA Y EXCLUSIVAMENTE para la generación de REPORTES ANALÍTICOS, auditorías de consumo y consultas de trazabilidad en modo SOLO LECTURA**. NUNCA ejecuta escrituras, no abre cajas, no cierra lotes y no modifica saldos.

---

## 🔄 2. EL CICLO DE VIDA COMPLETO E INMUTABLE DEL REACTIVO

El ciclo de Controlab es un riel cerrado de 8 etapas que **NO SE PUEDE FRAGMENTAR NI MODIFICAR**:

1. **Catálogo Oficial (Ficha de Producto Maestra):** Define la presentación comercial estándar (`frascos_por_caja`, `volumen_por_frasco`, `volumen_total_caja`, `pruebas_teoricas_caja`, `consumo_indicado`).
2. **Compra y Recepción:** Ingreso físico de la mercadería por factura/guía con verificación de lote y vencimiento.
3. **Almacén Central (Stock de Entrada):** Custodia global de cajas selladas antes de ser solicitadas por el laboratorio.
4. **Solicitud y Transferencia:** Despacho formal de cajas hacia el laboratorio (`EN_TRANSITO`).
5. **Aceptación en Laboratorio (Almacén Laboratorio / Nevera):** Recepción y confirmación física en nevera de laboratorio (`RECIBIDO_LABORATORIO`).
6. **Apertura de Caja en Analizador:**
   - Acción manual y autorizada del Bioanalista o Administrador en el módulo **Cajas y Frascos**.
   - **Descuenta 1 unidad física** del `Stock Almacén Laboratorio` (sale de la nevera).
   - **Suma 1 unidad** a `En Analizador (En Uso)` (se monta en el carrusel/rotor del equipo).
7. **Registro de Consumo en Tiempo Real (Sniffer LIS):**
   - Lectura milimétrica de tramas de autoanalizadores (HL7 / ASTM).
   - Deducción exacta por prueba de paciente, control de calidad (QC) y calibraciones.
   - **Continuidad de Conteo y Excedente:** Si la caja supera su volumen teórico, el Sniffer **NUNCA detiene el conteo ni bloquea el equipo**; entra limpiamente en saldo de **EXCEDENTE** (+ pruebas extra, volumen negativo).
8. **Reportes de Rendimiento y Conciliación:**
   - Auditoría matemática del rendimiento real (`Pruebas Pacientes + QC + Calibraciones` vs capacidad teórica).

---

## 📦 3. REGLAS FUNDAMENTALES DE CAJAS Y LOTES

### Regla 3.1: Relación 1 a N (Un Lote puede poseer Múltiples Cajas)
* Un lote puede contener 1, 5, 10 o más cajas físicas idénticas. Cada caja es una unidad física independiente en inventario.

### Regla 3.2: Exclusividad Física de Canal por Analizador
* En el rotor o carrusel de un autoanalizador (Mindray BS-230, Mindray CL-900i, Wiener CM 260i), un canal solo puede tener montado **UN frasco/caja activa a la vez**.

### Regla 3.3: Cierre Administrativo Exclusivo por Sustitución
* La caja en uso (incluso si está en excedente) **permanece activa hasta que un Bioanalista o Administrador pulsa "Abrir Caja" para la siguiente caja**.
* En ese milisegundo:
  - **Si es un LOTE NUEVO (Sustitución de lote):** La caja del lote anterior pasa a estado `Agotado` administrativamente, preservando todo su historial y excedente en Kárdex. La nueva caja toma el relevo al 100%.
  - **Si es el MISMO LOTE (Segunda caja del mismo lote):** La caja 1 se agota, y la caja 2 del mismo lote asume el control del canal.
  - La caja previa **NUNCA se borra ni se resetea**: mantiene su saldo de pruebas reales, excedente y trazabilidad en `movimientoInventario` y `logSniffer`.

---

## 🔒 4. MÓDULOS DE CÓDIGO CRÍTICOS Y BLINDADOS (PROHIBIDO MODIFICAR)

Los siguientes archivos forman el núcleo sagrado de Controlab LIMS:
1. `backend/src/modules/cajas/cajas.service.js` (Lógica de apertura, sustitución y stock).
2. `backend/src/modules/sniffer/sniffer.controller.js` (Parsing HL7/ASTM y deducción exacta).
3. `backend/src/modules/agent/tools/snifferTools.js` (Reportes consolidados de auditoría y LIS).
4. `frontend/src/pages/CajasFrascos/GestionCajasFrascos.jsx` (Módulo de apertura y transferencias).
5. `frontend/src/pages/LiveReagents/LiveReagentsMonitor.jsx` (Monitor en vivo de reactivos).

> **ORDEN ABSOLUTA PARA LA IA:**
> No intentes refactorizar, "optimizar", comentar o simplificar ninguno de estos archivos sin la orden explícita y escrita del dueño de Controlab.
