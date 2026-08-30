-- 1. Deshabilitar restricciones de clave foránea temporalmente (opcional, pero útil para evitar errores)
-- DECLARE @sql NVARCHAR(MAX) = '';
-- SELECT @sql = @sql + 'ALTER TABLE ' + OBJECT_NAME(parent_object_id) + ' NOCHECK CONSTRAINT ' + name + ';'
-- FROM sys.foreign_keys;
-- EXEC sp_executesql @sql;

-- 2. Identificar los IDs de los reactivos
DECLARE @ReactivoIds TABLE (id INT);
INSERT INTO @ReactivoIds
SELECT id FROM items_inventario 
WHERE categoria = 'Reactivo' OR codigo LIKE 'REACT-%';

-- 3. Borrar dependencias en tablas relacionadas (en orden inverso)
-- a) DetalleImportacionPruebas que referencia LotesReactivos (que a su vez referencia items_inventario)
DELETE FROM DetalleImportacionPruebas
WHERE LoteId IN (SELECT Id FROM LotesReactivos WHERE InventarioId IN (SELECT id FROM @ReactivoIds));

-- b) kit_reactivos
DELETE FROM kit_reactivos WHERE inventario_id IN (SELECT id FROM @ReactivoIds);

-- c) mapeo_pruebas_reactivos (si reactivo_id apunta a items_inventario)
DELETE FROM mapeo_pruebas_reactivos WHERE reactivo_id IN (SELECT id FROM @ReactivoIds);

-- d) movimientos_inventario
DELETE FROM movimientos_inventario WHERE item_id IN (SELECT id FROM @ReactivoIds);

-- e) compras_inventario
DELETE FROM compras_inventario WHERE item_id IN (SELECT id FROM @ReactivoIds);

-- f) reactivos
DELETE FROM reactivos WHERE item_id IN (SELECT id FROM @ReactivoIds);

-- g) LotesReactivos
DELETE FROM LotesReactivos WHERE InventarioId IN (SELECT id FROM @ReactivoIds);

-- h) items_inventario (los reactivos)
DELETE FROM items_inventario WHERE id IN (SELECT id FROM @ReactivoIds);

-- 4. Habilitar restricciones de nuevo
-- DECLARE @sql2 NVARCHAR(MAX) = '';
-- SELECT @sql2 = @sql2 + 'ALTER TABLE ' + OBJECT_NAME(parent_object_id) + ' CHECK CONSTRAINT ' + name + ';'
-- FROM sys.foreign_keys;
-- EXEC sp_executesql @sql2;