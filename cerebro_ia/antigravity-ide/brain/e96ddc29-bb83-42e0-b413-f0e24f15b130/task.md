# Tareas de Implementación: Controlab Brain Agent & Costos

- [ ] **Fase 0: Respaldo y Migración de Base de Datos**
  - [ ] Esperar confirmación de backup por parte del usuario.
  - [ ] Ejecutar script de base de datos para agregar campos de costos/impuestos a `items_inventario` y `compras_inventario`.
  - [ ] Crear tablas maestras de `pruebas_maestra` y `vinculo_prueba_item`.
  - [ ] Sincronizar esquema Prisma si corresponde.

- [ ] **Fase 1: Backend & Lógica Financiera**
  - [ ] Configurar la clave `GEMINI_API_KEY` en `.env`.
  - [ ] Desarrollar `agentService.js` con las herramientas financieras (stock, costos, prorrateos y mermas).
  - [ ] Crear el endpoint Express `/api/agent/chat` en `routes/agent.js`.
  - [ ] Registrar las nuevas rutas en `server-minimo.js`.

- [ ] **Fase 2: Frontend & Visualización de Costos**
  - [ ] Crear la página del panel de Estructura de Costos en React.
  - [ ] Desarrollar la calculadora interactiva para simular costos con calibradores, controles y mermas.
  - [ ] Integrar el asistente conversacional flotante (Controlab Brain Agent chat) en la interfaz.

- [ ] **Fase 3: Verificación & Pruebas**
  - [ ] Crear script de prueba `test-agent.js` para validar respuestas financieras.
  - [ ] Realizar pruebas de flujo completo junto con la bioanalista.
