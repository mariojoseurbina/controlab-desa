# CONTROLAB VET LIS: Manual de Flujo de Trabajo y Reporte de Resultados Clínicos
### *Una solución integral técnica y comercial para laboratorios veterinarios modernos*

---

## 1. Introducción y Propuesta de Valor Comercial

El sistema **CONTROLAB VET LIS** (Laboratory Information System) representa la evolución tecnológica en la gestión de análisis de diagnóstico para medicina veterinaria. A diferencia de los sistemas de laboratorio clínico de humana, la veterinaria enfrenta retos de variabilidad biológica extremos: los valores de referencia fisiológicos son completamente distintos entre especies (p. ej., un bovino frente a un felino o un canino) e incluso entre razas específicas (p. ej., un canino de raza Galgo frente a un Chihuahua) y propósitos productivos (leche vs. carne).

**CONTROLAB VET LIS** unifica las necesidades comerciales del negocio de laboratorio con la rigurosidad técnica necesaria para el diagnóstico de campo y de clínica de mascotas.

```
       +-------------------------------------------------------+
       |             VALOR COMERCIAL Y OPERATIVO               |
       +-------------------------------------------------------+
            |                                       |
  [ Eficiencia en Costos ]                [ Precisión de Diagnóstico ]
  Deducción automática de                 Fórmulas dinámicas de rangos de
  reactivos por prueba y                  referencia por Especie, Raza,
  control estricto de mermas.             Sexo y Edad.
            |                                       |
  [ Fidelización del Cliente ]            [ Imagen Profesional ]
  Gráficas de evolución clínica           Reportes PDF listos para entrega
  e históricos del paciente.              con firmas y alertas visuales.
```

### Principales Beneficios Comerciales:
1. **Precisión Multiespecie Sin Errores Manuales:** Automatiza el cruce de rangos de referencia eliminando el error humano de buscar en tablas impresas. Cada reporte cuenta con el rango de referencia exacto correspondiente al paciente.
2. **Control Financiero en Tiempo Real (Inventario Integrado):** Cada examen procesado descuenta automáticamente del inventario la cantidad exacta de mililitros o insumos de los reactivos según la "receta" de la prueba, calculando además el desperdicio estimado. Esto permite al laboratorio conocer su margen de ganancia real por prueba y evitar fugas de insumos.
3. **Fidelización Basada en Datos (Evolución Clínica):** Permite a los laboratorios proveer a los veterinarios clínicos y productores agropecuarios un gráfico del progreso de los parámetros en el tiempo. Un ganadero puede ver la evolución del perfil metabólico de su lote o un dueño de mascota el progreso renal de su paciente crónico.
4. **Imagen Corporativa de Alto Nivel:** Generación automatizada de reportes médicos en formato PDF de alta resolución, estructurados de forma espaciosa e impecable, con resalte visual en rojo y con asterisco (`*`) para valores alterados.

---

## 2. Arquitectura Técnica del Sistema

**CONTROLAB VET LIS** está desarrollado con un stack moderno y eficiente:
*   **Base de Datos Relacional (SQL Server):** Garantiza la consistencia e integridad transaccional de los registros (fincas, animales, órdenes, resultados, inventario y lotes).
*   **ORM de Última Generación (Prisma):** Maneja la comunicación con la base de datos de manera tipada y segura, asegurando que las operaciones críticas (como registrar resultados y descontar stock simultáneamente) se ejecuten en transacciones aisladas para evitar inconsistencias de datos.
*   **Servicio de Generación de Reportes (PDFKit):** Un motor backend diseñado a medida que calcula los saltos de página de forma inteligente para evitar encabalgamiento de firmas u observaciones, permitiendo reportes de una o varias páginas con acabado profesional de imprenta.
*   **Modularidad Limpia (Screaming Architecture):** El código se organiza en módulos de dominio autónomos (`vet`, `inventory`, `purchases`, `costos`, `ai-assistant`). Esto asegura facilidad de mantenimiento y escalabilidad.

---

## 3. Flujo de Trabajo Completo del LIS (Workflow)

El ciclo de vida de una muestra dentro del laboratorio se gestiona de forma secuencial a través de 6 fases clave:

```
[ 1. Registro ] ---> [ 2. Creación de Orden ] ---> [ 3. Procesamiento ]
  Cliente, Finca       Código VET único,             Ingreso de valores,
  y Paciente           selección de parámetros.      validación de rangos.
                                                               |
                                                               v
[ 6. Evolución ] <--- [ 5. Reporte PDF ] <--------- [ 4. Depleción Inv. ]
  Gráficos e           Generación del reporte        Descuento de reactivos
  historiales.         con alertas visuales.         y cálculo de márgenes.
```

