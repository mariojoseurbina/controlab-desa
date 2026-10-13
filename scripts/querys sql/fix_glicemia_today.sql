BEGIN TRANSACTION;

-- 1. Reasignar los 32 logs del Sniffer de hoy (13/10/2026) del Lote 1 (48149) al Lote real 1827010 (48272)
UPDATE log_sniffer 
SET lote_afectado_id = 48272 
WHERE lote_afectado_id = 48149 
  AND CAST(fecha_registro AS DATE) = '2026-10-13';

PRINT 'Logs transferidos: ' + CAST(@@ROWCOUNT AS VARCHAR(10));

-- 2. Cerrar la caja fantasma del Lote 1 (48149) y restituir los 8 mL que se le habian restado erroneamente hoy
UPDATE LotesReactivos 
SET Estado = 'Agotado',
    CantidadActual = CantidadActual + 8.00
WHERE Id = 48149;

PRINT 'Caja fantasma cerrada (Agotado): ' + CAST(@@ROWCOUNT AS VARCHAR(10));

-- 3. Descontar las 32 pruebas (8.00 mL) a la caja real 1827010 (48272)
UPDATE LotesReactivos 
SET CantidadActual = CantidadActual - 8.00,
    PruebasRestantes = PruebasRestantes - 32
WHERE Id = 48272;

PRINT 'Caja real 1827010 actualizada: ' + CAST(@@ROWCOUNT AS VARCHAR(10));

-- 4. Registrar en el Kardex de inventario el movimiento de sustitucion
INSERT INTO movimientos_inventario (
  item_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo,
  motivo, referencia, creado_por, fecha_movimiento
) VALUES (
  17518, 'SUSTITUCION_LOTE', 0, 290.25, 0,
  'CIERRE POR SUSTITUCION: APERTURA DE NUEVO LOTE 1827010 EN CM 260I',
  'LOTE ANTERIOR: 1 CERRADO POR APERTURA DE LOTE 1827010 POR MARIA COLLAZOS',
  1, GETDATE()
);

PRINT 'Kardex asentado: ' + CAST(@@ROWCOUNT AS VARCHAR(10));

COMMIT TRANSACTION;
PRINT 'TRANSACCION COMPLETADA CON EXITO';
