# PLAN DE ESCENARIOS: Integración Silenciosa de Historiales Clínicos de Humanos (Infolab -> Nuevo LIS)

Este documento analiza los escenarios de factibilidad técnica y estratégica para extraer y migrar el historial de pacientes desde el sistema competidor (**Infolab**) hacia un nuevo **LIS de Humanos**, minimizando o anulando el riesgo de que la competencia detecte la extracción de datos y aplique bloqueos automáticos o manuales de bases de datos.

---

## 1. El Desafío: Detección y Bloqueos de la Competencia

El departamento de TI del competidor (Infolab) o sus distribuidores locales suelen proteger su cuota de mercado limitando la interoperabilidad. Sus principales mecanismos de defensa frente a una migración/integración externa de bases de datos activa son:
*   **Monitoreo de Procesos y Conexiones:** Triggers o alarmas en el motor de base de datos (comúnmente *Firebird* o *SQL Server*) que identifican inicios de sesión de herramientas de terceros u IPs no registradas.
*   **Locks Exclusivos de Tabla:** Si detectan un barrido masivo de lectura (`SELECT * FROM pacientes`), el software puede forzar bloqueos transaccionales lentos para simular que el sistema "se cayó" debido a la intromisión, forzando al cliente a desconectar el integrador.
*   **Actualizaciones Ofuscadas:** Cambio constante de contraseñas de administración de base de datos (`masterkey` u otras personalizadas) a través de updates automáticos de software.

---

## 2. Escenarios Tecnológicos de Integración

A continuación, se presentan los **4 escenarios posibles** con su nivel de riesgo y viabilidad práctica:

```
+-------------------------------------------------------------------------+
|                       MATRIZ DE ESCENARIOS                              |
+-------------------------------------------------------------------------+
| Escenario           | Viabilidad Técnica | Riesgo de Detección | Tiempo |
+---------------------+--------------------+---------------------+--------+
| A. Conexión Directa | Alta               | Crítico (Muy Alto)  | Real   |
| B. Migración Backup | Muy Alta           | Cero                | Lotes  |
| C. PDF Scraping     | Media-Alta         | Cero                | Real   |
| D. Sniffing HL7     | Media              | Cero                | Real   |
+-------------------------------------------------------------------------+
```

### Escenario A: Conexión y Extracción Directa de la Base de Datos Activa (Online)
Consiste en conectar el nuevo LIS directamente al motor de base de datos local de Infolab mediante un puente ODBC, JDBC o conexión nativa para extraer los datos de las tablas de pacientes y resultados en caliente.

*   **Cómo se realiza:** Se configura un agente extractor en el servidor local que ejecuta consultas SQL a las tablas de pacientes y exámenes de forma recurrente.
*   **Riesgo de Detección / Bloqueo por la Competencia:** **CRÍTICO (Muy Alto).**
    *   Cualquier barrido SQL constante dejará rastros evidentes en los logs del servidor (historial de queries de la BD).
    *   La competencia puede implementar *Triggers de Auditoría* (disparadores de seguridad) que, al detectar lecturas masivas fuera de las aplicaciones oficiales de Infolab, bloqueen temporalmente el acceso a la tabla (`LOCK TABLE`) o cambien el esquema de cifrado.
*   **Estrategia de Mitigación Silenciosa (Si se opta por este camino):**
    1.  **Nivel de Aislamiento Sucio:** Usar `SET TRANSACTION DIAGNOSTICS` o sentencias tipo `WITH (NOLOCK)` / `READ UNCOMMITTED` para evitar bloqueos por concurrencia en la base de datos operativa.
    2.  **Extracción Fragmentada:** No hacer un volcado masivo. Extraer la data en lotes pequeños (p. ej., de 10 en 10 pacientes) solo en horas de nula actividad (madrugada, de 1:00 AM a 4:00 AM).
    3.  **Técnica de la Consulta Específica:** En lugar de sincronizar toda la base de datos, el nuevo LIS solo consulta el historial del paciente *en demanda* cuando dicho paciente se presenta en el laboratorio. Esto minimiza el tráfico haciéndolo indetectable frente al uso regular.

### Escenario B: Migración Offline Basada en Respaldos (Dumps / Backups)
Consiste en realizar una extracción en frío de la base de datos. Se genera una copia de seguridad nativa de Infolab y se procesa de manera completamente desconectada del sistema en producción.

