# Tareas - Fase 8: Registro de Órdenes

## Frontend (Nueva Orden UI)
- `[x]` Crear `NuevaOrden.jsx` (Página Completa).
- `[x]` Implementar Autocomplete para Pacientes.
- `[x]` Implementar Autocomplete (Buscador Inteligente) para Exámenes.
- `[x]` Integrar campo de "Motivo/Observaciones".
- `[x]` Añadir ruta `/ordenes/nueva` en `App.jsx`.
- `[x]` Vincular botón "NUEVA ORDEN" en `OrdenesDashboard.jsx`.

## Backend (API)
- `[x]` Revisar/Modificar `schema.prisma` para `OrdenExamen` y `Resultado`.
- `[x]` Crear endpoint `GET /api/parametros` para el buscador inteligente.
- `[x]` Modificar endpoint `POST /api/ordenes` para insertar `OrdenExamen` y precargar `Resultado` en estado 'PENDIENTE'.
