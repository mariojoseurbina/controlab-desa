const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const sql = require('mssql');
const router = express.Router();

// Configurar multer para subida de archivos
const upload = multer({ dest: 'uploads/' });

const { dbConfig } = require('../config/db');

// ✅ ENDPOINT EXISTENTE - MANTENER
router.get('/', async (req, res) => {
  try {    
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`
      SELECT * FROM items_inventario WHERE categoria = 'Reactivo' OR categoria = 'reactivo'
    `);
    
    res.json({
      success: true,
      reactivos: result.recordset
    });
  } catch (error) {
    console.error('Error obteniendo reactivos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener reactivos',
      error: error.message
    });
  }
});

// 🧪 ENDPOINT DE IMPORTACIÓN MASIVA - SIN TRANSACCIONES
router.post('/importar-pruebas-masivas', upload.single('archivo'), async (req, res) => {
  let pool;
  
  try {
    console.log('🚀 Iniciando importación masiva...');
    
    let datos = [];
    const porcentajeMerma = req.body.porcentajeMerma ? parseFloat(req.body.porcentajeMerma) : 0;
    const factorMerma = 1 + (porcentajeMerma / 100);
    
    // OPCIÓN 1: Si viene archivo Excel, procesarlo
    if (req.file) {
      console.log('📊 Procesando archivo Excel:', req.file.originalname);
      
      try {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Leer datos del Excel
        const datosCrudos = XLSX.utils.sheet_to_json(worksheet);
        console.log('📋 Datos crudos del Excel:', datosCrudos);

        // Procesar datos
        datos = datosCrudos.map((fila, index) => {
          try {
            const lote = (fila.lote || fila.Lote || fila.numero_lote || '').toString().trim();
            const pruebas = parseInt(fila.pruebas || fila.Pruebas || fila.cantidad_pruebas || 0);
            const tipo_prueba = fila.tipo_prueba || fila.TipoPrueba || 'Hematología';
            
            // Manejo simple de fechas
            let fecha = fila.fecha || fila.Fecha;
            if (typeof fecha === 'number') {
              // Conversión básica de fecha Excel
              const baseDate = new Date(1900, 0, 1);
              const excelDate = new Date(baseDate.getTime() + (fecha - 1) * 24 * 60 * 60 * 1000);
              fecha = excelDate.toISOString().split('T')[0];
            } else if (!fecha) {
              fecha = new Date().toISOString().split('T')[0];
            }

            if (!lote || isNaN(pruebas) || pruebas <= 0) {
              console.warn(`⚠️ Fila ${index + 1} ignorada: Lote="${lote}", Pruebas="${pruebas}"`);
              return null;
            }

            return {
              lote: lote,
              pruebas: pruebas,
              tipo_prueba: tipo_prueba,
              fecha: fecha
            };
          } catch (error) {
            console.error(`❌ Error en fila ${index + 1}:`, error);
            return null;
          }
        }).filter(item => item !== null);

        console.log(`✅ Datos procesados: ${datos.length} registros válidos`);
        
        // Limpiar archivo temporal
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        
        if (datos.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'El archivo Excel no contiene datos válidos'
          });
        }

      } catch (excelError) {
        console.error('❌ Error procesando Excel:', excelError);
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: 'Error procesando archivo Excel: ' + excelError.message
        });
      }
    }
    // OPCIÓN 2: Si vienen datos JSON
    else if (req.body.datos) {
      console.log('📋 Procesando datos JSON del body');
      datos = typeof req.body.datos === 'string' ? JSON.parse(req.body.datos) : req.body.datos;
    }
    else {
      return res.status(400).json({
        success: false,
        message: 'No se proporcionó archivo Excel ni datos JSON'
      });
    }

    // FILTRAR DATOS VÁLIDOS
    const datosValidos = datos.filter(item => 
      item && item.lote && !isNaN(item.pruebas) && item.pruebas > 0
    );

    if (datosValidos.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No hay datos válidos para procesar' 
      });
    }

    console.log(`🔧 Procesando ${datosValidos.length} registros válidos`);

    // CONEXIÓN A BD
    pool = await sql.connect(dbConfig);
    console.log('✅ Conectado a BD');

    // 🆕 SOLUCIÓN: SIN TRANSACCIONES - PROCESAMIENTO DIRECTO
    
    // 1. Registrar la importación
    const importacionResult = await pool.request()
      .input('NombreArchivo', sql.NVarChar, req.file ? req.file.originalname : 'Datos Manuales')
      .input('TotalRegistros', sql.Int, datosValidos.length)
      .input('UsuarioId', sql.Int, 1)
      .input('Estado', sql.NVarChar, 'procesando')
      .query(`
        INSERT INTO ImportacionesPruebas 
        (NombreArchivo, TotalRegistros, UsuarioId, Estado, FechaImportacion)
        OUTPUT INSERTED.Id
        VALUES (@NombreArchivo, @TotalRegistros, @UsuarioId, @Estado, GETDATE())
      `);

    const importacionId = importacionResult.recordset[0].Id;
    console.log(`🆕 Importación creada con ID: ${importacionId}`);

    let totalPruebas = 0;
    let totalReactivoConsumido = 0;
    const resultados = [];
    const errores = [];

    // 2. Procesar cada registro individualmente SIN TRANSACCIONES
    for (let [index, prueba] of datosValidos.entries()) {
      try {
        console.log(`🔍 Procesando ${index + 1}/${datosValidos.length}: ${prueba.lote}`);
        
        // Buscar lote
        const loteInfo = await pool.request()
          .input('NumeroLote', sql.NVarChar, prueba.lote)
          .query(`
            SELECT 
              Id,
              NumeroLote,
              CantidadActual,
              ConsumoPorPrueba,
              PorcentajeMerma
            FROM LotesReactivos 
            WHERE NumeroLote = @NumeroLote 
              AND Estado = 'Activo'
              AND FechaVencimiento > GETDATE()
          `);

        if (loteInfo.recordset.length === 0) {
          errores.push(`Lote "${prueba.lote}" no encontrado o inactivo`);
          continue;
        }

        const loteData = loteInfo.recordset[0];
        // Aplicar el factor de merma paramétrico del lote (si existe) + merma global (si la enviaron)
        const loteMerma = parseFloat(loteData.PorcentajeMerma || 0);
        const factorMermaLote = 1 + (loteMerma / 100);
        const consumoTeorico = prueba.pruebas * (loteData.ConsumoPorPrueba || 1);
        const reactivoConsumido = consumoTeorico * factorMerma * factorMermaLote;

        // Verificar stock
        if (loteData.CantidadActual < reactivoConsumido) {
          errores.push(`Stock insuficiente en ${prueba.lote}. Disponible: ${loteData.CantidadActual}, Requerido: ${reactivoConsumido}`);
          continue;
        }

        // 🆕 ACTUALIZAR INVENTARIO SIN TRANSACCIÓN
        await pool.request()
          .input('LoteId', sql.Int, loteData.Id)
          .input('ReactivoConsumido', sql.Decimal(18, 4), reactivoConsumido)
          .query(`
            UPDATE LotesReactivos 
            SET CantidadActual = CantidadActual - @ReactivoConsumido,
                FechaActualizacion = GETDATE()
            WHERE Id = @LoteId
          `);

        // 🆕 INSERTAR DETALLE SIN TRANSACCIÓN
        await pool.request()
          .input('ImportacionId', sql.Int, importacionId)
          .input('LoteId', sql.Int, loteData.Id)
          .input('PruebasRealizadas', sql.Int, prueba.pruebas)
          .input('ReactivoConsumido', sql.Decimal(18, 4), reactivoConsumido)
          .input('FechaPrueba', sql.Date, prueba.fecha)
          .input('TipoPrueba', sql.NVarChar, prueba.tipo_prueba)
          .input('Estado', sql.NVarChar, 'completado')
          .query(`
            INSERT INTO DetalleImportacionPruebas 
            (ImportacionId, LoteId, PruebasRealizadas, ReactivoConsumido, FechaPrueba, TipoPrueba, Estado)
            VALUES (@ImportacionId, @LoteId, @PruebasRealizadas, @ReactivoConsumido, @FechaPrueba, @TipoPrueba, @Estado)
          `);

        // Registrar éxito
        totalPruebas += prueba.pruebas;
        totalReactivoConsumido += reactivoConsumido;
        
        resultados.push({
          lote: prueba.lote,
          pruebasRealizadas: prueba.pruebas,
          reactivoConsumido: reactivoConsumido,
          pruebasRestantesAntes: loteData.CantidadActual,
          pruebasRestantesDespues: loteData.CantidadActual - reactivoConsumido
        });

        console.log(`✅ ${prueba.lote} procesado: ${prueba.pruebas} pruebas`);

      } catch (error) {
        console.error(`❌ Error procesando ${prueba.lote}:`, error.message);
        errores.push(`${prueba.lote}: ${error.message}`);
      }
    }

    // 3. Actualizar estado final de la importación
    const estado = resultados.length > 0 ? (errores.length > 0 ? 'parcial' : 'completado') : 'error';
    
    await pool.request()
      .input('ImportacionId', sql.Int, importacionId)
      .input('TotalPruebas', sql.Int, totalPruebas)
      .input('TotalReactivosConsumidos', sql.Decimal(18, 4), totalReactivoConsumido)
      .input('Estado', sql.NVarChar, estado)
      .input('Comentarios', sql.NVarChar, errores.length > 0 ? `Éxitos: ${resultados.length}, Errores: ${errores.length}` : 'Importación exitosa')
      .query(`
        UPDATE ImportacionesPruebas 
        SET TotalPruebas = @TotalPruebas,
            TotalReactivosConsumidos = @TotalReactivosConsumidos,
            Estado = @Estado,
            Comentarios = @Comentarios
        WHERE Id = @ImportacionId
      `);

    console.log(`✅ Importación ${importacionId} finalizada: ${resultados.length} exitosos, ${errores.length} errores`);

    // Respuesta final
    if (resultados.length > 0) {
      res.json({
        success: true,
        message: `Procesados ${resultados.length} registros exitosamente${errores.length > 0 ? ` con ${errores.length} errores` : ''}`,
        resumen: {
          registrosProcesados: resultados.length,
          totalPruebasProcesadas: totalPruebas,
          registrosConError: errores.length,
          importacionId: importacionId
        },
        resultados: resultados,
        errores: errores
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Ningún registro pudo ser procesado',
        errores: errores
      });
    }

  } catch (error) {
    console.error('❌ Error general en importación:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor',
      error: error.message
    });
  } finally {
    if (pool) {
      try {
        await pool.close();
        console.log('🔒 Conexión a BD cerrada');
      } catch (closeError) {
        console.error('Error cerrando conexión:', closeError);
      }
    }
  }
});

module.exports = router;