const prisma = require('../../core/prisma');
const { executeQuery } = require('../../../config/database');

let columnsVerified = false;

async function ensureColumnsExist() {
  if (columnsVerified) return;
  const columnsToAdd = [
    { name: 'codigo_barra', type: 'NVARCHAR(100) NULL' },
    { name: 'referencia', type: 'NVARCHAR(50) NULL' },
    { name: 'grupo', type: 'NVARCHAR(50) NULL' },
    { name: 'panel', type: 'NVARCHAR(100) NULL' },
    { name: 'control_asociado', type: 'NVARCHAR(100) NULL' },
    { name: 'calibradores_asociados', type: 'NVARCHAR(200) NULL' },
    { name: 'unidad_manejo', type: 'NVARCHAR(20) NULL' },
    { name: 'cantidad_unidades', type: 'DECIMAL(10, 2) DEFAULT 1 NULL' },
    { name: 'unidad_test', type: 'DECIMAL(10, 2) DEFAULT 180 NULL' },
    { name: 'costo_unitario_manejo', type: 'DECIMAL(10, 4) NULL' },
    { name: 'aplica_iva', type: 'BIT DEFAULT 0 NULL' },
    { name: 'porcentaje_utilidad', type: 'DECIMAL(5, 2) NULL' },
    { name: 'stock_promedio', type: 'DECIMAL(10, 2) DEFAULT 0 NULL' },
    { name: 'stock_maximo', type: 'DECIMAL(10, 2) DEFAULT 0 NULL' },
    { name: 'unidad_negocio', type: 'NVARCHAR(100) NULL' },
    { name: 'equipo_asociado', type: 'NVARCHAR(100) NULL' },
    { name: 'consumo_indicado', type: 'DECIMAL(10, 4) NULL' },
    { name: 'consumo_real', type: 'DECIMAL(10, 4) NULL' },
    { name: 'desviacion_consumo', type: 'DECIMAL(5, 2) NULL' },
    // 🆕 Jerarquía Cajas - Frascos - mL
    { name: 'frascos_por_caja', type: 'DECIMAL(10, 2) DEFAULT 1 NULL' },
    { name: 'volumen_por_frasco_ml', type: 'DECIMAL(10, 2) DEFAULT 100 NULL' },
    { name: 'volumen_muerto_frasco_ml', type: 'DECIMAL(10, 2) DEFAULT 0 NULL' },
    { name: 'pruebas_teoricas_frasco', type: 'INT NULL' },
    { name: 'pruebas_teoricas_caja', type: 'INT NULL' }
  ];

  for (const col of columnsToAdd) {
    try {
      await executeQuery(`
        IF NOT EXISTS (
          SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'items_inventario' AND COLUMN_NAME = '${col.name}'
        )
        BEGIN
          ALTER TABLE items_inventario ADD ${col.name} ${col.type};
        END
      `);
    } catch (e) {
      console.warn(`Aviso agregando columna ${col.name}:`, e.message);
    }
  }
  columnsVerified = true;
}

class InventoryRepository {
  async findAllActive(almacenId) {
    if (almacenId && almacenId !== 'all') {
      const items = await prisma.itemInventario.findMany({
        where: { activo: true },
        include: {
          stock_sucursales: {
            where: { almacen_id: parseInt(almacenId) }
          }
        },
        orderBy: { fecha_creacion: 'desc' }
      });

      return items.map(item => {
        const localStock = item.stock_sucursales[0]?.stock_actual;
        return {
          ...item,
          stock_actual: localStock !== undefined ? Number(localStock) : 0
        };
      });
    }

    return prisma.itemInventario.findMany({
      where: { activo: true },
      orderBy: { fecha_creacion: 'desc' }
    });
  }

  async findByCodigo(codigo) {
    if (!codigo || !codigo.trim()) return null;
    return prisma.itemInventario.findFirst({
      where: { 
        codigo: codigo.trim(),
        activo: true
      }
    });
  }

