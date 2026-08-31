const prisma = require('../../core/prisma');
const { executeQuery } = require('../../../config/database');

let columnsVerified = false;

const safeFloat = (val, defaultVal = null) => {
  if (val === null || val === undefined || val === '') return defaultVal;
  const num = parseFloat(String(val).replace(',', '.').trim());
  return isNaN(num) ? defaultVal : num;
};

const safeInt = (val, defaultVal = null) => {
  if (val === null || val === undefined || val === '') return defaultVal;
  const num = parseInt(String(val).replace(',', '.').trim(), 10);
  return isNaN(num) ? defaultVal : num;
};

async function ensureColumnsExist() {
  if (columnsVerified) return;
  const columnsToAdd = [
    { name: 'codigo_barra', type: 'NVARCHAR(100) NULL' },
    { name: 'referencia', type: 'NVARCHAR(50) NULL' },
    { name: 'referencia_abreviada', type: 'NVARCHAR(50) NULL' },
    { name: 'presentacion', type: 'NVARCHAR(100) NULL' },
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
    { name: 'frascos_por_caja', type: 'DECIMAL(10, 2) DEFAULT 1 NULL' },
    { name: 'volumen_por_frasco', type: 'DECIMAL(10, 4) NULL' },
    { name: 'volumen_muerto_residual', type: 'DECIMAL(10, 4) NULL' },
    { name: 'pruebas_teoricas_frasco', type: 'DECIMAL(10, 2) NULL' },
    { name: 'pruebas_teoricas_caja', type: 'DECIMAL(10, 2) NULL' },
    { name: 'volumen_total_caja', type: 'DECIMAL(10, 2) NULL' }
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
      codigo_barra, referencia, referencia_abreviada, presentacion, grupo, panel, control_asociado, calibradores_asociados,
      unidad_manejo, cantidad_unidades, unidad_test, costo_unitario_manejo, aplica_iva, porcentaje_utilidad,
      stock_promedio, stock_maximo, unidad_negocio, equipo_asociado,
      consumo_indicado, consumo_real, desviacion_consumo,
      frascos_por_caja, volumen_por_frasco, volumen_muerto_residual, volumen_por_frasco_ml, volumen_muerto_frasco_ml,
      pruebas_teoricas_frasco, pruebas_teoricas_caja, volumen_total_caja
    } = data;

    const qty = safeFloat(stock_actual, 0);
    const qtyUnidades = safeFloat(cantidad_unidades, 1);
    const valUnidadTest = safeFloat(unidad_test, 180);
    const isIva = aplica_iva === true || aplica_iva === 'true' || aplica_iva === 'SI' ? 1 : 0;

    const valFrascosCaja = safeFloat(frascos_por_caja, 1);
    const valVolFrasco = safeFloat(volumen_por_frasco || volumen_por_frasco_ml, null);
    const valVolMuerto = safeFloat(volumen_muerto_residual || volumen_muerto_frasco_ml, null);
    const valConsumoInd = safeFloat(consumo_indicado, null);

    const valPruebasFrasco = safeFloat(pruebas_teoricas_frasco, (valVolFrasco && valConsumoInd) ? Math.floor(valVolFrasco / valConsumoInd) : null);
    const valPruebasCaja = safeFloat(pruebas_teoricas_caja, (valPruebasFrasco && valFrascosCaja) ? (valPruebasFrasco * valFrascosCaja) : null);
    const valVolTotalCaja = safeFloat(volumen_total_caja, (valVolFrasco && valFrascosCaja) ? (valVolFrasco * valFrascosCaja) : null);

    let parsedFechaVenc = null;
    if (fecha_vencimiento && String(fecha_vencimiento).trim() !== '') {
      const d = new Date(fecha_vencimiento);
      if (!isNaN(d.getTime())) parsedFechaVenc = d;
    }

    const query = `
      INSERT INTO items_inventario (
        codigo, nombre, descripcion, categoria, unidad, stock_actual,
        stock_minimo, stock_critico, proveedor, precio_costo, precio_venta,
        ubicacion, marca, fecha_vencimiento, activo, fecha_creacion, fecha_actualizacion,
        codigo_barra, referencia, referencia_abreviada, presentacion, grupo, panel, control_asociado, calibradores_asociados,
        unidad_manejo, cantidad_unidades, unidad_test, costo_unitario_manejo, aplica_iva, porcentaje_utilidad,
        stock_promedio, stock_maximo, unidad_negocio, equipo_asociado,
        consumo_indicado, consumo_real, desviacion_consumo,
        frascos_por_caja, volumen_por_frasco, volumen_muerto_residual, pruebas_teoricas_frasco, pruebas_teoricas_caja, volumen_total_caja
      ) 
      OUTPUT INSERTED.*
      VALUES (
        @codigo, @nombre, @descripcion, @categoria, @unidad, @qty,
        @stock_minimo, @stock_critico, @proveedor, @precio_costo, @precio_venta,
        @ubicacion, @marca, @parsedFechaVenc, 1, GETDATE(), GETDATE(),
        @codigo_barra, @referencia, @referencia_abreviada, @presentacion, @grupo, @panel, @control_asociado, @calibradores_asociados,
        @unidad_manejo, @qtyUnidades, @valUnidadTest, @costo_unitario_manejo, @isIva, @porcentaje_utilidad,
        @stock_promedio, @stock_maximo, @unidad_negocio, @equipo_asociado,
        @consumo_indicado, @consumo_real, @desviacion_consumo,
        @valFrascosCaja, @valVolFrasco, @valVolMuerto, @valPruebasFrasco, @valPruebasCaja, @valVolTotalCaja
      )
    `;

    const params = {
      codigo: codigo ? String(codigo).trim() : '',
      nombre: nombre ? String(nombre).trim() : '',
      descripcion: descripcion ? String(descripcion) : null,
      categoria: categoria ? String(categoria) : 'Reactivo',
      unidad: unidad ? String(unidad) : 'Frasco',
      qty: qty,
      stock_minimo: safeFloat(stock_minimo, 0),
      stock_critico: safeFloat(stock_critico, 0),
      proveedor: proveedor ? String(proveedor) : null,
      precio_costo: safeFloat(precio_costo, 0),
      precio_venta: safeFloat(precio_venta, 0),
      ubicacion: ubicacion ? String(ubicacion) : null,
      marca: marca ? String(marca) : null,
      parsedFechaVenc: parsedFechaVenc,
      codigo_barra: codigo_barra ? String(codigo_barra) : null,
      referencia: referencia ? String(referencia) : null,
      referencia_abreviada: referencia_abreviada ? String(referencia_abreviada) : null,
      presentacion: presentacion ? String(presentacion) : null,
      grupo: grupo ? String(grupo) : 'REACTIVO',
      panel: panel ? String(panel) : null,
      control_asociado: control_asociado ? String(control_asociado) : null,
      calibradores_asociados: calibradores_asociados ? String(calibradores_asociados) : null,
      unidad_manejo: unidad_manejo ? String(unidad_manejo) : 'UND',
      qtyUnidades: qtyUnidades,
      valUnidadTest: valUnidadTest,
      costo_unitario_manejo: safeFloat(costo_unitario_manejo, null),
      isIva: isIva,
      porcentaje_utilidad: safeFloat(porcentaje_utilidad, null),
      stock_promedio: safeFloat(stock_promedio, 0),
      stock_maximo: safeFloat(stock_maximo, 0),
      unidad_negocio: unidad_negocio ? String(unidad_negocio) : null,
      equipo_asociado: equipo_asociado ? String(equipo_asociado) : null,
      consumo_indicado: valConsumoInd,
      consumo_real: safeFloat(consumo_real, null),
      desviacion_consumo: safeFloat(desviacion_consumo, null),
      valFrascosCaja: valFrascosCaja,
      valVolFrasco: valVolFrasco,
      valVolMuerto: valVolMuerto,
      valPruebasFrasco: valPruebasFrasco,
      valPruebasCaja: valPruebasCaja,
      valVolTotalCaja: valVolTotalCaja
    };

    const inserted = await executeQuery(query, params);
    return inserted && inserted.length > 0 ? inserted[0] : null;
  }

  async update(id, data) {
    await ensureColumnsExist();
    const {
      codigo, nombre, descripcion, categoria, unidad,
      stock_minimo, stock_critico, proveedor, precio_costo, precio_venta,
      ubicacion, fecha_vencimiento, marca,
      codigo_barra, referencia, referencia_abreviada, presentacion, grupo, panel, control_asociado, calibradores_asociados,
      unidad_manejo, cantidad_unidades, unidad_test, costo_unitario_manejo, aplica_iva, porcentaje_utilidad,
      stock_promedio, stock_maximo, unidad_negocio, equipo_asociado,
      consumo_indicado, consumo_real, desviacion_consumo,
      frascos_por_caja, volumen_por_frasco, volumen_muerto_residual, volumen_por_frasco_ml, volumen_muerto_frasco_ml,
      pruebas_teoricas_frasco, pruebas_teoricas_caja, volumen_total_caja
    } = data;

    const itemId = parseInt(id, 10);
    const isIva = aplica_iva === true || aplica_iva === 'true' || aplica_iva === 'SI' ? 1 : 0;
    const valUnidadTest = safeFloat(unidad_test, 180);

    const valFrascosCaja = safeFloat(frascos_por_caja, 1);
    const valVolFrasco = safeFloat(volumen_por_frasco || volumen_por_frasco_ml, null);
    const valVolMuerto = safeFloat(volumen_muerto_residual || volumen_muerto_frasco_ml, null);
    const valConsumoInd = safeFloat(consumo_indicado, null);

    const valPruebasFrasco = safeFloat(pruebas_teoricas_frasco, (valVolFrasco && valConsumoInd) ? Math.floor(valVolFrasco / valConsumoInd) : null);
    const valPruebasCaja = safeFloat(pruebas_teoricas_caja, (valPruebasFrasco && valFrascosCaja) ? (valPruebasFrasco * valFrascosCaja) : null);
    const valVolTotalCaja = safeFloat(volumen_total_caja, (valVolFrasco && valFrascosCaja) ? (valVolFrasco * valFrascosCaja) : null);

    let parsedFechaVenc = null;
    if (fecha_vencimiento && String(fecha_vencimiento).trim() !== '') {
      const d = new Date(fecha_vencimiento);
      if (!isNaN(d.getTime())) parsedFechaVenc = d;
    }

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
        fecha_vencimiento = @parsedFechaVenc,
        fecha_actualizacion = GETDATE(),
        codigo_barra = @codigo_barra,
        referencia = @referencia,
        referencia_abreviada = @referencia_abreviada,
        presentacion = @presentacion,
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
        volumen_por_frasco = @valVolFrasco,
        volumen_muerto_residual = @valVolMuerto,
        pruebas_teoricas_frasco = @valPruebasFrasco,
        pruebas_teoricas_caja = @valPruebasCaja,
        volumen_total_caja = @valVolTotalCaja
      WHERE id = @itemId AND activo = 1
    `;

    const params = {
      itemId: itemId,
      codigo: codigo ? String(codigo).trim() : '',
      nombre: nombre ? String(nombre).trim() : '',
      descripcion: descripcion ? String(descripcion) : null,
      categoria: categoria ? String(categoria) : 'Reactivo',
      unidad: unidad ? String(unidad) : 'Frasco',
      stock_minimo: safeFloat(stock_minimo, 0),
      stock_critico: safeFloat(stock_critico, 0),
      proveedor: proveedor ? String(proveedor) : null,
      precio_costo: safeFloat(precio_costo, 0),
      precio_venta: safeFloat(precio_venta, 0),
      ubicacion: ubicacion ? String(ubicacion) : null,
      marca: marca ? String(marca) : null,
      parsedFechaVenc: parsedFechaVenc,
      codigo_barra: codigo_barra ? String(codigo_barra) : null,
      referencia: referencia ? String(referencia) : null,
      referencia_abreviada: referencia_abreviada ? String(referencia_abreviada) : null,
      presentacion: presentacion ? String(presentacion) : null,
      grupo: grupo ? String(grupo) : 'REACTIVO',
      panel: panel ? String(panel) : null,
      control_asociado: control_asociado ? String(control_asociado) : null,
      calibradores_asociados: calibradores_asociados ? String(calibradores_asociados) : null,
      unidad_manejo: unidad_manejo ? String(unidad_manejo) : 'UND',
      qtyUnidades: safeFloat(cantidad_unidades, 1),
      valUnidadTest: valUnidadTest,
      costo_unitario_manejo: safeFloat(costo_unitario_manejo, null),
      isIva: isIva,
      porcentaje_utilidad: safeFloat(porcentaje_utilidad, null),
      stock_promedio: safeFloat(stock_promedio, 0),
      stock_maximo: safeFloat(stock_maximo, 0),
      unidad_negocio: unidad_negocio ? String(unidad_negocio) : null,
      equipo_asociado: equipo_asociado ? String(equipo_asociado) : null,
      consumo_indicado: valConsumoInd,
      consumo_real: safeFloat(consumo_real, null),
      desviacion_consumo: safeFloat(desviacion_consumo, null),
      valFrascosCaja: valFrascosCaja,
      valVolFrasco: valVolFrasco,
      valVolMuerto: valVolMuerto,
      valPruebasFrasco: valPruebasFrasco,
      valPruebasCaja: valPruebasCaja,
      valVolTotalCaja: valVolTotalCaja
    };

    const result = await executeQuery(query, params);
    return result;
  }

  async delete(id) {
    return prisma.itemInventario.update({
      where: { id: parseInt(id, 10) },
      data: { activo: false }
    });
  }
}

module.exports = new InventoryRepository();
