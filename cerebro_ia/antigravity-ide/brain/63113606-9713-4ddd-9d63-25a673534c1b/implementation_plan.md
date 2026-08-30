# Activación del Módulo de Compras (Gestión Comercial)

Este plan detalla los cambios necesarios para activar y poner en producción el módulo de **Compras** (comercial) en Controlab-IA. El objetivo principal es conectar las vistas del frontend con una API real en el backend, permitiendo guardar las compras en la base de datos (tabla `compras_inventario`), listar compras reales, y actualizar automáticamente el stock y registrar movimientos en el inventario cuando una compra se marque como "Recibido".

## User Review Required

> [!IMPORTANT]
> **Impacto en el Inventario (Operaciones):**
> Al registrar o cambiar el estado de una compra a **Recibido (recibido)**:
> 1. Se incrementará automáticamente el `stock_actual` en la tabla `items_inventario` según la cantidad comprada.
> 2. Se creará un registro de movimiento tipo `ENTRADA` en `movimientos_inventario` con el número de factura como referencia.
> 3. Se actualizará el precio de costo (`precio_costo`) del ítem en el inventario al precio unitario pactado en la compra.
>
> ¿Estás de acuerdo con esta automatización del flujo comercial hacia el inventario?

## Open Questions

> [!NOTE]
> **Catálogo de Proveedores:**
> Dado que la base de datos no cuenta con una tabla de `proveedores` dedicada (el campo en `items_inventario` es texto y en `compras_inventario` es `proveedor_id`), utilizaremos un mapeo estático estructurado para los 4 proveedores comerciales predefinidos (Lab Supplies C.A., Meditek Venezuela, BioAnalítica S.A., Química Avanzada). ¿Es suficiente por ahora o preferirías que los cargáramos dinámicamente desde los proveedores existentes en la tabla `items_inventario`?

## Proposed Changes

### Backend (Node.js)

Crearemos un nuevo módulo en la estructura Screaming Architecture `backend/src/modules/purchases/` para manejar toda la lógica comercial de compras.

---

#### [NEW] [purchases.repository.js](file:///c:/controlab-ia/backend/src/modules/purchases/purchases.repository.js)
Clase encargada de interactuar directamente con Prisma Client para la tabla `compras_inventario`.
- `findAll()`: Recupera todas las compras.
- `findById(id)`: Busca una compra específica.
- `create(data)`: Inserta un registro de compra.
- `update(id, data)`: Modifica un registro de compra.
- `delete(id)`: Elimina un registro de compra.

#### [NEW] [purchases.service.js](file:///c:/controlab-ia/backend/src/modules/purchases/purchases.service.js)
Clase con la lógica de negocio y automatizaciones:
- Al crear o actualizar una compra con estado `'recibido'`:
  - Obtiene el ítem de inventario.
  - Incrementa su `stock_actual`.
  - Actualiza su `precio_costo`.
  - Registra el movimiento de `ENTRADA` en `movimientos_inventario`.
- Si una compra recibida se edita o cancela, se ajusta el stock de forma correspondiente.
- Enriquece la respuesta de compras adjuntando el nombre del producto, el código y el nombre del proveedor usando el diccionario estático.

#### [NEW] [purchases.controller.js](file:///c:/controlab-ia/backend/src/modules/purchases/purchases.controller.js)
Controlador Express para deserializar peticiones y serializar respuestas HTTP para `/api/compras`.

#### [NEW] [purchases.routes.js](file:///c:/controlab-ia/backend/src/modules/purchases/purchases.routes.js)
Mapeo de endpoints de compras protegidos y desprotegidos.

#### [MODIFY] [server.js](file:///c:/controlab-ia/backend/server.js)
- Importar y registrar las nuevas rutas `/api/compras`.

---

### Frontend (React)

Reemplazaremos las llamadas simuladas (mocked timeouts) en el frontend por peticiones reales usando Axios y redirecciones del React Router.

---

#### [MODIFY] [ListaCompras.jsx](file:///c:/controlab-ia/frontend/src/pages/Compras/ListaCompras.jsx)
- Consumir el endpoint `GET /api/compras` usando Axios.
- Remover datos mock y configurar spinners/cargando.

#### [MODIFY] [FormularioCompra.jsx](file:///c:/controlab-ia/frontend/src/pages/Compras/FormularioCompra.jsx)
- Cargar la lista real de productos desde `GET /api/inventory` para el dropdown.
- Enviar datos mediante `POST /api/compras` (nueva) o `PUT /api/compras/:id` (edición).
- Cargar datos reales de compra si es modo edición desde `GET /api/compras/:id`.

#### [MODIFY] [DetalleCompra.js](file:///c:/controlab-ia/frontend/src/pages/Compras/DetalleCompra.js)
- Consumir `GET /api/compras/:id`.
- Mostrar datos reales del proveedor y producto.

## Verification Plan

### Automated Tests
- Ejecutar peticiones POST y GET en `/api/compras` para verificar que se guardan y leen correctamente en la base de datos local SQL Server.

### Manual Verification
1. Ingresar a la interfaz de **Gestión de Compras** en el navegador.
2. Hacer clic en **Nueva Compra**.
3. Seleccionar un producto real del catálogo (ej. PCR COVID-19 o Guantes Nitrilo), ingresar cantidad y precio de costo, establecer el estado como **Pendiente** y hacer clic en **Crear Compra**. Validar que aparece en la lista.
4. Editar la compra y cambiar su estado a **Recibido**.
5. Ir al módulo de **Inventario** y de **Movimientos** para verificar que:
   - El stock actual del producto aumentó según la cantidad comprada.
   - El precio de costo del producto se actualizó.
   - Se registró un movimiento de `ENTRADA` con la factura correspondiente.
