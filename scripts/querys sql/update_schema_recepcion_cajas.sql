-- =================================================================================
-- Script de Actualización de Esquema de Base de Datos - Recepción Electrónica de Cajas
-- Proyecto: Controlab A.I. / LIMS
-- Descripción: Agrega de forma segura e idempotente las columnas de trazabilidad de 
--              transferencia (Almacén ↔ Laboratorio) a la tabla LotesReactivos.
-- =================================================================================

-- 1. Agregar columnas a LotesReactivos si no existen
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LotesReactivos' AND COLUMN_NAME = 'almacen_origen_id')
BEGIN
    ALTER TABLE LotesReactivos ADD almacen_origen_id INT NULL;
    PRINT '✅ Columna almacen_origen_id agregada correctamente.';
END;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LotesReactivos' AND COLUMN_NAME = 'almacen_destino_id')
BEGIN
    ALTER TABLE LotesReactivos ADD almacen_destino_id INT NULL;
    PRINT '✅ Columna almacen_destino_id agregada correctamente.';
END;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LotesReactivos' AND COLUMN_NAME = 'estado_transferencia')
BEGIN
    ALTER TABLE LotesReactivos ADD estado_transferencia VARCHAR(50) NULL;
    PRINT '✅ Columna estado_transferencia agregada correctamente.';
END;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LotesReactivos' AND COLUMN_NAME = 'usuario_despacho')
BEGIN
    ALTER TABLE LotesReactivos ADD usuario_despacho VARCHAR(100) NULL;
    PRINT '✅ Columna usuario_despacho agregada correctamente.';
END;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LotesReactivos' AND COLUMN_NAME = 'usuario_recepcion')
BEGIN
    ALTER TABLE LotesReactivos ADD usuario_recepcion VARCHAR(100) NULL;
    PRINT '✅ Columna usuario_recepcion agregada correctamente.';
END;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LotesReactivos' AND COLUMN_NAME = 'fecha_despacho')
BEGIN
    ALTER TABLE LotesReactivos ADD fecha_despacho DATETIME NULL;
    PRINT '✅ Columna fecha_despacho agregada correctamente.';
END;

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'LotesReactivos' AND COLUMN_NAME = 'fecha_recepcion_lab')
BEGIN
    ALTER TABLE LotesReactivos ADD fecha_recepcion_lab DATETIME NULL;
    PRINT '✅ Columna fecha_recepcion_lab agregada correctamente.';
END;

-- 2. Crear índice no agrupado para acelerar consultas de cajas en tránsito
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_LotesReactivos_EstadoTransferencia' AND object_id = OBJECT_ID('LotesReactivos'))
BEGIN
    CREATE INDEX IX_LotesReactivos_EstadoTransferencia ON LotesReactivos(estado_transferencia);
    PRINT '✅ Índice IX_LotesReactivos_EstadoTransferencia creado correctamente.';
END;

PRINT '🚀 Actualización de esquema finalizada exitosamente.';