  async create(data) {
    await ensureColumnsExist();
    const {
      codigo, nombre, descripcion, categoria, unidad, stock_actual,
      stock_minimo, stock_critico, proveedor, precio_costo, precio_venta,
      ubicacion, fecha_vencimiento, marca,
      // 🆕 Campos en azul
      codigo_barra, referencia, grupo, panel, control_asociado, calibradores_asociados,
      unidad_manejo, cantidad_unidades, unidad_test, costo_unitario_manejo, aplica_iva, porcentaje_utilidad,
      stock_promedio, stock_maximo, unidad_negocio, equipo_asociado,
      consumo_indicado, consumo_real, desviacion_consumo,
      // 📦 Jerarquía Cajas - Frascos - mL
      frascos_por_caja, volumen_por_frasco_ml, volumen_muerto_frasco_ml,
      pruebas_teoricas_frasco, pruebas_teoricas_caja
    } = data;

    const qty = parseFloat(stock_actual) || 0;
    const qtyUnidades = parseFloat(cantidad_unidades) || 1;
    const valUnidadTest = parseFloat(unidad_test) || 180;
    const isIva = aplica_iva === true || aplica_iva === 'true' || aplica_iva === 'SI' ? 1 : 0;

    const valFrascosCaja = parseFloat(frascos_por_caja) || 1;
    const valVolFrasco = parseFloat(volumen_por_frasco_ml) || 100;
    const valVolMuerto = parseFloat(volumen_muerto_frasco_ml) || 0;
    const valConsumoInd = parseFloat(consumo_indicado) || 0;

    const valPruebasFrasco = parseInt(pruebas_teoricas_frasco) || (valConsumoInd > 0 ? Math.floor(valVolFrasco / valConsumoInd) : valUnidadTest);
    const valPruebasCaja = parseInt(pruebas_teoricas_caja) || (valPruebasFrasco * valFrascosCaja);

    const query = `
      INSERT INTO items_inventario (
        codigo, nombre, descripcion, categoria, unidad, stock_actual,
        stock_minimo, stock_critico, proveedor, precio_costo, precio_venta,
        ubicacion, marca, fecha_vencimiento, activo, fecha_creacion, fecha_actualizacion,
        codigo_barra, referencia, grupo, panel, control_asociado, calibradores_asociados,
        unidad_manejo, cantidad_unidades, unidad_test, costo_unitario_manejo, aplica_iva, porcentaje_utilidad,
        stock_promedio, stock_maximo, unidad_negocio, equipo_asociado,
        consumo_indicado, consumo_real, desviacion_consumo,
        frascos_por_caja, volumen_por_frasco_ml, volumen_muerto_frasco_ml, pruebas_teoricas_frasco, pruebas_teoricas_caja
      ) 
      OUTPUT INSERTED.*
      VALUES (
        @codigo, @nombre, @descripcion, @categoria, @unidad, @qty,
        @stock_minimo, @stock_critico, @proveedor, @precio_costo, @precio_venta,
        @ubicacion, @marca, @fecha_vencimiento, 1, GETDATE(), GETDATE(),
        @codigo_barra, @referencia, @grupo, @panel, @control_asociado, @calibradores_asociados,
        @unidad_manejo, @qtyUnidades, @valUnidadTest, @costo_unitario_manejo, @isIva, @porcentaje_utilidad,
        @stock_promedio, @stock_maximo, @unidad_negocio, @equipo_asociado,
        @consumo_indicado, @consumo_real, @desviacion_consumo,
        @valFrascosCaja, @valVolFrasco, @valVolMuerto, @valPruebasFrasco, @valPruebasCaja
      )
    `;

    const params = {
      codigo: codigo ? codigo.trim() : '',
      nombre: nombre ? nombre.trim() : '',
      descripcion: descripcion || null,
      categoria: categoria || 'Reactivo',
      unidad: unidad || 'UND',
      qty: qty,
      stock_minimo: stock_minimo ? parseFloat(stock_minimo) : 0,
      stock_critico: stock_critico ? parseFloat(stock_critico) : 0,
      proveedor: proveedor || null,
      precio_costo: precio_costo ? parseFloat(precio_costo) : 0,
      precio_venta: precio_venta ? parseFloat(precio_venta) : 0,
      ubicacion: ubicacion || null,
      marca: marca || null,
      fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : null,
      codigo_barra: codigo_barra || null,
      referencia: referencia || null,
      grupo: grupo || 'REACTIVO',
      panel: panel || null,
      control_asociado: control_asociado || null,
      calibradores_asociados: calibradores_asociados || null,
      unidad_manejo: unidad_manejo || 'UND',
      qtyUnidades: qtyUnidades,
      valUnidadTest: valUnidadTest,
      costo_unitario_manejo: costo_unitario_manejo ? parseFloat(costo_unitario_manejo) : null,
      isIva: isIva,
      porcentaje_utilidad: porcentaje_utilidad ? parseFloat(porcentaje_utilidad) : null,
      stock_promedio: stock_promedio ? parseFloat(stock_promedio) : 0,
      stock_maximo: stock_maximo ? parseFloat(stock_maximo) : 0,
      unidad_negocio: unidad_negocio || null,
      equipo_asociado: equipo_asociado || null,
      consumo_indicado: consumo_indicado ? parseFloat(consumo_indicado) : null,
      consumo_real: consumo_real ? parseFloat(consumo_real) : null,
      desviacion_consumo: desviacion_consumo ? parseFloat(desviacion_consumo) : null,
      valFrascosCaja: valFrascosCaja,
      valVolFrasco: valVolFrasco,
      valVolMuerto: valVolMuerto,
      valPruebasFrasco: valPruebasFrasco,
      valPruebasCaja: valPruebasCaja
    };

    const inserted = await executeQuery(query, params);
    const item = inserted && inserted.length > 0 ? inserted[0] : null;

    if (item && item.id) {
      // 2. Buscar todos los almacenes existentes y asociar el stock inicial
      try {
        const almacenes = await executeQuery(`SELECT * FROM almacenes`);
        if (almacenes && almacenes.length > 0) {
          const central = almacenes.find(a => a.nombre.includes('Central')) || almacenes[0];
          for (const almacen of almacenes) {
            const stockVal = almacen.id === central.id ? qty : 0;
            await executeQuery(`
              IF NOT EXISTS (SELECT 1 FROM stock_por_almacen WHERE item_id = @item_id AND almacen_id = @almacen_id)
              BEGIN
                INSERT INTO stock_por_almacen (item_id, almacen_id, stock_actual)
                VALUES (@item_id, @almacen_id, @stockVal)
              END
            `, { item_id: item.id, almacen_id: almacen.id, stockVal });
          }
        }
      } catch (errAlm) {
        console.warn('Advertencia asociando almacenes:', errAlm.message);
      }

      // 3. 🧪 Auto-Sincronización con el Catálogo de Reactivos
      const esReactivo = (categoria && categoria.toLowerCase() === 'reactivo') || (grupo && grupo.toUpperCase() === 'REACTIVO');
      if (esReactivo) {
        await executeQuery(`
          IF NOT EXISTS (SELECT 1 FROM reactivos WHERE item_id = @item_id)
          BEGIN
            INSERT INTO reactivos (item_id, numero_cas, formula_molecular, peso_molecular, pureza, condiciones_almacenamiento, nivel_riesgo)
            VALUES (@item_id, 'N/A', 'N/A', 0, 'N/A', @ubicacion, 'N/A')
          END
        `, { item_id: item.id, ubicacion: ubicacion || 'Almacén Principal / Nevera' });
      }
    }

    return item;
  }

