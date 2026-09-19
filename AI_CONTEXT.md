# Contexto para el Asistente (Handover Document)
**Fecha:** 19 de Septiembre, 2026
**Proyecto:** Controlab-IA (Backend, Frontend, Sniffer)
**Estado Actual:**
- **Auditoría superada:** El sistema cuenta con PM2 global, manejo de errores en el backend/sniffer para evitar caídas catastróficas, y un interceptor de Axios en el frontend tolerante a fallos de red.
- **Estructura de Costos:** Se completó exitosamente la inyección automatizada de ~238 productos hacia el archivo Excel.
- **Centro de Reactivos:** El monitor de cajas en vivo excluye exitosamente equipos como 'Mindray CL-900i' mediante reglas de negocio en la base de datos (Prisma).

**PRÓXIMO OBJETIVO PRINCIPAL (El módulo al 35%):**
El usuario requiere enfocarse en el **Módulo de Recepción e Inventario Maestro**.
Específicamente, el foco principal es construir y perfeccionar la **Recepción Electrónica de la Caja** por parte de cualquier área del laboratorio. Esto implica la lógica de:
1. Escaneo/Ingreso de la caja en el área destino.
2. Trazabilidad de cómo esa caja interactúa con el inventario general y el LIS (Sniffer).

**Instrucción para la IA que lea esto:**
Asume tu rol como Arquitecto de Software Fullstack, QA, SecOps y UX/UI. Revisa la base de datos (schema.prisma) y el frontend actual y comienza a asistir al usuario con la lógica de Recepción Electrónica de Cajas.
