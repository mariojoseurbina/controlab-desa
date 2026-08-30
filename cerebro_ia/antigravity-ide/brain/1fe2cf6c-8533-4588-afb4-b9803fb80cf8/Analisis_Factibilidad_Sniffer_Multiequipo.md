# Análisis de Factibilidad Técnica: Sniffer Multiequipo y Descuento Directo por Lote

Este documento presenta una evaluación de factibilidad realista, honesta y detallada para implementar una arquitectura de sniffers concurrentes en tres analizadores (dos de química y uno de hematología) con descuento automático sobre lotes de reactivos multi-frasco.

---

## 1. Viabilidad General del Escenario: **FACTIBLE (90%)**

El escenario planteado es completamente viable y representa el estándar de oro en sistemas LIMS de última generación. Sin embargo, existen desafíos logísticos y físicos en el laboratorio que determinan si el descuento es 100% preciso o una aproximación teórica.

### 📊 Desglose de Factibilidad por Capas:

| Componente | Factibilidad | Desafío Técnico Principal |
| :--- | :---: | :--- |
| **Captura de tramas (Sniffer)** | **100%** | Conectividad física (RS-232 serial o TCP/IP) en cada equipo. |
| **Identificación de QC/Calibradores/Repeticiones** | **95%** | Mapear la nomenclatura con la que el personal nombra los controles en cada analizador. |
| **Descuento directo sobre Lote** | **100%** | Resta transaccional directa en base de datos. |
| **Trazabilidad Vial a Vial (6 frascos)** | **60%** | Dependencia de si el analizador lee códigos de barras de frasco único o si requiere confirmación humana. |

---

## 2. Arquitectura de Conectividad (Cómo se implementa en la realidad)

Para capturar la información de 3 equipos en paralelo y descontar en tiempo real, la infraestructura debe estructurarse de la siguiente manera:

```mermaid
graph TD
    subgraph Red del Laboratorio LAN
        EQ1[Química 1 - IP Fija: 192.168.1.50] -- TCP/IP Directo --> SW[Switch Local]
        EQ2[Química 2 - IP Fija: 192.168.1.51] -- TCP/IP Directo --> SW
        EQ3[Hematología - IP Fija: 192.168.1.52] -- TCP/IP Directo --> SW
    end

    subgraph Servidor Controlab IA (IP Fija LIMS: 192.168.1.10)
        SW -- Tráfico TCP (ASTM/HL7) --> Listener[Servidor de Escucha/Sniffer Service]
        Listener -- Parsea Tramas --> Webhook[API Webhook: /api/sniffer/webhook]
        Webhook -- Procesa Lógica de Negocio --> Engine[Motor de Inventario]
        Engine -- Transacción SQL --> DB[(Base de Datos SQL Server)]
    end
    
    DB --> LH[LotesReactivos: Descuento ml]
    DB --> MV[movimientos_inventario: Registro Consumo QC]
```

### Protocolos a Descifrar (El "Idioma" de los Equipos):
1. **ASTM E1381/E1394 (Frecuente en Química):** Las tramas son bloques de texto delimitados por caracteres de control (`STX`, `ETX`). La información de si es control de calidad viene en el campo `Patient ID` del registro `P` (donde en lugar de un nombre se escribe "QC-NORMAL", "QC-HIGH") o en el tipo de muestra.
2. **HL7 (Frecuente en Hematología):** Estructura segmentada por tuberías (`|`). El segmento `OBR` indica el tipo de muestra (si es muestra de paciente `P` o control `Q`).

---

## 3. El Reto de los Lotes Multi-Frasco (6 frascos)

El cliente menciona que un lote puede traer 6 frascos, pero quieren descontar **directamente del lote**. Aquí hay dos formas de modelarlo en base de datos, con sus respectivas implicaciones reales:

### Opción A: Tratamiento de Líquido Global (La más práctica y recomendada)
El lote se registra en el sistema con el volumen consolidado.
* *Ejemplo:* Si el kit trae 6 frascos de 50 ml, el sistema registra el lote con una **Cantidad Inicial de 300 ml**.
* **Cómo se descuenta:** Cada vez que el sniffer detecta una prueba, se restan los `0.1 ml` directamente de los `300 ml`.
* **Pros:** Cero intervención humana. El descuento es directo y fluido.
* **Contras:** El sistema no sabe físicamente qué frasco de los 6 está montado en el equipo, solo sabe que el lote en general se está consumiendo.

### Opción B: Tracking Vial a Vial (Estricto control de mermas por frasco)
Cada frasco de los 6 se registra como un sub-lote o correlativo (ej. `LOTE123-F1`, `LOTE123-F2`).
* **Cómo se descuenta:** El descuento va al frasco marcado como "F1 (Activo)". Cuando el consumo llega a 50ml, el sistema bloquea ese frasco, alerta al usuario, y éste debe marcar físicamente que colocó el "F2" en el carrusel del equipo para activar el descuento en el nuevo frasco.
* **Pros:** Permite auditar si se desperdició líquido al descartar un frasco a medio usar.
* **Contras:** Requiere que el operador confirme el cambio de frasco en el sistema (rompe la automatización al 100%).

---

## 4. Limitaciones Reales que no debemos ocultar al Cliente

Para que la venta sea transparente y exitosa, debes advertir al cliente sobre estas realidades operativas:

1. **La "Merma Muerta" del Frasco:** 
   Un frasco de 50 ml nunca rinde 50 ml exactos en pruebas. Los analizadores requieren un volumen mínimo de "zona muerta" (aprox. 2 a 5 ml en el fondo del frasco) para que la aguja pueda succionar sin aspirar burbujas de aire. Por lo tanto, el sistema debe contemplar un **Porcentaje de Merma Estructural** (ej. 5% o 10%) configurado en el lote, de lo contrario, el stock teórico del sistema siempre marcará que queda reactivo cuando el frasco físico ya esté vacío en el equipo.
2. **Nomenclatura de Controles:**
   El personal del laboratorio debe estar entrenado para registrar los controles de calidad en el equipo bajo una nomenclatura estricta (ej. iniciar siempre el ID del paciente con "CTRL_" o "QC_"). Si un operador corre un calibrador registrándolo con el ID "Prueba1", el sniffer lo procesará como si fuera un paciente normal y no registrará la traza de control de calidad.
3. **El Analizador no reporta reactivos directamente, reporta pruebas:**
   Ningún analizador del mercado le dice al LIS: *"A cabo de gastar 0.25 ml del lote X"*. El analizador solo dice: *"Acabo de procesar una GLUCOSA para el paciente Y"*. Es el LIMS (Controlab IA) quien debe realizar la traducción matemática en base al mapeo de la prueba y el volumen de consumo configurado por examen.

---

## 5. Plan de Implementación Técnica en Controlab IA

Para soportar este escenario en el backend actual, debemos realizar las siguientes extensiones:

### Paso 1: Ampliar la tabla `LogSniffer`
Debemos añadir el campo `lote_afectado_id` y `ml_descontados` para tener trazabilidad directa de qué lote pagó el consumo de cada traba del sniffer.

### Paso 2: Crear el disparador en el Webhook (`webhookSniffer`)
Modificar la ruta `/api/sniffer/webhook` para que realice lo siguiente de forma síncrona:
1. Buscar el `reactivo_id` mapeado para la prueba recibida.
2. Encontrar el lote "Activo" con stock de ese reactivo.
3. Restar el consumo del lote y registrar el movimiento de inventario con tipo `CONSUMO_SNIFFER`.
4. Si la trama tiene el flag `is_qc = true`, marcar el motivo del movimiento como "Auditoría de Red - Control de Calidad / Repetición".

---

## Conclusión

El escenario es **altamente factible y de altísimo valor comercial**. Resuelve el problema del "gasto hormiga" que representa hasta el 20% de las pérdidas en reactivos de un laboratorio (calibraciones y repeticiones no facturadas). La recomendación de diseño es utilizar la **Opción A (Volumen Global del Lote)** para mantener el proceso 100% automatizado y sin fricción operativa.