*   **Cómo se realiza:** El administrador del laboratorio (quien tiene derecho legal y físico sobre su información) realiza un backup completo de la base de datos (p. ej., archivo `.fbk` en Firebird o `.bak` en SQL Server). Este archivo se monta en un servidor de desarrollo aislado perteneciente al nuevo LIS. Un script extractor offline lee, mapea e inserta todos los historiales en la base de datos del nuevo LIS.
*   **Riesgo de Detección / Bloqueo por la Competencia:** **NULO (Cero).**
    *   Infolab se ejecuta normalmente. No hay procesos extraños leyendo su base de datos activa.
    *   La extracción se hace en un servidor externo controlado por el nuevo LIS, donde las defensas de Infolab no existen ni tienen conectividad.
*   **Limitaciones:**
    *   Es una migración en lote (batch). No es en tiempo real.
    *   Funciona perfectamente para la carga histórica inicial durante la transición del sistema (p. ej., migrar los últimos 5 años de historia del laboratorio). Si se requiere sincronización continua mientras convivan ambos sistemas, se tendría que programar una restauración de backup nocturna, lo cual es logísticamente pesado.

### Escenario C: Intercepción y Scraping de Reportes de Salida (PDF / Print Spooler)
En lugar de intentar penetrar la base de datos, el nuevo LIS intercepta la salida natural de información del sistema competidor.

*   **Cómo se realiza:** Cuando Infolab genera e imprime los reportes de resultados en formato PDF, o los envía a la cola de impresión física/virtual, un agente del nuevo LIS instalado en la red local intercepta estos documentos. Utilizando bibliotecas de extracción de texto PDF o un parser OCR especializado, lee los campos: Cédula, Nombre del Paciente, Fecha, Pruebas y Resultados, y los inserta inmediatamente en el historial consolidado del nuevo LIS.
*   **Riesgo de Detección / Bloqueo por la Competencia:** **NULO (Cero).**
    *   La exportación e impresión de resultados es una funcionalidad esencial que Infolab no puede bloquear sin romper su propio software.
    *   Para Infolab, el reporte simplemente fue "impreso" o "guardado". No tiene forma de saber que el nuevo LIS leyó el flujo de impresión para poblar su propio historial.
*   **Limitaciones:**
    *   Requiere que el reporte se genere o se imprima para poder capturarlo.
    *   El parser de PDF depende de que el diseño visual del reporte de Infolab no cambie bruscamente de posición (si cambia de diseño, hay que ajustar las coordenadas de lectura del parser).

### Escenario D: Escucha Activa de Red / Intercepción de Protocolo (Sniffing HL7 / ASTM)
Aprovecha que los analizadores de sangre automáticos transmiten la data en protocolos estandarizados de comunicación clínica (HL7, ASTM o archivos planos).

*   **Cómo se realiza:** Se coloca un "espejo de red" (Network Sniffer) o un puente de comunicación física entre los equipos analizadores y el servidor de Infolab. Cada vez que una máquina reporta resultados del paciente, el nuevo LIS captura esa trama en paralelo.
*   **Riesgo de Detección / Bloqueo por la Competencia:** **NULO (Cero).**
    *   La competencia no tiene control sobre la capa física de red ni sobre las salidas directas RS232/Ethernet de los equipos de laboratorio.
*   **Limitaciones:**
    *   Solo captura los exámenes procesados a partir del momento en que se instala el puente. No sirve para recuperar el historial de años anteriores de pacientes que no se han vuelto a realizar pruebas.

---

## 3. Plan y Recomendación Estratégica

Para lograr una transición o coexistencia sin que la competencia se entere ni pueda boicotear la base de datos, la **estrategia híbrida recomendada** es:

1.  **Fase 1 (Carga Fría - Historial Completo):** Utilizar el **Escenario B (Respaldos Offline)**. Pedir al laboratorio un backup del sistema Infolab un fin de semana. Procesarlo fuera del entorno operativo y cargar el 100% del historial de pacientes existente en el nuevo LIS.
2.  **Fase 2 (Sincronización en Demanda - Día a Día):** Utilizar el **Escenario A modificado (Consulta Específica bajo demanda con NOLOCK)**. Si un paciente llega al laboratorio, el nuevo LIS realiza una sola consulta rápida a Infolab para verificar si hubo visitas intermedias desde la última carga offline. Al ser una consulta puntual y de lectura no bloqueante, pasa completamente desapercibida bajo el tráfico normal de red del sistema de base de datos.
3.  **Fase 3 (Tolerancia a Bloqueos):** Si la competencia cambia contraseñas o aplica parches para bloquear la Fase 2, se activa automáticamente el **Escenario C (PDF Scraping)** como plan de contingencia. Los resultados nuevos se capturan directamente desde las carpetas de exportación de PDF de Infolab a medida que se generan los reportes.