### Paso 1: Alta y Registro de Clientes y Pacientes
Antes del análisis, se capturan las variables demográficas del paciente y del propietario para establecer las bases de la validación fisiológica.
1.  **Finca / Propietario (`Propietario`):** Se registran datos comerciales y de localización:
    *   Nombre de la Finca o Propietario.
    *   Identificación fiscal / Cédula.
    *   Teléfono y correo electrónico (para el envío automático de resultados).
    *   Registro Oficial de Finca (clave en ganadería bovina/porcina).
    *   Médico Veterinario tratante (para reporte de cortesía).
    *   Dirección física.
2.  **Paciente Animal (`Animal`):**
    *   Identificador único (Número de arete, chip, chapeta o nombre).
    *   Especie asociada (Bovino, Equino, Canino, Felino, Ovino, Caprino, etc.).
    *   Raza específica (Holstein, Brahman, Quarter Horse, Poodle, etc.).
    *   Sexo (Macho / Hembra).
    *   Fecha de nacimiento y cálculo dinámico de la edad en meses.
    *   Propósito productivo/rol (Mascota, Leche, Carne, Trabajo, Reproducción).

### Paso 2: Apertura de la Orden Médica (`ExamenVeterinario` - Estado: *PENDIENTE*)
Cuando la muestra física ingresa al laboratorio, se genera un registro digital único en la plataforma:
1.  El sistema genera automáticamente un **código de orden estructurado**: `VET-YYYYMMDD-XXX` (p. ej., `VET-20260626-004`), que asegura la trazabilidad total.
2.  Se asocian los parámetros clínicos solicitados (p. ej., Hemoglobina, Glucosa, Creatinina, ALT).
3.  El sistema inicializa los registros de resultados de estos parámetros con valores vacíos (`null`) y establece el estado inicial de la orden como **PENDIENTE**.

### Paso 3: Carga y Validación Inteligente de Resultados
Una vez procesadas las muestras en los analizadores químicos y hematológicos, el bioanalista introduce los valores en la interfaz:
1.  **Validación de Rango Fisiológico Dinámico:** Tan pronto como se introduce un resultado numérico, el sistema invoca la función interna `checkRango(parametroId, animalId, valorNumerico)`. Esta función realiza el siguiente análisis en milisegundos:
    *   Busca las reglas de rangos en `valores_referencia_examen` filtrando por la **Especie** del animal.
    *   Si existen rangos para la **Raza** específica del animal, los prioriza. Si no, aplica el rango genérico de la especie.
    *   Filtra y refina los límites basándose en el **Sexo** del paciente.
    *   Aplica límites de acuerdo con la **Edad en meses** (diferenciando cachorros/becerros de adultos).
2.  **Marcado Automático:** Si el valor introducido es inferior al mínimo o superior al máximo calculado:
    *   Se activa la bandera `fuera_rango = true` en la base de datos.
    *   Se etiqueta el resultado para el resaltado visual en el reporte.
3.  **Transición de Estados de la Orden:**
    *   Si se ingresan solo algunos resultados, el estado cambia a **PARCIAL**.
    *   Si se completan todos los resultados solicitados, el estado pasa automáticamente a **PROCESADO** y se sella la fecha de reporte (`fecha_resultado`).

### Paso 4: Desincorporación de Inventario y Control de Costos (Back-office)
De forma transparente al usuario, al guardar los resultados, el sistema activa la lógica de conciliación del inventario:
1.  El sistema busca el **mapeo de pruebas** para determinar qué reactivo o kit de reactivo (`kit_reactivos`) consume el análisis ejecutado.
2.  Deduce del lote de reactivo activo (`LotesReactivos`) los mililitros consumidos según el volumen de trabajo registrado (p. ej., `0.05 ml` de reactivo por prueba).
3.  Actualiza el conteo de **Pruebas Restantes** del lote activo, permitiendo emitir alertas de stock crítico antes de que ocurra una rotura de stock.
4.  **Cálculo Financiero de la Prueba:** Relaciona el costo del reactivo consumido más el porcentaje de desperdicio configurado (desperdicio por calibración o mantenimiento), el prorrateo de gastos de personal y gastos operativos globales para determinar la rentabilidad real de esa orden en el mes.

---

## 4. Reporte de Resultados Clínicos y PDF de Entrega

