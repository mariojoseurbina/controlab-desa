# Tareas: Controlab VET (Fase 1)

- `[/]` **1. Aislamiento y Configuración Base**
  - `[x]` Clonar repositorio `c:\controlab-ia` a `c:\controlab-vet` (excluyendo node_modules para rapidez).
  - `[/]` Ejecutar `npm install` en frontend y backend del nuevo proyecto.
  - `[ ]` Crear nueva base de datos local `controlab_vet_db`.
  - `[ ]` Actualizar archivo `.env` en el backend para apuntar a la nueva base de datos.

- `[ ]` **2. Diseño del Nuevo Motor Veterinario (Prisma)**
  - `[ ]` Eliminar modelos humanos (`Paciente`).
  - `[ ]` Crear modelo `Propietario` (Cliente / Finca).
  - `[ ]` Crear catálogos `Especie` y `Raza`.
  - `[ ]` Crear modelo `Animal` con relaciones, sexo, y propósito.
  - `[ ]` Adaptar `PruebaMaestra` y `RangoReferencia` para aceptar Especie y Raza.
  - `[ ]` Ejecutar migración Prisma (`npx prisma migrate dev`).

- `[ ]` **3. Adaptación del Frontend (UI/UX)**
  - `[ ]` Rebranding: Cambiar logos y textos de "Controlab IA" a "Controlab VET".
  - `[ ]` Modificar la barra lateral (Sidebar) para apuntar a los nuevos módulos de Fincas y Animales.
  - `[ ]` Crear pantalla de gestión de Propietarios y Animales.

- `[ ]` **4. Módulo LIS (Core: Ingreso y Reporte)**
  - `[ ]` Crear pantalla de "Procesamiento LIS Veterinario".
  - `[ ]` Implementar generador de PDF adaptado para Medicina Veterinaria (con logo de finca).
