-- Eliminar constraint de default 100 en volumen_por_frasco_ml
IF EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = 'DF__items_inv__volum__3B60C8C7')
BEGIN
    ALTER TABLE items_inventario DROP CONSTRAINT DF__items_inv__volum__3B60C8C7;
    PRINT 'Constraint DF__items_inv__volum__3B60C8C7 eliminado exitosamente.';
END

-- Limpiar el valor residual 100 en productos que no tienen volumen por frasco real
UPDATE items_inventario
SET volumen_por_frasco_ml = NULL
WHERE (volumen_por_frasco IS NULL OR volumen_por_frasco = 0)
  AND volumen_por_frasco_ml = 100;

-- Limpiar el item 17994 (PRU-BQ-COC) que fue creado hoy y recibio los 100 por defecto
UPDATE items_inventario
SET volumen_por_frasco = NULL,
    volumen_por_frasco_ml = NULL,
    volumen_total_caja = NULL
WHERE id = 17994;

PRINT 'Limpieza de valores por defecto de volumen completada.';