El reporte es la cara visible del laboratorio ante sus clientes. Por ello, **CONTROLAB VET LIS** genera un informe de alta gama diseñado para infundir confianza y profesionalismo.

### A. Estructura de Diseño del Reporte PDF
El archivo PDF generado por el servicio de backend cuenta con una disposición simétrica organizada en las siguientes secciones:

1.  **Cabecera de Marca (Header):**
    *   Título corporativo **CONTROLAB VET** en verde clínico profundo (`#1b5e20`).
    *   Subtítulo descriptivo en gris carbón: *"Sistema de Información de Laboratorio Veterinario"*.
    *   Caja de metadatos de la orden a la derecha con: Código correlativo, Fecha de Muestra, Fecha de Reporte y numeración de página dinámica.
    *   Línea de corte elegante en gris claro.
2.  **Bloque de Datos del Cliente e Identificación de Finca:**
    *   Nombre de Finca / Propietario.
    *   Identificación / Registro Finca.
    *   Médico Veterinario Solicitante y Contacto.
    *   Dirección de procedencia.
3.  **Bloque de Datos del Paciente Veterinario (Alineado en paralelo a la derecha):**
    *   Identificador del Animal.
    *   Especie y Raza.
    *   Sexo y Propósito Productivo.
4.  **Tabla de Resultados Clínicos (Estructura de Columnas):**
    *   **PARÁMETRO:** Nombre completo de la prueba.
    *   **RESULTADO:** Valor numérico formateado. Si el valor está fuera de rango, se muestra en **Negrita**, en **color rojo**, y se le añade un **asterisco (`*`)** para llamar inmediatamente la atención del médico veterinario.
    *   **UNIDAD:** Unidades de medida estándar (g/dL, mg/dL, UI/L, etc.).
    *   **VALORES DE REFERENCIA:** El rango exacto calculado para esa especie/raza/edad/sexo específica (ej. `6.00 - 8.00`).
    *   **ESTADO:** Indica textualmente si el valor se encuentra **Normal** o **ALTERADO** (en rojo).
5.  **Observaciones y Comentarios:**
    *   Área para anotaciones diagnósticas introducidas por el bioanalista.
6.  **Sección de Firma Autorizada:**
    *   Línea de firma y sello centrada para el Bioanalista o Médico Veterinario responsable del análisis.
7.  **Pie de Página Institucional (Footer):**
    *   Banda de color grisáceo claro que enmarca el aviso de responsabilidad: *"Controlab VET LIS - Resultados para uso exclusivo de medicina veterinaria diagnóstica."*

---

## 5. Historial Clínico de Evolución (Visualización y Seguimiento)

Uno de los mayores atractivos comerciales y técnicos de la plataforma es la consulta de **Evolución Clínica**. 

El sistema consolida todos los exámenes históricos del animal y genera un reporte estructurado que muestra:
*   La evolución cronológica de cada parámetro analizado.
*   Gráficos temporales que permiten ver si los valores alterados están retornando a la normalidad tras la aplicación de un tratamiento médico o nutricional.
*   Este historial es consultable ingresando la identificación única del animal o el código de su orden de examen reciente.

---

## 6. Ejemplo Práctico de Flujo Completo

A continuación, se detalla un caso de uso real en el laboratorio:

```
[ Ingreso ] ------------------------------------------------------------+
  - Propietario: Agropecuaria Santa Maria (Finca #4489)                  |
  - Paciente: Vaca "Estrella" (Especie: Bovino, Raza: Carora, Hembra)     |
                                                                         |
[ Orden ] ---------------------------------------------------------------+
  - Código: VET-20260626-001 (Parámetros: Glicemia, Calcio)              |
                                                                         |
[ Procesamiento ] -------------------------------------------------------+
  - Glicemia: 95.00 mg/dL (Normal para Bovinos)                          |
  - Calcio: 6.80 mg/dL (ALTERADO - Rango ref: 8.00 - 10.50 mg/dL)        |
  - Descuento de stock en lote de reactivos de Calcio y Glicemia         |
                                                                         |
[ Reporte ] -------------------------------------------------------------+
  - Generación de PDF: Calcio resaltado en rojo con asterisco (6.80 *)   |
  - Firma del veterinario. Entrega automática.                           |
```

Este nivel de automatización asegura que el laboratorio aumente su flujo de trabajo (throughput) diario, garantice la calidad de los reportes y mantenga una contabilidad de costos impecable, proyectando una imagen comercial de liderazgo y solidez técnica.