  async update(id, data) {
    await ensureColumnsExist();
    const {
      codigo, nombre, descripcion, categoria, unidad,
      stock_minimo, stock_critico, proveedor, precio_costo, precio_venta,
      ubicacion, fecha_vencimiento, marca,
      // 🆕 Campos en azul
      codigo_barra, referencia, grupo, panel, control_asociado, calibradores_asociados,
      unidad_manejo, cantidad_unidades, unidad_test, costo_unitario_manejo, aplica_iva, porcentaje_utilidad,
      stock_promedio, stock_maximo, unidad_negocio, equipo_asociado,
      consumo_indicado, consumo_real, desviacion_consumo,
      // 📦 Jerarquía Cajas - Frascos - mL
      frascos_por_caja, volumen_por_frasco_ml, volumen_muerto_frasco_ml,
      pruebas_teoricas_frasco, pruebas_teoricas_caja
    } = data;

    const itemId = parseInt(id);
    const isIva = aplica_iva === true || aplica_iva === 'true' || aplica_iva === 'SI' ? 1 : 0;
    const valUnidadTest = parseFloat(unidad_test) || 180;

    const valFrascosCaja = parseFloat(frascos_por_caja) || 1;
    const valVolFrasco = parseFloat(volumen_por_frasco_ml) || 100;
    const valVolMuerto = parseFloat(volumen_muerto_frasco_ml) || 0;
    const valConsumoInd = parseFloat(consumo_indicado) || 0;

    const valPruebasFrasco = parseInt(pruebas_teoricas_frasco) || (valConsumoInd > 0 ? Math.floor(valVolFrasco / valConsumoInd) : valUnidadTest);
    const valPruebasCaja = parseInt(pruebas_teoricas_caja) || (valPruebasFrasco * valFrascosCaja);

    const query = `
      UPDATE items_inventario
      SET 
        codigo = @codigo,
        nombre = @nombre,
        descripcion = @descripcion,
        categoria = @categoria,
        unidad = @unidad,
        stock_minimo = @stock_minimo,
        stock_critico = @stock_critico,
        proveedor = @proveedor,
        precio_costo = @precio_costo,
        precio_venta = @precio_venta,
        ubicacion = @ubicacion,
        marca = @marca,
        fecha_vencimiento = @fecha_vencimiento,
        fecha_actualizacion = GETDATE(),
        codigo_barra = @codigo_barra,
        referencia = @referencia,
        grupo = @grupo,
        panel = @panel,
        control_asociado = @control_asociado,
        calibradores_asociados = @calibradores_asociados,
        unidad_manejo = @unidad_manejo,
        cantidad_unidades = @qtyUnidades,
        unidad_test = @valUnidadTest,
        costo_unitario_manejo = @costo_unitario_manejo,
        aplica_iva = @isIva,
        porcentaje_utilidad = @porcentaje_utilidad,
        stock_promedio = @stock_promedio,
        stock_maximo = @stock_maximo,
        unidad_negocio = @unidad_negocio,
        equipo_asociado = @equipo_asociado,
        consumo_indicado = @consumo_indicado,
        consumo_real = @consumo_real,
        desviacion_consumo = @desviacion_consumo,
        frascos_por_caja = @valFrascosCaja,
        volumen_por_frasco_ml = @valVolFrasco,
        volumen_muerto_frasco_ml = @valVolMuerto,
        pruebas_teoricas_frasco = @valPruebasFrasco,
        pruebas_teoricas_caja = @valPruebasCaja
      WHERE id = @itemId AND activo = 1
    `;

    const params = {
      itemId: itemId,
      codigo: codigo ? codigo.trim() : '',
      nombre: nombre ? nombre.trim() : '',
      descripcion: descripcion || null,
      categoria: categoria || 'Reactivo',
      unidad: unidad || 'UND',
      stock_minimo: stock_minimo ? parseFloat(stock_minimo) : 0,
      stock_critico: stock_critico ? parseFloat(stock_critico) : 0,
      proveedor: proveedor || null,
      precio_costo: precio_costo ? parseFloat(precio_costo) : 0,
      precio_venta: precio_venta ? parseFloat(precio_venta) : 0,
      ubicacion: ubicacion || null,
      marca: marca || null,
      fecha_vencimiento: fecha_vencimiento ? new Date(fecha_vencimiento) : null,
      codigo_barra: codigo_barra || null,
      referencia: referencia || null,
      grupo: grupo || 'REACTIVO',
      panel: panel || null,
      control_asociado: control_asociado || null,
      calibradores_asociados: calibradores_asociados || null,
      unidad_manejo: unidad_manejo || 'UND',
      qtyUnidades: cantidad_unidades ? parseFloat(cantidad_unidades) : 1,
      valUnidadTest: valUnidadTest,
      costo_unitario_manejo: costo_unitario_manejo ? parseFloat(costo_unitario_manejo) : null,
      isIva: isIva,
      porcentaje_utilidad: porcentaje_utilidad ? parseFloat(porcentaje_utilidad) : null,
      stock_promedio: stock_promedio ? parseFloat(stock_promedio) : 0,
      stock_maximo: stock_maximo ? parseFloat(stock_maximo) : 0,
      unidad_negocio: unidad_negocio || null,
      equipo_asociado: equipo_asociado || null,
      consumo_indicado: consumo_indicado ? parseFloat(consumo_indicado) : null,
      consumo_real: consumo_real ? parseFloat(consumo_real) : null,
      desviacion_consumo: desviacion_consumo ? parseFloat(desviacion_consumo) : null,
      valFrascosCaja: valFrascosCaja,
      valVolFrasco: valVolFrasco,
      valVolMuerto: valVolMuerto,
      valPruebasFrasco: valPruebasFrasco,
      valPruebasCaja: valPruebasCaja
    };

    const result = await executeQuery(query, params);

    // 🧪 Auto-Sincronización con Catálogo de Reactivos en Edición
    const esReactivo = (categoria && categoria.toLowerCase() === 'reactivo') || (grupo && grupo.toUpperCase() === 'REACTIVO');
    if (esReactivo) {
      await executeQuery(`
        IF NOT EXISTS (SELECT 1 FROM reactivos WHERE item_id = @item_id)
        BEGIN
          INSERT INTO reactivos (item_id, numero_cas, formula_molecular, peso_molecular, pureza, condiciones_almacenamiento, nivel_riesgo)
          VALUES (@item_id, 'N/A', 'N/A', 0, 'N/A', @ubicacion, 'N/A')
        END
      `, { item_id: itemId, ubicacion: ubicacion || 'Almacén Principal / Nevera' });
    }

    return result;
  }

  async delete(id) {
    return prisma.itemInventario.update({
      where: { id: parseInt(id) },
      data: { activo: false }
    });
  }
}

module.exports = new InventoryRepository();
