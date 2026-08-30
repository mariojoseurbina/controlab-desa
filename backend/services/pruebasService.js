const { sql, getPool, executeTransaction } = require('../config/db');
const XLSX = require('xlsx');
const fs = require('fs');

class PruebasService {
  async procesarArchivoExcel(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    return jsonData
      .filter(row => row.length >= 2 && row[0] && row[1])
      .map(row => ({
        nombre_prueba: row[0].toString().trim(),
        cantidad: parseInt(row[1]) || 0
      }))
      .filter(prueba => prueba.cantidad > 0);
  }

  agruparPruebas(pruebas) {
    return pruebas.reduce((agrupado, prueba) => {
      if (!agrupado[prueba.nombre_prueba]) {
        agrupado[prueba.nombre_prueba] = 0;
      }
      agrupado[prueba.nombre_prueba] += prueba.cantidad;
      return agrupado;
    }, {});
  }

  async procesarTipoPrueba(nombrePrueba, cantidadTotal, usuarioId, transaction) {
    // 1. Buscar mapeo
    const mapeoResult = await transaction.request()
      .input('nombre_external', sql.VarChar(255), nombrePrueba)
      .query(`
        SELECT mp.codigo_kit, kp.id, kp.nombre_kit 
        FROM examen_kit_vinculo mp
        INNER JOIN kits_prueba kp ON mp.codigo_kit = kp.codigo_kit
        WHERE mp.examen_nombre = @nombre_external AND kp.activo = 1
      `);

    if (mapeoResult.recordset.length === 0) {
      throw new Error(`No se encontró mapeo para: ${nombrePrueba}`);
    }

    const { id: idKit, codigo_kit: codigoKit, nombre_kit: nombreKit } = mapeoResult.recordset[0];

    // 2. Obtener reactivos del kit
    const reactivosResult = await transaction.request()
      .input('id_kit', sql.Int, idKit)
      .query(`
        SELECT kr.id_reactivo, kr.cantidad_utilizada, kr.unidad, kr.es_obligatorio,
               ii.nombre as nombre_reactivo, ii.stock_actual, ii.unidad as unidad_stock
        FROM kit_reactivos kr
        INNER JOIN items_inventario ii ON kr.id_reactivo = ii.id
        WHERE kr.id_kit = @id_kit ORDER BY kr.orden
      `);

    if (reactivosResult.recordset.length === 0) {
      throw new Error(`El kit ${codigoKit} no tiene reactivos configurados`);
    }

    // 3. Validar capacidad
    for (const reactivo of reactivosResult.recordset) {
      if (reactivo.es_obligatorio) {
        const cantidadNecesaria = reactivo.cantidad_utilizada * cantidadTotal;
        if (reactivo.stock_actual < cantidadNecesaria) {
          throw new Error(
            `Stock insuficiente de ${reactivo.nombre_reactivo}. Necesario: ${cantidadNecesaria} ${reactivo.unidad}, Disponible: ${reactivo.stock_actual} ${reactivo.unidad_stock}`
          );
        }
      }
    }

    // 4. Registrar prueba
    const pruebaResult = await transaction.request()
      .input('id_kit', sql.Int, idKit)
      .input('cantidad', sql.Int, cantidadTotal)
      .input('observaciones', sql.VarChar(500), `Importación masiva: ${nombrePrueba}`)
      .input('usuario_id', sql.Int, usuarioId)
      .query(`
        INSERT INTO pruebas_realizadas (id_kit, cantidad, observaciones, usuario_id)
        OUTPUT INSERTED.id
        VALUES (@id_kit, @cantidad, @observaciones, @usuario_id)
      `);

    const idPruebaRealizada = pruebaResult.recordset[0].id;

    // 5. Descontar reactivos
    for (const reactivo of reactivosResult.recordset) {
      const cantidadTotalDescontar = reactivo.cantidad_utilizada * cantidadTotal;
      
      await transaction.request()
        .input('id_reactivo', sql.Int, reactivo.id_reactivo)
        .input('cantidad', sql.Decimal(10, 3), cantidadTotalDescontar)
        .query(`UPDATE items_inventario SET stock_actual = stock_actual - @cantidad WHERE id = @id_reactivo`);

      await transaction.request()
        .input('id_item', sql.Int, reactivo.id_reactivo)
        .input('cantidad', sql.Decimal(10, 3), cantidadTotalDescontar)
        .input('referencia', sql.VarChar(500), `Prueba masiva #${idPruebaRealizada}`)
        .input('usuario_id', sql.Int, usuarioId)
        .query(`
          INSERT INTO movimientos_inventario (item_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, motivo, referencia, fecha_movimiento, creado_por)
          VALUES (@id_item, 'CONSUMO', @cantidad, 0, 0, 'Consumo por prueba masiva', @referencia, GETDATE(), @usuario_id)
        `);
    }

    return { id: idPruebaRealizada, nombre_prueba: nombrePrueba, kit: codigoKit, nombre_kit: nombreKit, cantidad: cantidadTotal, reactivos_utilizados: reactivosResult.recordset.length };
  }

