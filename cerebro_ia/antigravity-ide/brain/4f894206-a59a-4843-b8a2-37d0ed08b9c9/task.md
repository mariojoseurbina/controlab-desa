# Checklist de Ejecución: Refactorización y Estructura de Costos

- [x] 1. Migración y Esquema de Base de Datos (SQL Server & Prisma)
  - [x] Agregar modelos `GastoMensualGlobal`, `CostoEquipoSolucion`, `CostoPruebaConfig` y `ConsumiblePrueba` a `schema.prisma`
  - [x] Ejecutar comandos de Prisma para actualizar y aplicar cambios en SQL Server
- [x] 2. Consolidación de Servidor (Refactorización)
  - [x] Limpiar y reestructurar `server-minimo.js` para remover colisiones de puerto y modularizar endpoints residuales
  - [x] Actualizar archivos de lote (`.bat`) para apuntar exclusivamente a `server.js`
- [x] 3. Implementación de Lógica del Backend (Servicios, Controladores y Rutas)
  - [x] Desarrollar motor matemático de cálculo de costos unitarios de pruebas en `costos.service.js`
  - [x] Desarrollar controladores de costos en `costos.controller.js`
  - [x] Registrar rutas del módulo costos en `costos.routes.js` y `server.js`
- [x] 4. Diseño de Interfaz de Usuario (Frontend React)
  - [x] Crear el panel de control de gastos mensuales globales y soluciones por equipos en `Costos.jsx`
  - [x] Crear el selector interactivo de insumos comerciales y consumibles asociados a pruebas
  - [x] Diseñar el desglose premium del margen de ganancia con colores dinámicos (semafóricos)
- [x] 5. Validación y Pruebas de Funcionamiento
  - [x] Ejecutar scripts de pruebas en background para validar fórmulas
  - [x] Realizar pruebas manuales de navegación e integración
