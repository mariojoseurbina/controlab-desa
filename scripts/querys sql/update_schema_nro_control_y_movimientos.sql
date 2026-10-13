-- =================================================================================
-- Script de Actualizacion de Esquema de Base de Datos - Nro de Control y Movimientos
-- Proyecto: Controlab A.I. / LIMS
-- Descripcion: Agrega de forma segura e idempotente las columnas para Nro de Control 
--              fiscal y amplia la longitud de tipo_movimiento a VARCHAR(50).
-- =================================================================================

-- 1. Ampliar columna tipo_movimiento en movimientos_inventario a VARCHAR(50)
IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'movimientos_inventario' 
      AND COLUMN_NAME = 'tipo_movimiento' 
      AND CHARACTER_MAXIMUM_LENGTH < 50
)
BEGIN
    ALTER TABLE movimientos_inventario ALTER COLUMN tipo_movimiento VARCHAR(50);
    PRINT 'Columna tipo_movimiento ampliada a VARCHAR(50) correctamente.';
END;

-- 2. Agregar columna nro_control en movimientos_inventario
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'movimientos_inventario' AND COLUMN_NAME = 'nro_control'
)
BEGIN
    ALTER TABLE movimientos_inventario ADD nro_control NVARCHAR(100) NULL;
    PRINT 'Columna nro_control agregada a movimientos_inventario correctamente.';
END;

-- 3. Agregar columna NroControl en LotesReactivos
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'LotesReactivos' AND COLUMN_NAME = 'NroControl'
)
BEGIN
    ALTER TABLE LotesReactivos ADD NroControl NVARCHAR(100) NULL;
    PRINT 'Columna NroControl agregada a LotesReactivos correctamente.';
END;

-- 4. Sincronizacion de paridad contable entre items_inventario y almacenes
UPDATE i
SET i.stock_actual = ISNULL((SELECT SUM(s.stock_actual) FROM stock_por_almacen s WHERE s.item_id = i.id), 0)
FROM items_inventario i;
PRINT 'Sincronizacion de stock global items_inventario ejecutada correctamente.';

-- 5. Correccion de Marca TINSENC -> TISENC para autoanalizador WONDFO ACCRE
UPDATE items_inventario
SET marca = 'TISENC'
WHERE equipo_asociado = 'WONDFO ACCRE' AND marca = 'TINSENC';
PRINT 'Correccion de marca TISENC para WONDFO ACCRE ejecutada correctamente.';

PRINT 'Actualizacion de esquema y paridad completada con exito.';
