SELECT 
    -- Cálculo del valor total en costo
    SUM(precio_costo * stock_actual) as valor_total_costo,
    
    -- Cálculo del valor total en venta  
    SUM(precio_venta * stock_actual) as valor_total_venta,
    
    -- Cálculo de la ganancia potencial
    SUM((precio_venta - precio_costo) * stock_actual) as ganancia_potencial,
    
    -- Conteo de items activos
    COUNT(*) as total_items,
    
    -- Items con margen positivo vs negativo
    SUM(CASE WHEN (precio_venta - precio_costo) > 0 THEN 1 ELSE 0 END) as items_con_ganancia,
    SUM(CASE WHEN (precio_venta - precio_costo) <= 0 THEN 1 ELSE 0 END) as items_sin_ganancia,
    
    -- Análisis por estado de stock
    SUM(CASE WHEN stock_actual <= stock_critico THEN (precio_costo * stock_actual) ELSE 0 END) as valor_stock_critico,
    SUM(CASE WHEN stock_actual <= stock_minimo AND stock_actual > stock_critico THEN (precio_costo * stock_actual) ELSE 0 END) as valor_stock_bajo,
    SUM(CASE WHEN stock_actual > stock_minimo THEN (precio_costo * stock_actual) ELSE 0 END) as valor_stock_normal

FROM items_inventario 
WHERE activo = 1;

SELECT 
    categoria,
    COUNT(*) as cantidad_items,
    SUM(precio_costo * stock_actual) as valor_costo_categoria,
    SUM(precio_venta * stock_actual) as valor_venta_categoria,
    SUM((precio_venta - precio_costo) * stock_actual) as ganancia_potencial_categoria,
    ROUND(SUM((precio_venta - precio_costo) * stock_actual) / SUM(precio_costo * stock_actual) * 100, 2) as margen_porcentaje_categoria
FROM items_inventario 
WHERE activo = 1
GROUP BY categoria
ORDER BY ganancia_potencial_categoria DESC;

SELECT TOP 10
    codigo,
    nombre,
    categoria,
    stock_actual,
    precio_costo,
    precio_venta,
    (precio_venta - precio_costo) as margen_unitario,
    ROUND(((precio_venta - precio_costo) / NULLIF(precio_costo, 0)) * 100, 2) as margen_porcentaje,
    (precio_venta - precio_costo) * stock_actual as ganancia_potencial_item
FROM items_inventario 
WHERE activo = 1 AND precio_costo > 0
ORDER BY ganancia_potencial_item DESC;

SELECT 
    ROUND(SUM(precio_costo * stock_actual), 2) as valor_total_costo,
    ROUND(SUM(precio_venta * stock_actual), 2) as valor_total_venta,
    ROUND(SUM((precio_venta - precio_costo) * stock_actual), 2) as ganancia_potencial
FROM items_inventario 
WHERE activo = 1;

select * from items_inventario

SELECT 
    id,
    codigo,
    nombre,
    stock_actual,
    precio_costo,
    precio_venta,
    (precio_costo * stock_actual) as valor_total_costo,
    (precio_venta * stock_actual) as valor_total_venta,
    ((precio_venta - precio_costo) * stock_actual) as ganancia_potencial
FROM items_inventario 
WHERE activo = 1 
AND codigo = 'REACT-002';