  async ejecutarImportacionMasiva(filePath, usuarioId) {
    return await executeTransaction(async (transaction) => {
      const pruebas = await this.procesarArchivoExcel(filePath);
      const pruebasAgrupadas = this.agruparPruebas(pruebas);
      
      const resultados = { exitosas: 0, errores: [], totalPruebas: 0, pruebasProcesadas: [] };

      for (const [nombrePrueba, cantidadTotal] of Object.entries(pruebasAgrupadas)) {
        try {
          const resultado = await this.procesarTipoPrueba(nombrePrueba, cantidadTotal, usuarioId, transaction);
          resultados.exitosas++;
          resultados.totalPruebas += cantidadTotal;
          resultados.pruebasProcesadas.push(resultado);
        } catch (error) {
          resultados.errores.push({ prueba: nombrePrueba, cantidad: cantidadTotal, error: error.message });
        }
      }
      return resultados;
    });
  }

  async obtenerCapacidadKit(codigo_kit) {
    const pool = await getPool();
    const result = await pool.request()
      .input('codigo_kit', sql.VarChar(50), codigo_kit)
      .query(`
        SELECT 
          kp.id, kp.codigo_kit, kp.nombre_kit, kr.id_reactivo, kr.cantidad_utilizada,
          ii.nombre as nombre_reactivo, ii.stock_actual, ii.unidad,
          FLOOR(ii.stock_actual / kr.cantidad_utilizada) as capacidad_reactivo
        FROM kits_prueba kp
        INNER JOIN kit_reactivos kr ON kp.id = kr.id_kit
        INNER JOIN items_inventario ii ON kr.id_reactivo = ii.id
        WHERE kp.codigo_kit = @codigo_kit AND kp.activo = 1 AND kr.es_obligatorio = 1
        ORDER BY capacidad_reactivo ASC
      `);

    if (result.recordset.length === 0) {
      throw new Error('Kit no encontrado o sin reactivos configurados');
    }

    const capacidad = Math.min(...result.recordset.map(r => r.capacidad_reactivo));
    const reactivoLimitante = result.recordset.find(r => r.capacidad_reactivo === capacidad);

    return { capacidad, reactivo_limitante: reactivoLimitante, detalles: result.recordset };
  }

  async obtenerHistorial(fecha_inicio, fecha_fin, page = 1, limit = 50) {
    const pool = await getPool();
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT pr.id, pr.fecha_realizacion, kp.codigo_kit, kp.nombre_kit, pr.cantidad, pr.observaciones, pr.usuario_id
      FROM pruebas_realizadas pr
      INNER JOIN kits_prueba kp ON pr.id_kit = kp.id
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM pruebas_realizadas pr WHERE 1=1';
    
    const request = pool.request();
    const countRequest = pool.request();

    if (fecha_inicio) {
      query += ' AND pr.fecha_realizacion >= @fecha_inicio';
      countQuery += ' AND pr.fecha_realizacion >= @fecha_inicio';
      request.input('fecha_inicio', sql.Date, fecha_inicio);
      countRequest.input('fecha_inicio', sql.Date, fecha_inicio);
    }
    if (fecha_fin) {
      query += ' AND pr.fecha_realizacion <= @fecha_fin';
      countQuery += ' AND pr.fecha_realizacion <= @fecha_fin';
      request.input('fecha_fin', sql.Date, fecha_fin);
      countRequest.input('fecha_fin', sql.Date, fecha_fin);
    }

    query += ' ORDER BY pr.fecha_realizacion DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY';
    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, parseInt(limit));

    const [result, countResult] = await Promise.all([request.query(query), countRequest.query(countQuery)]);
    const total = countResult.recordset[0].total;

    return {
      pruebas: result.recordset,
      paginacion: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    };
  }

  async procesarPruebaIndividual(codigo_kit, cantidad, observaciones, usuarioId) {
    return await executeTransaction(async (transaction) => {
      throw new Error('Función procesarPruebaIndividual no implementada en la BD original');
    });
  }
}

module.exports = new PruebasService();
