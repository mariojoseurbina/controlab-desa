# Walkthrough de Implementación: Estructura de Costos LIMS & Consolidación de Servidores

Hemos completado exitosamente la refactorización e implementación del módulo de **Estructura de Costos** y consolidado los servicios del servidor unificado. Este documento recopila los cambios de arquitectura y base de datos, las fórmulas matemáticas aplicadas y las pruebas de validación que garantizan la precisión del motor de costos.

---

## 🛠️ Cambios Realizados y Arquitectura

### 1. Base de Datos (SQL Server & Prisma)
Modificamos [schema.prisma](file:///c:/controlab-ia/backend/prisma/schema.prisma) para añadir y relacionar cuatro nuevos modelos que representan las configuraciones operativas de costos, y sincronizamos con base de datos mediante `npx prisma db push`.

*   **`GastoMensualGlobal` (`gastos_mensual_global`)**: Guarda egresos fijos mensuales de administración (alquiler, papelería, luz) y nóminas de personal, indexado de forma única por combinación `[mes, anio]`.
*   **`CostoEquipoSolucion` (`costo_equipo_solucion`)**: Configura gastos de consumibles por equipo analítico (soluciones de lavado, calibradores y controles) y su volumen estimado de pruebas mensuales para prorrateo.
*   **`CostoPruebaConfig` (`costo_prueba_config`)**: Vincula una prueba genérica (`pruebas_maestra`) con su precio de venta, desperdicio estimado de reactivo, cantidad esperada de determinaciones por kit de reactivo principal (`reactivo_id`), y equipo analítico asociado (`equipo_id`).
*   **`ConsumiblePrueba` (`consumible_prueba`)**: Almacena consumibles detallados por fase operativa (TOMA_MUESTRA y PROCESAMIENTO) con cantidades fraccionarias.

---

### 2. Consolidación de Servidor y Resolución de Conflictos
*   Actualizamos los archivos de inicio por lotes [iniciar controlab.bat](file:///c:/controlab-ia/iniciar%20controlab.bat) e [iniciar-produccion.bat](file:///c:/controlab-ia/iniciar-produccion.bat) para arrancar exclusivamente el servidor modular unificado `server.js` (puerto `5000`).
*   Modificamos el fallback del servidor legacy `server-minimo.js` al puerto `5001` para asegurar que nunca cause excepciones de colisión de puerto en ejecución.

---

### 3. Motor del Backend (Lógica de Negocio y Rutas)
Implementamos el motor de costeo avanzado en tres componentes del backend:
*   [costos.service.js](file:///c:/controlab-ia/backend/src/modules/costos/costos.service.js): Motor de lógica matemática. Calcula de forma precisa los costos unitarios variables (reactivo principal con desperdicio e insumos asociados por fase) y fijos (prorrateo de equipos y gastos operativos mensuales de personal/administración).
*   [costos.controller.js](file:///c:/controlab-ia/backend/src/modules/costos/costos.controller.js): Define los controladores API de creación, lectura, actualización y eliminación (CRUD) para configuraciones de prueba, gastos globales y costos de equipo.
*   [costos.routes.js](file:///c:/controlab-ia/backend/src/modules/costos/costos.routes.js): Registra las rutas REST unificadas expuestas bajo `/api/costos/*`.

---

### 4. Corrección de Error 404 en Inicio de Sesión (Desarrollo)
*   **Problema**: En el modo de desarrollo (`npm start` en el puerto `3000`), el frontend hacía peticiones relativas a `/api/auth/login` (apuntando a `http://localhost:3000/api/auth/login`), lo que generaba un error `404` ya que el servidor de desarrollo de React no tenía proxy configurado hacia el backend.
*   **Solución**:
    1. Añadimos `"proxy": "http://localhost:5000"` al archivo [package.json](file:///c:/controlab-ia/frontend/package.json) del frontend para redirigir automáticamente todas las solicitudes de API `/api/*` al servidor unificado en el puerto `5000`.
    2. Agregamos `DANGEROUSLY_DISABLE_HOST_CHECK=true` al archivo de entorno del frontend [frontend/.env](file:///c:/controlab-ia/frontend/.env) para evitar problemas de firewall/validación de hosts de Webpack Dev Server generados por el proxy.
    3. Verificamos que las llamadas de autenticación (`POST /api/auth/login`) a través del proxy del puerto `3000` se conecten de manera exitosa con el backend y la base de datos SQL Server.

---

## 🧮 Fórmulas del Motor de Costos Unitarios

El cálculo final del costo total e indicador de rentabilidad para una prueba clínica (ej. Glicemia) sigue la siguiente estructura:

$$CostoTotalUnitario = CostoReactivoUnitario + CostoTomaMuestra + CostoProcInsumos + CostoEquipoProrrateado + CostoAdminProrrateado + CostoPersonalProrrateado$$

Donde:
1.  **Costo de Reactivo Unitario**:
    $$CostoReactivo = \left(\frac{\text{Precio del Kit}}{\text{Pruebas por Kit}}\right) \times \left(1 + \frac{\text{\% Desperdicio}}{100}\right)$$
2.  **Costo de Toma de Muestra (Pre-analítica)**: Sumatoria de todos los consumibles en fase `"TOMA_MUESTRA"` multiplicados por su costo en inventario.
3.  **Costo de Insumos de Procesamiento**: Sumatoria de todos los consumibles en fase `"PROCESAMIENTO"` (puntas, guantes) multiplicados por su costo en inventario.
4.  **Costo de Equipo Prorrateado**:
    $$CostoEquipoU = \frac{\text{Gasto Soluciones} + \text{Gasto Calibradores} + \text{Gasto Controles}}{\text{Total Pruebas del Equipo al Mes}}$$
5.  **Costo Administrativo Prorrateado**:
    $$CostoAdminU = \frac{\text{Gastos Administrativos Mensuales}}{\text{Total Pruebas del Laboratorio al Mes}}$$
6.  **Costo de Personal Prorrateado**:
    $$CostoPersonalU = \frac{\text{Gastos de Personal Mensuales}}{\text{Total Pruebas del Laboratorio al Mes}}$$

### Rentabilidad e Indicador Semafórico (Margen sobre Venta)
Establecimos la fórmula de margen de ganancia estándar de negocios:
$$MargenGanancia \% = \left(\frac{\text{Precio de Venta} - \text{Costo Total Unitario}}{\text{Precio de Venta}}\right) \times 100$$

El margen de ganancia se categoriza visualmente para alertar al administrador:
*   🟢 **VERDE (Saludable)**: Margen de rentabilidad $> 50\%$.
*   🟡 **AMARILLO (Moderado)**: Margen de rentabilidad entre $20\%$ y $50\%$.
*   🔴 **ROJO (Crítico)**: Margen de rentabilidad $< 20\%$.

---

## 🧪 Validación y Pruebas Unitarias

Creamos un script de validación matemática en [backend/test_cost_formulas.js](file:///c:/controlab-ia/backend/test_cost_formulas.js). Al ejecutarlo, se simularon los siguientes parámetros para una **Glicemia (Test)**:

*   **Reactivo Principal**: Kit de $100.00, rinde 500 pruebas con un 5% de desperdicio. (Costo Unitario = $0.21)
*   **Consumibles de Extracción**: 1 tubo tapa amarilla ($0.15) + 1 aguja ($0.25) + 1 algodón ($0.05) = $0.45.
*   **Consumibles de Procesamiento**: 1 punta de pipeta ($0.10).
*   **Prorrateo de Equipo**: Gasto acumulado de $300.00 en soluciones/calibradores/controles para 1000 pruebas = $0.30.
*   **Gastos Operativos Globales**: Gastos fijos de $2000.00 administración + $4000.00 nómina divididos entre 5000 pruebas del mes = $0.40 (admin) + $0.80 (personal).
*   **Precio de Venta**: $5.00.

### Resultados del Log de Pruebas:
```json
{
  "configurado": true,
  "prueba_id": 5,
  "nombre_prueba": "Glicemia (Test)",
  "precio_venta": 5,
  "costo_total_unitario": 2.26,
  "margen_ganancia_pct": 54.8,
  "indicador_semaforo": "VERDE",
  "desglose": {
    "reactivo": {
      "item_id": 15058,
      "nombre": "Reactivo Glucosa Test",
      "codigo": "TEST-REACT-GLUCOSA",
      "precio_costo": 100,
      "pruebas_por_kit": 500,
      "desperdicio_pct": 5,
      "costo_unitario": 0.21
    },
    "toma_muestra": {
      "consumibles": [
        { "item_id": 15059, "nombre": "Tubo Tapa Amarilla Test", "cantidad": 1, "precio_costo": 0.15, "subtotal": 0.15 },
        { "item_id": 15060, "nombre": "Aguja de Extracción Test", "cantidad": 1, "precio_costo": 0.25, "subtotal": 0.25 },
        { "item_id": 15061, "nombre": "Algodón en Esferas Test", "cantidad": 1, "precio_costo": 0.05, "subtotal": 0.05 }
      ],
      "total": 0.45
    },
    "procesamiento_insumos": {
      "consumibles": [
        { "item_id": 15062, "nombre": "Punta Amarilla de Pipeta Test", "cantidad": 1, "precio_costo": 0.1, "subtotal": 0.1 }
      ],
      "total": 0.1
    },
    "equipo": {
      "id": 1,
      "nombre_equipo": "Equipo Química Automático Test",
      "gasto_soluciones": 100,
      "gasto_calibradores": 100,
      "gasto_controles": 100,
      "total_pruebas_equipo": 1000,
      "costo_unitario": 0.3
    },
    "gastos_globales": {
      "id": 1,
      "mes": 6,
      "anio": 2026,
      "gastos_administrativos": 2000,
      "gastos_personal": 4000,
      "total_pruebas_mes": 5000,
      "costo_admin_unitario": 0.4,
      "costo_personal_unitario": 0.8
    }
  }
}
```
*   **Costo Unitario Total**: Se validó exactamente en **$2.26** (Costo Reactivo: $0.21 + Insumos Extracción: $0.45 + Insumo Procesamiento: $0.10 + Equipo: $0.30 + Admin: $0.40 + Personal: $0.80).
*   **Margen Calculado**: **$54.80\%$** de ganancia neta.
*   **Semáforo de Alerta**: **VERDE** (Margen $>50\%$).
*   **Resultado del Test**: **¡Todas las pruebas matemáticas pasaron con éxito!**

---

## 🎨 Interfaz de Usuario del Frontend (React & Material UI)

Rediseñamos el componente [Costos.jsx](file:///c:/controlab-ia/frontend/src/pages/Costos/Costos.jsx) para agregar una pestaña avanzada de **Calculadora y Rentabilidad de Pruebas**, dividida en sub-pestañas:

### A. Sub-pestaña 1: Gastos Fijos Mensuales
*   **Formulario de Gastos Globales**: Administra alquileres, nóminas, etc., e historial en tablas.
*   **Formulario de Costo de Equipos**: Administra calibradores, controles y soluciones mensuales consumidos por equipo.

### B. Sub-pestaña 2: Calculadora por Prueba & Simulación
*   **Panel de Configuración (Izquierda)**:
    *   Formularios para configurar precio de venta al paciente, margen de desperdicio y rendimiento del reactivo principal.
    *   Dropdown para asociar el equipo analítico correspondiente.
    *   Selectores dinámicos de insumos pre-analíticos (tomas de muestras) y analíticos, permitiendo añadir y remover filas con cantidades numéricas personalizadas.
*   **Ficha de Resultados & Dashboard (Derecha)**:
    *   Tarjeta premium de ganancia con colores semafóricos inteligentes basados en el porcentaje de rentabilidad (Verde, Amarillo o Rojo).
    *   Detalle con desglose neto de precio, costo y utilidad.
    *   Barra de participación proporcional de gastos en forma de porcentaje para analizar los principales focos de costos de la prueba.
    *   Lista de auditoría detallada paso por paso con las ecuaciones aplicadas.

### C. Rediseño Estético del Módulo de Reportes Inteligentes (IA)
Rediseñamos por completo el componente [Reports.js](file:///c:/controlab-ia/frontend/src/pages/Reports/Reports.js) bajo una estética premium y moderna (glassmorphic y gradientes):
*   **Dual Panel Dashboard**: Estructuramos la pantalla en dos columnas balanceadas: el panel del Asistente IA a la izquierda (65% del ancho) y el Historial de consultas junto a las tendencias de sesión a la derecha (35% del ancho).
*   **Encabezados y Botones Premium**: Introdujimos gradientes lineales de Indigo a Púrpura en cabeceras, botones principales de consulta, y un gradiente especializado de color verde de Microsoft Excel para el botón de exportación permanente de precios.
*   **Panel de Consulta Integrado**: La caja de texto fue re-estilizada con bordes suaves de color pizarra (`#cbd5e1`) que se iluminan en índigo al enfocarse, y los chips de sugerencias rápidas ahora muestran mini-iconos decorativos con efectos de elevación táctil en hover.
*   **Tarjetas de Respuestas Heurísticas**: La burbuja de respuesta del Asistente IA ahora cuenta con bordes izquierdos de acento, fondos suaves con iluminación focal (`#fcfdff`) y tipografías personalizadas que facilitan la lectura.
*   **Tablas de Datos Modernizadas**: Rediseñamos los contenedores de datos tabulados agregando cabeceras de color pizarra, filas alternadas con sutiles sombras grises en hover, y semáforos integrados de alerta de color verde, amarillo o rojo en la columna de stock crítico e indicadores numéricos de días de apertura para lotes de reactivos.

### D. Optimización de Rendimiento en Transcripción de Inventario (Eliminación de Lag)
Corregimos un problema de rendimiento crítico que causaba lag/retraso de digitación al rellenar los campos de texto del modal de creación o edición de items en [Inventory.js](file:///c:/controlab-ia/frontend/src/features/inventory/pages/Inventory.js):
*   **Aislamiento de Estado**: Extrajimos el diálogo de formulario a un subcomponente autónomo `ItemFormDialog`.
*   **Eliminación de Re-renders Innecesarios**: Al encapsular `formData` dentro del diálogo, las pulsaciones de teclas en los campos del formulario (`onChange`) actualizan el estado local de este subcomponente y no provocan la re-evaluación ni el re-renderizado de la tabla maestra de inventario (que contiene cientos de filas de items, chips, iconos y botones) que queda en segundo plano.
*   **Resultado**: La digitación y transcripción de nuevos productos al inventario ahora es instantánea y fluida para los operarios del laboratorio.
*   **Restauración del Endpoint de Eliminación**: Al realizar la migración del inventario al esquema modular (Screaming Architecture), el endpoint `DELETE /api/inventory/:id` no había sido registrado en la nueva estructura. Añadimos la ruta correspondiente en [inventory.routes.js](file:///c:/controlab-ia/backend/src/modules/inventory/inventory.routes.js), y conectamos el flujo en el controlador, servicio y repositorio usando Prisma (`activo: false`), restaurando por completo la funcionalidad de borrado lógico.
*   **Validación de Código Único y Errores Amigables**: Implementamos comprobaciones de unicidad de código (`codigo`) en `inventory.service.js` antes de persistir los datos de creación o edición. Si un código ya existe, se lanza una excepción limpia que el controlador devuelve con un mensaje amigable (`El código ya está registrado en el inventario.`), evitando así excepciones internas crudas de Prisma en la interfaz.

