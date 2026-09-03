const { executeQuery } = require('../config/database');

async function getSuppliers(req, res) {
  try {
    const rows = await executeQuery('SELECT id, nombre FROM proveedores ORDER BY nombre ASC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function createSupplier(req, res) {
  try {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ success: false, error: 'El nombre del proveedor es requerido.' });
    }
    const cleanName = nombre.trim();
    
    // Check if exists
    const existing = await executeQuery('SELECT id, nombre FROM proveedores WHERE LOWER(nombre) = LOWER(@cleanName)', { cleanName });
    if (existing && existing.length > 0) {
      return res.json({ success: true, supplier: existing[0], message: 'El proveedor ya existía en la lista.' });
    }

    const inserted = await executeQuery(
      "INSERT INTO proveedores (nombre, creado_por, fecha_creacion, fecha_actualizacion) OUTPUT INSERTED.id, INSERTED.nombre VALUES (@cleanName, 'admin', GETDATE(), GETDATE())",
      { cleanName }
    );

    res.status(201).json({
      success: true,
      supplier: inserted[0],
      message: `Proveedor "${cleanName}" creado exitosamente.`
    });
  } catch (error) {
    console.error('Error creating supplier:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getReceptions(req, res) {
  try {
    const { almacen_id, search } = req.query;

    let query = `
      SELECT 
        i.id as item_id,
        i.codigo as item_codigo,
        i.nombre as item_nombre,
        i.referencia as item_referencia,
        i.categoria as item_categoria,
        i.precio_costo,
        i.stock_actual as item_stock_total,
        i.fecha_creacion as item_fecha_creacion,
        m.id as movimiento_id,
        ISNULL(m.cantidad, i.stock_actual) as cantidad_cajas,
        ISNULL(m.fecha_movimiento, i.fecha_creacion) as fecha_ingreso,
        m.nro_factura,
        m.nota_entrega,
        m.codigo_barra,
        m.presentacion_empaque,
        a.id as almacen_id,
        ISNULL(a.nombre, 'Almacén Central') as almacen_nombre,
        p.id as proveedor_id,
        ISNULL(p.nombre, 'Catálogo Inicial') as proveedor_nombre,
        ISNULL(l.NumeroLote, 'LOTE-INICIAL') as lote_numero,
        l.FechaFabricacion as fecha_fabricacion,
        l.FechaVencimiento as fecha_vencimiento,
        ISNULL(l.PrecioRecepcionUSD, i.precio_costo) as precio_recepcion_usd
      FROM items_inventario i
      LEFT JOIN (
        SELECT item_id, MAX(id) as max_mov_id
        FROM movimientos_inventario
        WHERE tipo_movimiento = 'ENTRADA'
        GROUP BY item_id
      ) latest_mov ON i.id = latest_mov.item_id
      LEFT JOIN movimientos_inventario m ON latest_mov.max_mov_id = m.id
      LEFT JOIN almacenes a ON ISNULL(m.almacen_id, 1) = a.id
      LEFT JOIN proveedores p ON m.proveedor_id = p.id
      LEFT JOIN LotesReactivos l ON (i.id = l.InventarioId AND l.Estado = 'Activo')
      WHERE i.activo = 1
    `;

    const params = {};

    if (almacen_id && almacen_id !== 'all') {
      query += ` AND ISNULL(m.almacen_id, 1) = @almacenId`;
      params.almacenId = parseInt(almacen_id, 10);
    }

    query += ` ORDER BY ISNULL(m.fecha_movimiento, i.fecha_creacion) DESC, i.nombre ASC`;

    const rows = await executeQuery(query, params);

    let totalIngresadoUSD = 0;
    let totalCajas = 0;

    const itemsFormatted = rows.map(r => {
      const cajas = Number(r.cantidad_cajas) || Number(r.item_stock_total) || 0;
      const precioUSD = Number(r.precio_recepcion_usd) || Number(r.precio_costo) || 0;
      const totalUSD = cajas * precioUSD;

      totalCajas += cajas;
      totalIngresadoUSD += totalUSD;

      return {
        id: r.movimiento_id || (`ITEM-` + r.item_id),
        item_id: r.item_id,
        item_codigo: r.item_codigo,
        item_nombre: r.item_nombre,
        item_referencia: r.item_referencia,
        item_categoria: r.item_categoria,
        cantidad_cajas: cajas,
        presentacion_empaque: r.presentacion_empaque || 'Cajas',
        almacen_id: r.almacen_id || 1,
        almacen_nombre: r.almacen_nombre || 'Almacén Central',
        proveedor_id: r.proveedor_id,
        proveedor_nombre: r.proveedor_nombre || 'Catálogo Inicial',
        nro_factura: r.nro_factura || '',
        nota_entrega: r.nota_entrega || '',
        codigo_barra: r.codigo_barra || '',
        lote_numero: r.lote_numero || 'LOTE-INICIAL',
        fecha_fabricacion: r.fecha_fabricacion,
        fecha_vencimiento: r.fecha_vencimiento,
        precio_recepcion_usd: parseFloat(precioUSD.toFixed(2)),
        valor_total_usd: parseFloat(totalUSD.toFixed(2)),
        referencia: r.referencia || 'REG-INICIAL',
        fecha_ingreso: r.fecha_ingreso
      };
    });

    res.json({
      success: true,
      totalRecepciones: rows.length,
      totalCajas,
      totalIngresadoUSD: parseFloat(totalIngresadoUSD.toFixed(2)),
      data: itemsFormatted
    });

  } catch (error) {
    console.error('Error fetching receptions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function createReception(req, res) {
  try {
    const {
      item_id,
      cantidad_cajas,
      lote,
      fecha_fabricacion,
      fecha_vencimiento,
      almacen_id,
      proveedor_id,
      nro_factura,
      nota_entrega,
      codigo_barra,
      presentacion_empaque,
      precio_recepcion_usd,
      referencia_documento
    } = req.body;

    if (!item_id || !cantidad_cajas || !lote || !almacen_id) {
      return res.status(400).json({ success: false, error: 'Por favor completa todos los campos obligatorios (Producto, Cantidad, Lote, Almacén).' });
    }

    const itemIdNum = parseInt(item_id, 10);
    const almacenIdNum = parseInt(almacen_id, 10);
    const proveedorIdNum = proveedor_id ? parseInt(proveedor_id, 10) : null;
    const qtyCajas = parseFloat(cantidad_cajas);
    const precioUSD = parseFloat(precio_recepcion_usd || 0);
    const presentacionStr = presentacion_empaque || 'Cajas';
    const facturaStr = nro_factura ? String(nro_factura).trim() : null;
    const notaEntregaStr = nota_entrega ? String(nota_entrega).trim() : null;
    const barcodeStr = codigo_barra ? String(codigo_barra).trim() : null;

    // 1. Check item exists
    const itemRows = await executeQuery('SELECT * FROM items_inventario WHERE id = @id', { id: itemIdNum });
    if (!itemRows || itemRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado.' });
    }
    const item = itemRows[0];

    // 2. Check almacen exists
    const almacenesRows = await executeQuery('SELECT * FROM almacenes WHERE id = @id', { id: almacenIdNum });
    const almacenNombre = almacenesRows && almacenesRows.length > 0 ? almacenesRows[0].nombre : 'Almacén Central';

    // 3. Upsert Stock Por Almacen
    const existingStock = await executeQuery(
      'SELECT * FROM stock_por_almacen WHERE item_id = @itemId AND almacen_id = @almacenId',
      { itemId: itemIdNum, almacenId: almacenIdNum }
    );

    const currentStock = existingStock && existingStock.length > 0 ? Number(existingStock[0].stock_actual) : 0;
    const newStock = currentStock + qtyCajas;

    if (existingStock && existingStock.length > 0) {
      await executeQuery(
        'UPDATE stock_por_almacen SET stock_actual = @newStock WHERE item_id = @itemId AND almacen_id = @almacenId',
        { newStock, itemId: itemIdNum, almacenId: almacenIdNum }
      );
    } else {
      await executeQuery(
        'INSERT INTO stock_por_almacen (item_id, almacen_id, stock_actual) VALUES (@itemId, @almacenId, @newStock)',
        { itemId: itemIdNum, almacenId: almacenIdNum, newStock }
      );
    }

    // 4. Recalculate global cumulative stock & update barcode if provided
    const globalStockRows = await executeQuery(
      'SELECT SUM(stock_actual) as totalStock FROM stock_por_almacen WHERE item_id = @itemId',
      { itemId: itemIdNum }
    );
    const globalStock = globalStockRows[0]?.totalStock !== null ? Number(globalStockRows[0].totalStock) : (Number(item.stock_actual) + qtyCajas);

    await executeQuery(
      `UPDATE items_inventario 
       SET stock_actual = @globalStock, 
           precio_costo = CASE WHEN @precioUSD > 0 THEN @precioUSD ELSE precio_costo END,
           codigo_barra = ISNULL(@barcodeStr, codigo_barra)
       WHERE id = @itemId`,
      { globalStock, precioUSD, barcodeStr, itemId: itemIdNum }
    );

    // 5. Create or Update Lote record in LotesReactivos
    const loteClean = String(lote).trim();

    const existingLot = await executeQuery(
      'SELECT * FROM LotesReactivos WHERE InventarioId = @itemId AND NumeroLote = @loteClean',
      { itemId: itemIdNum, loteClean }
    );

    let fabDateParsed = fecha_fabricacion ? new Date(fecha_fabricacion) : null;
    let vencDateParsed = fecha_vencimiento ? new Date(fecha_vencimiento) : null;

    if (existingLot && existingLot.length > 0) {
      const lotId = existingLot[0].Id;
      const currentLotQty = Number(existingLot[0].CantidadActual) || 0;
      await executeQuery(
        `UPDATE LotesReactivos 
        SET CantidadActual = @newLotQty, 
            FechaFabricacion = ISNULL(@fabDate, FechaFabricacion),
            FechaVencimiento = ISNULL(@vencDate, FechaVencimiento),
            PrecioRecepcionUSD = CASE WHEN @precioUSD > 0 THEN @precioUSD ELSE PrecioRecepcionUSD END,
            ProveedorId = ISNULL(@proveedorIdNum, ProveedorId),
            NroFactura = ISNULL(@facturaStr, NroFactura),
            NotaEntrega = ISNULL(@notaEntregaStr, NotaEntrega),
            CodigoBarra = ISNULL(@barcodeStr, CodigoBarra),
            PresentacionEmpaque = ISNULL(@presentacionStr, PresentacionEmpaque),
            Estado = 'Activo'
        WHERE Id = @lotId`,
        { newLotQty: currentLotQty + qtyCajas, fabDate: fabDateParsed, vencDate: vencDateParsed, precioUSD, proveedorIdNum, facturaStr, notaEntregaStr, barcodeStr, presentacionStr, lotId }
      );
    } else {
      await executeQuery(
        `INSERT INTO LotesReactivos (
          InventarioId, NumeroLote, CantidadInicial, CantidadActual, Estado, 
          FechaRegistro, FechaFabricacion, FechaVencimiento, PrecioRecepcionUSD, AlmacenId,
          ProveedorId, NroFactura, NotaEntrega, CodigoBarra, PresentacionEmpaque
        )
        VALUES (
          @itemId, @loteClean, @qtyCajas, @qtyCajas, 'Activo',
          GETDATE(), @fabDate, @vencDate, @precioUSD, @almacenId,
          @proveedorIdNum, @facturaStr, @notaEntregaStr, @barcodeStr, @presentacionStr
        )`,
        { itemId: itemIdNum, loteClean, qtyCajas, fabDate: fabDateParsed, vencDate: vencDateParsed, precioUSD, almacenId: almacenIdNum, proveedorIdNum, facturaStr, notaEntregaStr, barcodeStr, presentacionStr }
      );
    }

    // 6. Record movement entry in movimientos_inventario
    const docRef = referencia_documento ? String(referencia_documento).trim() : `REC-${Date.now()}`;
    const motivoStr = `Ingreso Recepción - Lote: ${loteClean} - Almacén: ${almacenNombre}`;

    await executeQuery(
      `INSERT INTO movimientos_inventario (
        item_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, 
        motivo, referencia, fecha_movimiento, almacen_id, creado_por,
        proveedor_id, nro_factura, nota_entrega, codigo_barra, presentacion_empaque
      )
      VALUES (
        @itemId, 'ENTRADA', @qtyCajas, @currentStock, @newStock,
        @motivoStr, @docRef, GETDATE(), @almacenId, 1,
        @proveedorIdNum, @facturaStr, @notaEntregaStr, @barcodeStr, @presentacionStr
      )`,
      { itemId: itemIdNum, qtyCajas, currentStock, newStock, motivoStr, docRef, almacenId: almacenIdNum, proveedorIdNum, facturaStr, notaEntregaStr, barcodeStr, presentacionStr }
    );

    res.status(201).json({
      success: true,
      message: `Recepción de ${qtyCajas} ${presentacionStr} de ${item.nombre} (Lote: ${loteClean}) registrada exitosamente en ${almacenNombre}.`
    });

  } catch (error) {
    console.error('Error creating reception:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getSuppliers,
  createSupplier,
  getReceptions,
  createReception
};
