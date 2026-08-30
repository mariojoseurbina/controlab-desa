# Plan Maestro de Implementación: Controlab VET

Este documento detalla la hoja de ruta técnica y estratégica para la creación de **Controlab VET**, un Sistema de Información de Laboratorio (LIS) especializado en medicina veterinaria y producción agropecuaria. 

El proyecto utilizará la arquitectura tecnológica y el diseño visual de **Controlab IA**, garantizando una interfaz moderna, rápida y estable, pero con un motor interno completamente rediseñado para el sector veterinario.

---

## 🎯 Objetivo Principal (Fase 1)

Dotar al laboratorio de una herramienta veloz e infalible para el **ingreso, procesamiento y reporte de resultados de exámenes de sangre para animales**. 

El sistema debe permitir la gestión tanto de animales individuales (mascotas) como de **lotes y rebaños** (vacas, ovejas, cabras), generando reportes en PDF con formato altamente profesional.

---

## 🛠 Estrategia Técnica (Clonación y Adaptación)

Para garantizar rapidez y mantener el diseño premium actual, utilizaremos la base de código de Controlab IA bajo un enfoque de clonación y adaptación:

### 1. Creación del Nuevo Ecosistema (Aislamiento Total)
*   **Clonación de Código:** Se copiará todo el código fuente de `controlab-ia` hacia un nuevo directorio llamado `controlab-vet`.
*   **Nueva Base de Datos:** Se creará una base de datos virgen (ej. `controlab_vet_db`) independiente de la humana.

### 2. El Nuevo Motor Veterinario (Schema de Base de Datos)
Se eliminará el concepto tradicional de "Paciente Humano" y se reemplazará por una estructura relacional agropecuaria:
*   **Propietario / Hacienda:** Entidad principal para facturación y reporte.
*   **Especie y Raza:** Catálogos fundamentales (Bovino, Caprino, Ovino, Equino, etc.).
*   **El Animal:** Identificado por Número de Arete, Chapeta o Nombre. Incluye edad, sexo y *propósito productivo* (Carne, Leche, Reproducción).
*   **Motor Dinámico de Valores de Referencia:** El núcleo del software. Los valores normales de una prueba cambiarán algorítmicamente dependiendo de la especie y la raza del animal seleccionado.

### 3. Interfaz Visual (Frontend)
*   Se conservará la interfaz "Dark Mode", la reactividad y la velocidad de Controlab IA.
*   Se adaptarán los menús: "Pacientes" cambiará a "Fincas y Rebaños".
*   Se creará una vista de **Carga Rápida** diseñada para ingresar resultados de 20 a 50 animales seguidos sin cambiar de pantalla.

---

## 📈 Fase 2: Módulo Administrativo y Filosofía Controlab

Una vez que el módulo de reportes LIS esté operando al 100%, se activará la "Filosofía Controlab":
*   **Inventario y Costos:** Reactivación del módulo de inventario actual para que cada examen veterinario descuente los reactivos exactos.
*   **Análisis de Rentabilidad:** Integración de los cálculos de ganancias netas por prueba.
*   **Inteligencia Artificial (Futuro):** Gemini analizará los resultados del rebaño y sugerirá alertas nutricionales o epidemiológicas al propietario de la finca.

---

> [!IMPORTANT]  
> **Aprobación de Inicio de Proyecto**
> 
> Al aprobar este plan, autorizas a la Inteligencia Artificial a:
> 1. Crear la nueva carpeta `c:\controlab-vet` copiando el código actual.
> 2. Reestructurar el archivo `schema.prisma` para incorporar las tablas de Propietarios, Especies, Razas y Animales.
> 3. Configurar el entorno para arrancar el nuevo servidor de desarrollo.

**Por favor, presiona "Aprobar" si el plan es correcto para que pueda iniciar la clonación del código fuente.**
