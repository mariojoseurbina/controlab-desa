# Refactorización Arquitectónica: Controlab-IA

Este documento detalla el plan de implementación para refactorizar la arquitectura del proyecto `controlab-ia`. El objetivo principal es desmantelar el monolito actual (`server-minimo.js`) y adoptar una **Screaming Architecture** (Arquitectura que "grita" su propósito), orientada a Dominios/Características (Feature-Driven o Domain-Driven).

## User Review Required

> [!IMPORTANT]
> **Cambio de Paradigma Estructural:** Este plan propone un cambio significativo en cómo se organiza el código del backend y frontend. Dejaríamos de agrupar por "tipos de archivos" (todos los controladores juntos, todos los servicios juntos) para agrupar por **Contexto de Negocio** (todo lo relacionado al Inventario en una misma carpeta). ¿Estás de acuerdo con este enfoque?

## Open Questions

> [!WARNING]
> 1. **Base de Datos:** Actualmente el acceso a datos usa consultas SQL crudas dispersas en el código. ¿Deseas que introduzcamos un ORM ligero (como Prisma o Sequelize) o un Query Builder (como Knex.js) durante esta refactorización, o preferimos mantener las consultas directas con `mssql` pero centralizadas en repositorios?
> 2. **C# Service:** El servicio de C# (`InventarioAutoProcessor`) funciona bien en su dominio, pero ¿te interesaría migrar su lógica al backend en Node.js en el futuro (usando colas o cron jobs) para tener un solo stack tecnológico, o lo mantenemos como un microservicio independiente en .NET?
> 3. **IA Real vs Heurística:** Al refactorizar el módulo de IA, ¿es el momento de preparar el terreno e integrar una API de LLM real (como OpenAI) o mantenemos el motor de reglas actual (heurística) pero encapsulado correctamente?

## Proposed Changes

La Screaming Architecture busca que, al mirar la estructura de carpetas, entiendas inmediatamente **de qué trata el negocio** (Inventario, Movimientos, Reportes) en lugar del framework subyacente.

---

### Backend (Node.js)

Se eliminará el acoplamiento masivo de `scripts/server-minimo.js` y el patrón técnico clásico (`controllers/`, `services/`, `routes/`) en favor de una estructura por **Módulos de Dominio (Features)**.

#### Estructura Propuesta

```text
backend/
├── src/
│   ├── app.js                 (Configuración de Express y middlewares globales)
│   ├── server.js              (Punto de entrada, levanta el servidor)
│   ├── config/                (Configuraciones de BD, variables de entorno)
│   ├── core/                  (Utilidades globales: logger, error handling)
│   └── modules/               (Aquí "Grita" la arquitectura)
│       ├── inventory/         (Dominio de Inventario)
│       │   ├── inventory.controller.js
│       │   ├── inventory.routes.js
│       │   ├── inventory.service.js      (Lógica de negocio pura)
│       │   └── inventory.repository.js   (Acceso a SQL Server aislado)
│       ├── movements/         (Dominio de Movimientos)
│       │   ├── movements.controller.js
│       │   ├── movements.routes.js
│       │   ├── movements.service.js
│       │   └── movements.repository.js
│       ├── ai-assistant/      (Dominio del Motor de Reglas "IA")
│       │   ├── ai.controller.js
│       │   ├── ai.routes.js
│       │   ├── ai.service.js             (Aquí va la lógica de análisis NLP)
│       │   └── ai.rules.js               (Patrones Regex y heurística)
│       ├── reports/           (Dominio de Reportes y Exportación)
│       │   ├── reports.controller.js
│       │   ├── reports.routes.js
│       │   └── reports.service.js        (Generación de Excel)
│       └── auth/              (Autenticación y Usuarios)
```

#### [DELETE] `c:/controlab-ia/scripts/server-minimo.js`
#### [DELETE] `c:/controlab-ia/backend/controllers/*`
#### [DELETE] `c:/controlab-ia/backend/routes/*`
#### [NEW] `c:/controlab-ia/backend/src/modules/inventory/*`
#### [NEW] `c:/controlab-ia/backend/src/modules/movements/*`
#### [NEW] `c:/controlab-ia/backend/src/modules/ai-assistant/*`
#### [NEW] `c:/controlab-ia/backend/src/modules/reports/*`

---

### Frontend (React)

Actualmente el frontend tiene una separación técnica (`src/components`, `src/pages`, `src/services`). Aplicaremos una arquitectura similar basada en **Feature Slices** (Rebanadas de Características).

#### Estructura Propuesta

```text
frontend/src/
├── app/                  (Proveedores globales, Router principal, Store)
├── common/               (Componentes genéricos: Botones, Modales, Layout)
└── features/             (Módulos de negocio)
    ├── inventory/
    │   ├── api/          (Llamadas a axios para inventario)
    │   ├── components/   (Componentes exclusivos de inventario: Formularios, Tablas)
    │   └── pages/        (Vistas principales: InventoryList, InventoryDetail)
    ├── movements/
    │   ├── api/
    │   ├── components/
    │   └── pages/
    ├── ai-assistant/
    │   ├── api/
    │   ├── components/   (Chat UI)
    │   └── pages/
    └── reports/
        ├── api/
        ├── components/
        └── pages/
```

#### [MODIFY] `c:/controlab-ia/frontend/src/App.js` (Actualizar rutas)
#### [NEW] `c:/controlab-ia/frontend/src/features/*`

---

### Procesador en Background (C#)

El microservicio en C# se mantiene con su responsabilidad actual (procesar archivos locales), pero proponemos limpiarlo aplicando los principios **SOLID**:

#### [MODIFY] `c:/controlab-ia/InventarioAutoProcessor/FileProcessor.cs`
- **Single Responsibility:** Separar el parseo de Excel (`ExcelParser.cs`) y el parseo de PDF (`PdfParser.cs`) en clases distintas.
- **Dependency Inversion:** Usar interfaces para interactuar con la base de datos (`IInventoryRepository`), lo cual facilitará hacer pruebas unitarias o cambiar de BD en el futuro.

## Verification Plan

### Automated Tests
- Al aislar la lógica de negocio en `*.service.js` (separándola de Express), podremos crear pruebas unitarias rápidas usando `Jest` para verificar:
  - Cálculos de stock y alertas.
  - El motor de reglas heurísticas (`ai.service.js`) para asegurar que responde correctamente a diferentes inputs de texto sin romper la app entera.

### Manual Verification
- Levantar el nuevo servidor (`npm run dev`) y validar que los endpoints de la API (desde Postman o Swagger) retornan exactamente los mismos datos que la versión monolítica.
- Navegar por el frontend en modo desarrollo (`npm start`) asegurando que los listados, la inserción de movimientos y el chat de IA funcionan sin regresiones.
