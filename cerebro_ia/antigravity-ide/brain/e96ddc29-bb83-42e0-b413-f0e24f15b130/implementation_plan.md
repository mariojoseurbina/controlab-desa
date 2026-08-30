# Plan de Diseño de Base de Datos y Relaciones: Controlab Brain Agent

Este documento describe la validación del esquema actual de la base de datos y detalla los cambios requeridos en las tablas, relaciones y campos para soportar la gestión financiera multimoneda, regímenes fiscales y la agrupación de marcas comerciales por prueba genérica.

---

## 1. Validación del Estado Actual del Esquema

Tras auditar el archivo `schema.prisma`, detectamos las siguientes limitaciones que debemos resolver:
1. **Falta de campos fiscales en `items_inventario`:** No existen columnas para el área operativa (ej. Inmunología), la naturaleza del producto (Reactivo/Calibrador/Control) ni el régimen fiscal (IVA 16%/Exento/Especial).
2. **Definiciones incompletas en `compras_inventario`:** Faltan las columnas para registrar de forma dual la tasa de cambio oficial, el desglose de IVA/impuestos en USD/VES y los totales multimoneda.
3. **Agrupación de marcas (Many-to-Many):** Necesitamos una tabla maestra de **Tipos de Pruebas** para asociar múltiples reactivos (marcas) a una prueba genérica.

---

## 2. Cambios Propuestos en el Esquema de Base de Datos

### A. Modificaciones a Tablas Existentes

#### Tabla: `items_inventario` (Agregar columnas de clasificación y fiscalidad)
* `area_operativa` (NVarChar(100)): Área del laboratorio (Química, Hematología, Inmunología, etc.).
* `naturaleza` (NVarChar(50)): Reactivo, Calibrador o Control.
* `regimen_fiscal` (NVarChar(50)): `IVA_16`, `EXENTO` o `ESPECIAL`.
* `porcentaje_impuesto_especial` (Decimal(5,2)): Porcentaje específico si el régimen es `ESPECIAL`.
* `estado_calidad` (NVarChar(50)): `ACTIVO`, `BLOQUEADO_CALIDAD`, `BLOQUEADO_COSTO`, `DESCONTINUADO` (con una nota de desincorporación).
* `nota_desincorporacion` (NVarChar(500)): Campo de texto para justificar bloqueos.

#### Tabla: `compras_inventario` (Agregar soporte fiscal y multimoneda)
* `tasa_cambio` (Decimal(18,4)): Tasa de cambio oficial del día de facturación.
* `moneda_factura` (VarChar(10)): `USD` o `VES`.
* `precio_unitario_usd` (Decimal(18,2)): Precio neto unitario en USD.
* `precio_unitario_ves` (Decimal(18,2)): Precio neto unitario en VES.
* `porcentaje_impuesto` (Decimal(5,2)): El impuesto aplicado (0%, 16% o especial).
* `monto_impuesto_usd` (Decimal(18,2)): Monto del impuesto calculado en USD.
* `monto_impuesto_ves` (Decimal(18,2)): Monto del impuesto calculado en VES.
* `subtotal_usd` (Decimal(18,2)): Cantidad x Precio Unitario en USD.
* `subtotal_ves` (Decimal(18,2)): Cantidad x Precio Unitario en VES.
* `total_linea_usd` (Decimal(18,2)): Subtotal + Impuesto en USD.
* `total_linea_ves` (Decimal(18,2)): Subtotal + Impuesto en VES.

---

### B. Nuevas Tablas de Relación y Maestras

#### Nueva Tabla: `pruebas_maestra` (Tipo de Prueba genérico)
* `id` (Int, PK, AutoIncrement)
* `nombre_prueba` (NVarChar(100)): Nombre genérico de la prueba (ej: "Glucosa", "Hemoglobina").
* `activo` (Bit, default 1)

#### Nueva Tabla: `vinculo_prueba_item` (Relación Múltiples Marcas a una Prueba Genérica)
* `id` (Int, PK, AutoIncrement)
* `prueba_id` (Int, FK a `pruebas_maestra.id`)
* `item_id` (Int, FK a `items_inventario.id`)
* `activo` (Bit, default 1)

---

## 3. Script SQL de Migración Recomandado

```sql
-- 1. Agregar campos a items_inventario
ALTER TABLE items_inventario ADD 
    area_operativa NVARCHAR(100) NULL,
    naturaleza NVARCHAR(50) NULL,
    regimen_fiscal NVARCHAR(50) DEFAULT 'EXENTO',
    porcentaje_impuesto_especial DECIMAL(5,2) DEFAULT 0.00,
    estado_calidad NVARCHAR(50) DEFAULT 'ACTIVO',
    nota_desincorporacion NVARCHAR(500) NULL;

-- 2. Agregar campos a compras_inventario
ALTER TABLE compras_inventario ADD
    tasa_cambio DECIMAL(18,4) NULL,
    moneda_factura VARCHAR(10) DEFAULT 'USD',
    precio_unitario_usd DECIMAL(18,2) NULL,
    precio_unitario_ves DECIMAL(18,2) NULL,
    porcentaje_impuesto DECIMAL(5,2) DEFAULT 0.00,
    monto_impuesto_usd DECIMAL(18,2) NULL,
    monto_impuesto_ves DECIMAL(18,2) NULL,
    subtotal_usd DECIMAL(18,2) NULL,
    subtotal_ves DECIMAL(18,2) NULL,
    total_linea_usd DECIMAL(18,2) NULL,
    total_linea_ves DECIMAL(18,2) NULL;

-- 3. Crear tabla pruebas_maestra
CREATE TABLE pruebas_maestra (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nombre_prueba NVARCHAR(100) NOT NULL UNIQUE,
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE()
);

-- 4. Crear tabla de vínculo de marcas (muchos a muchos)
CREATE TABLE vinculo_prueba_item (
    id INT IDENTITY(1,1) PRIMARY KEY,
    prueba_id INT FOREIGN KEY REFERENCES pruebas_maestra(id),
    item_id INT FOREIGN KEY REFERENCES items_inventario(id),
    activo BIT DEFAULT 1,
    fecha_vinculo DATETIME DEFAULT GETDATE()
);
```

---

## 4. Plan de Validación e Integración con el Agente

Una vez aplicados estos cambios en la base de datos, configuraremos el **Controlab Brain Agent** con acceso a estas nuevas tablas para permitir las siguientes consultas:
* *"¿Cuánto gastamos en reactivos para la prueba genérica de Glucosa (sumando todas las marcas)?"*
* *"Muestra el impacto del IVA pagado en compras de Inmunología este mes."*
* *"¿Qué marcas de calibradores de Química están bloqueadas por costo?"*
