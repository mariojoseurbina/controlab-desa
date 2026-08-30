# PLAN ESTRATÉGICO: LIS Humano de Clase Mundial, Cumplimiento Legal y Migración de Referencias

Este documento evalúa los escenarios legales, el grado de complejidad y la estrategia técnica para reutilizar las bases de datos de referencias de Infolab, aprovechando la infraestructura existente de **Controlab VET** y **Controlab IA** para crear un producto internacional de primer nivel.

---

## 1. Viabilidad Legal y Propiedad de los Datos

Es fundamental separar el **software/esquema** (propiedad de Infolab) de los **datos médicos y científicos** (propiedad del laboratorio).

### Qué es Legalmente Viable Importar:
*   **Data Clínica de Pacientes e Historiales:** 100% legal. Pertenece legalmente al paciente y al laboratorio que custodia la data.
*   **Valores de Referencia y Parámetros:** Completamente legal. Los rangos de referencia son datos fácticos de la medicina clínica (acordados por consensos científicos o configurados por los bioanalistas del propio laboratorio). Los datos científicos fácticos no tienen derechos de autor.
*   **Técnica de Migración "Clean-Room" (Sala Limpia):** Para evitar demandas por infracción de software, no debemos descompilar el ejecutable de Infolab ni reutilizar sus triggers o procedimientos almacenados. Solo leemos las tablas crudas usando comandos SQL estándar e independientes creados por nosotros.

---

## 2. El Mejor Escenario: Reutilización de Arquitectura + Mapeo Semántico IA

Dado que ya cuentas con el diseño de **Controlab VET** y **Controlab IA**, construir el nuevo LIS a nivel de clase mundial con el mínimo tiempo de desarrollo es sumamente factible.

```
       +-------------------------------------------------------+
       |           CÓDIGO / ESTRUCTURA EXISTENTE               |
       +-------------------------------------------------------+
            |                                       |
  [ Backend Prisma / SQL ]                [ Frontend / UI Moderna ]
  Reutiliza 90% del diseño de             Utiliza las plantillas y el
  Controlab VET (removiendo               dashboard con capacidades de
  Especies/Razas o fijándolas).           Controlab IA.
            |                                       |
            +-------------------+-------------------+
                                |
                                v
       +-------------------------------------------------------+
       |            NUEVO COMPONENTE DE CLASE MUNDIAL          |
       +-------------------------------------------------------+
                                |
             [ Módulo de Mapeo Semántico con IA ]
             Convierte códigos antiguos a estándares
             internacionales (LOINC / HL7 FHIR).
```

### Grado de Complejidad: BAJO-MEDIO (Tiempo estimado: 2 a 3 semanas)
*   **Base de datos:** Reutilizamos la estructura de `schema.prisma` de `controlab-vet`. Eliminamos las tablas `Especie` y `Raza`, o las simplificamos, adaptando `ValReferenciaExamen` directamente al género (Masculino/Femenino) y edad humana.
*   **Migración Automática (ETL Script):** Se crea un script que lee las tablas de exámenes y referencias de la base de datos vieja de Infolab y las inserta directamente en el esquema de Controlab. El bioanalista **no tiene que configurar nada desde cero**.

---

## 3. ¿Cómo Lograr un Producto de Nivel Mundial para Internacionalización?

Para que el nuevo LIS compita en el mercado internacional (Estados Unidos, Europa, Latinoamérica) y no sea percibido como un sistema local más, debe cumplir con estándares globales de interoperabilidad médica:

### A. Estandarización de Códigos (LOINC y SNOMED-CT)
*   **El Problema:** Cada laboratorio nombra a las pruebas de forma distinta (p. ej., uno usa `GLU`, otro `GLICEMIA`, otro `GLUCOSA`).
*   **La Solución Mundial:** El sistema debe incorporar **LOINC** (Logical Observation Identifiers Names and Codes). Es el diccionario universal de términos de laboratorio.
*   **Valor Agregado de Controlab IA:** Durante la importación de la data vieja de Infolab, el módulo de IA puede analizar semánticamente los nombres de las pruebas viejas del cliente y sugerir/mapear automáticamente su código internacional LOINC correspondiente (ej: mapear *"Glicemia en Ayunas"* al código LOINC `2339-0`).

### B. Interoperabilidad HL7 FHIR
*   Internacionalmente, los hospitales y sistemas de salud modernos exigen conectividad **HL7 FHIR** (Fast Healthcare Interoperability Resources).
*   El nuevo LIS debe poder exportar e importar resultados de pacientes mediante APIs JSON basadas en FHIR, permitiendo integrarse con cualquier historia médica digital (EHR) del mundo (como Epic, Cerner, etc.).

### C. Arquitectura Multi-Tenant (SaaS Cloud)
*   Diseñado para operar en la nube (AWS/Azure) donde múltiples laboratorios puedan registrarse, pagando una suscripción mensual, pero con sus datos completamente aislados de forma lógica y segura.

---

## 4. Plan de Trabajo Acelerado (MVP en 15 Días)

1.  **Días 1-3 (Configuración de Base de Datos):** Clonar el backend de `controlab-vet` a una nueva carpeta `controlab-human`, simplificando el modelo de base de datos a anatomía humana (Género, Edad).
2.  **Días 4-6 (Script de Migración Infolab):** Desarrollar el script de extracción (ETL) que lea los rangos de referencia históricos del cliente y los cargue de forma automática.
3.  **Días 7-10 (Adaptación de Interfaz de Equipos):** Implementar el middleware local básico para capturar tramas de hematología y química (HL7/ASTM) y enviarlas al backend.
4.  **Días 11-15 (Pruebas y Reportes PDF):** Validar la impresión de reportes y la evolución histórica con la data real cargada del cliente anterior.
