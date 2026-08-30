# Análisis y Conciliación del Esquema de Base de Datos: Controlab-IA

Este análisis detalla cómo integrar el nuevo módulo de **Gestión de Inventario y Análisis Financiero** sobre el esquema de base de datos real (compuesto por 19 tablas) que acabamos de introspectar. El principal objetivo es asegurar **cero disrupción** sobre las funcionalidades que ya operan correctamente en producción (tales como la ingesta automática en C#, el descuento de reactivos FIFO y el asistente inteligente).

---

## 1. Mapeo de la Base de Datos Existente y Coexistencia

A partir de la introspección automática con Prisma, hemos identificado las 19 tablas de la base de datos `ControlabIA`. A continuación, se detalla cómo interactuará el nuevo módulo con las tablas core existentes:

### Tablas Core Actuales vs. Nueva Funcionalidad

| Tabla Existente | Propósito Actual | Estrategia de Conciliación (Coexistencia Segura) |
| :--- | :--- | :--- |
| **`items_inventario`** | Catálogo maestro de productos y stock. | **Modificación No Invasiva:** Agregaremos columnas opcionales (nullable) como `naturaleza`, `area_operativa`, `marca`, `regimen_fiscal`, `porcentaje_impuesto_especial` y `bloqueado`. Al ser opcionales, las consultas legacy y la ingesta en C# continuarán funcionando sin cambios. |
| **`movimientos_inventario`** | Bitácora de entradas y salidas de stock. | **Sin Cambios:** Seguirá registrando los movimientos de tipo `ENTRADA` cuando se registre una compra, vinculando el ID de la factura de compra en el campo `referencia`. |
| **`LotesReactivos`** | Control de lotes, vencimientos y rendimiento. | **Sin Cambios:** Las compras generarán nuevos registros de lotes asociados al producto para mantener la trazabilidad de vencimientos intacta. |
| **`mapeo_pruebas_reactivos`** | Vinculación entre exámenes importados y reactivos. | **Aprovechamiento:** Utilizaremos esta tabla para el "Motor de Reportes" dinámico, permitiendo mapear el consumo de pruebas a las marcas compradas. |
| **`compras_inventario`** | Registro plano e histórico de compras. | **Soporte de Compatibilidad:** Esta tabla existente almacena compras de forma plana (un producto por fila). Para soportar facturas complejas de múltiples ítems, monedas e impuestos variables, crearemos un esquema maestro-detalle (`FacturaCompra` y `DetalleFacturaCompra`), y mantendremos la tabla legacy `compras_inventario` sincronizada mediante un disparador (trigger) o duplicación controlada por el servicio backend si algún módulo legacy la requiere. |

---

## 2. Propuesta de Conciliación de Esquema (Prisma)

Para implementar el módulo financiero sin alterar las tablas actuales, extenderemos el archivo **[schema.prisma](file:///c:/controlab-ia/backend/prisma/schema.prisma)** agregando las nuevas entidades y extendiendo `ItemInventario`.

### A. Extensión Opcional de `ItemInventario`
Añadiremos los campos necesarios en la parte inferior de la tabla existente en el esquema de Prisma:

```prisma
// Campos añadidos al final de model ItemInventario
naturaleza                  String?   @db.NVarChar(50)  // Reactivo, Calibrador, Control
area_operativa              String?   @db.NVarChar(100) // Inmunología, Química, etc.
marca                       String?   @db.NVarChar(100) // Marca comercial del producto
regimen_fiscal              String?   @db.NVarChar(50)  // IVA_16, EXENTO, ESPECIAL
porcentaje_impuesto_especial Decimal? @db.Decimal(5, 2) 
bloqueado                   Boolean?  @default(false)
motivo_bloqueo              String?   @db.NVarChar(500)
```
*Al definirse todos con el modificador `?` (nullable), no se rompe la compatibilidad con los métodos `INSERT` del worker de C# ni de los controladores de carga masiva.*

### B. Nuevas Tablas a Incorporar (Esquema Limpio)
Crearemos las nuevas entidades como tablas independientes para evitar colisiones:

```prisma
model Proveedor {
  id            Int                  @id @default(autoincrement())
  nombre        String               @db.NVarChar(200)
  rif_nit       String               @unique @db.NVarChar(50)
  correo        String?              @db.NVarChar(100)
  direccion     String?              @db.NVarChar(500)
  clasificacion String               @db.NVarChar(50)  // Exclusivo, Genérico, Alternativo
  activo        Boolean              @default(true)
  facturas      FacturasCompras[]
}

model FacturasCompras {
  id              Int                   @id @default(autoincrement())
  numero_factura  String                @db.NVarChar(100)
  proveedor_id    Int
  fecha_factura   DateTime              @db.Date
  tasa_cambio     Decimal               @db.Decimal(18, 4) // VES por USD
  subtotal_usd    Decimal               @db.Decimal(18, 4)
  impuesto_usd    Decimal               @db.Decimal(18, 4)
  total_usd       Decimal               @db.Decimal(18, 4)
  total_ves       Decimal               @db.Decimal(18, 4)
  creado_por      Int?
  fecha_creacion  DateTime              @default(now())
  proveedor       Proveedor             @relation(fields: [proveedor_id], references: [id])
  detalles        DetalleFacturaCompra[]
}

model DetalleFacturaCompra {
  id                 Int             @id @default(autoincrement())
  factura_id         Int
  item_id            Int
  cantidad           Int
  precio_unitario_usd Decimal        @db.Decimal(18, 4)
  regimen_fiscal     String          @db.NVarChar(50)
  porcentaje_impuesto Decimal        @db.Decimal(5, 2)
  impuesto_usd       Decimal         @db.Decimal(18, 4)
  total_usd          Decimal         @db.Decimal(18, 4)
  total_ves          Decimal         @db.Decimal(18, 4)
  factura            FacturasCompras @relation(fields: [factura_id], references: [id])
  item               ItemInventario  @relation(fields: [item_id], references: [id])
}

model TipoPruebaGenerica {
  id          Int                  @id @default(autoincrement())
  nombre      String               @unique @db.NVarChar(100) // Ej: "Glucosa"
  descripcion String?              @db.NVarChar(500)
  productos   ItemTipoPrueba[]
}

model ItemTipoPrueba {
  item_id            Int
  tipo_prueba_id     Int
  item               ItemInventario      @relation(fields: [item_id], references: [id])
  tipo_prueba        TipoPruebaGenerica  @relation(fields: [tipo_prueba_id], references: [id])

  @@id([item_id, tipo_prueba_id])
}
```

---

## 3. Mitigación de Riesgos y Seguridad

### 1. Seguridad en la Ingesta de C# (Worker):
El servicio de C# (`InventarioAutoProcessor`) lee PDFs y añade registros a la base de datos. Como este servicio se comunica mediante consultas tradicionales (ADO.NET) apuntando a columnas como `stock_actual` e `items_inventario`, **las nuevas columnas del Catálogo Maestro no afectarán su ejecución**, ya que no son obligatorias en la inserción SQL. El worker simplemente omitirá estas columnas financieras y la base de datos les asignará su valor por defecto (`NULL` o `false`).

### 2. Sincronización del Historial de Precios:
Para evitar que se distorsionen los precios promedio o el valor de reposición calculado por los reportes de IA actuales:
* Las APIs de compras actualizarán simultáneamente el campo `precio_costo` en la tabla `items_inventario`.
* Los reportes del Dashboard de filtros cruzados consultarán `DetalleFacturaCompra` para obtener variaciones de precios muy exactas por lote y fecha, manteniendo el catálogo limpio.

### 3. Procedimiento de Migración Seguro (Prisma Migrations):
Al realizar el despliegue de estos cambios en tu servidor SQL Server local:
1. Usaremos la estrategia `npx prisma migrate dev` para crear el script SQL de migración.
2. Este script agregará las columnas nuevas y creará las nuevas tablas en SQL Server de manera completamente segura, preservando la data de inventario y movimientos que ya tienes cargada.
