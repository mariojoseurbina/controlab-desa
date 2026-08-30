# Implementación de CONTROLAB - H (LIS Humano)

Este plan abarca las fases operacionales avanzadas, adaptándose a la necesidad prioritaria de registrar órdenes clínicas de forma ágil mediante buscadores inteligentes.

## Fases Completadas (1 al 7)
* Base de datos, backend, Frontend Light Mode, migración de pacientes y exámenes de Infolab (2,216 pruebas disponibles), y flujo de reporte de resultados.

---

## Proposed Changes: Registro de Órdenes, PDF y Auditoría (Fases 8 a 11)

### [Fase 8: Módulo de Registro de Órdenes (NUEVO PRIORITARIO)]
Para poder reportar resultados, primero debemos crear la orden médica asociando al paciente con las pruebas exactas que se le van a realizar.

#### [NEW] `c:\controlab-h\frontend\src\components\NuevaOrdenModal.jsx`
- **Buscador Inteligente:** Implementar un campo de texto tipo *Autocomplete* (Select con búsqueda en tiempo real) que consulte el catálogo de los 2,216 exámenes. Al escribir "Hemograma", filtrará instantáneamente.
- **Motivo de Examen:** Campo de texto (Textarea) para ingresar las indicaciones u observaciones (el "por qué" se hacen las pruebas).
- **Asociación de Paciente:** Un selector para asignar la orden al paciente que acaba de ingresar.
- Al guardar, la orden aparecerá en estado `PENDIENTE` en el Dashboard de Órdenes, lista para el botón "REPORTAR".

#### [MODIFY] `c:\controlab-h\backend\src\controllers\ordenController.js`
- **Endpoint POST:** Ajustar la creación de la orden para que guarde el paciente, las observaciones (motivo), y registre en la base de datos la lista de `ParametroClinico` (exámenes) solicitados.

---

### [Fase 9: Motor de Reportes PDF]
Utilizaremos `pdfkit` para generar reportes clínicos formales.

### [Fase 10: Interfaz Analizadores (RS232 / TCP-IP)]
Construiremos el daemon para escuchar las tramas de los equipos. Los resultados caerán como `POR_VALIDAR` en el LIS.

### [Fase 11: Trazabilidad y Auditoría Estricta]
Seguridad tipo bitácora (Roles, IPs, Trazabilidad) discutida anteriormente.

## Open Questions

> [!TIP]
> ¿Estás de acuerdo con el diseño de la **Fase 8** para utilizar un componente modal (similar al de pacientes) para armar el carrito de pruebas de la orden, o prefieres que sea una página completa a pantalla entera dado que pueden ser muchas pruebas?

## Verification Plan
1. **Creación de Orden:** Abrir "Nueva Orden", buscar y seleccionar 3 pruebas distintas, asignar un paciente y guardar. Verificar que aparezca en el Dashboard.
