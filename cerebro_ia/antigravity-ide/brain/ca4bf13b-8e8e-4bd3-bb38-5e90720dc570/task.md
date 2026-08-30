# Checklist de Tareas: Desglose de Gastos Administrativos (Controlab IA)

## Base de Datos & Prisma
- `[x]` Agregar `desglose_admin` al modelo `GastoMensualGlobal` en `prisma/schema.prisma`.
- `[x]` Ejecutar `npx prisma db push` para aplicar la actualización del esquema en SQL Server.

## Backend
- `[x]` Modificar `saveGastosGlobales` en `costos.service.js` para aceptar y guardar el campo `desglose_admin`.

## Frontend
- `[x]` Crear el estado `desgloseAdmin` para los 20 campos de egresos detallados en `Costos.jsx`.
- `[x]` Añadir el botón/pill de la pestaña "Desglose Gastos Administrativos" (index 2 de `subTabCostos`) en `Costos.jsx`.
- `[x]` Implementar el cálculo reactivo automático que sume los campos y actualice `globalAdmin` en `Costos.jsx`.
- `[x]` Implementar el efecto de auto-carga de desglose al cambiar de mes/año o al obtener nuevos datos del backend en `Costos.jsx`.
- `[x]` Diseñar y maquetar el formulario con los 20 campos de entrada (agrupados en cards) para `subTabCostos === 2` en `Costos.jsx`.
- `[x]` Actualizar `handleSaveGastosGlobales` en `Costos.jsx` para pasar el JSON string en la carga de datos.

## Verificación & Entrega
- `[x]` Realizar pruebas manuales ingresando valores y verificando sumas en tiempo real.
- `[x]` Comprobar que los gastos desglosados se persisten y cargan correctamente de la base de datos al cambiar de periodo.
- `[x]` Crear el entregable final `walkthrough.md` resumiendo las mejoras aplicadas.
