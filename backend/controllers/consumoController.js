// consumoController.js - VERSIÓN REAL CON TUS TABLAS
const { ConnectionPool } = require('mssql');

class SistemaConsumoReal {
    constructor(pool) {
        this.pool = pool;
    }

    /**
     * 🎯 MÉTODO PRINCIPAL: PROCESAR TODOS LOS EXAMENES PENDIENTES
     */
    async procesarTodosExamenesPendientes() {
        console.log('🚀 Iniciando procesamiento de exámenes pendientes...');
        
        // 1. OBTENER EXAMENES NO PROCESADOS
        const examenes = await this.obtenerExamenesPendientes();
        console.log(`📊 Exámenes pendientes: ${examenes.length}`);
        
        const resultados = [];
        
        // 2. PROCESAR CADA EXAMEN
        for (const examen of examenes) {
            console.log(`\n🔍 Procesando: ${examen.examen_nombre} (${examen.cantidad} pruebas)`);
            
            try {
                const resultadoExamen = await this.procesarExamenIndividual(examen);
                resultados.push(resultadoExamen);
                
                console.log(`✅ ${examen.examen_nombre}: ${resultadoExamen.consumidoTotal}ml consumidos`);
                
            } catch (error) {
                console.error(`❌ Error en ${examen.examen_nombre}:`, error.message);
                resultados.push({
                    examen: examen.examen_nombre,
                    error: error.message,
                    success: false
                });
            }
        }
        
        // 3. GENERAR REPORTE FINAL
        const reporte = await this.generarReporteConsumo(resultados);
        
        return {
            success: true,
            message: `Procesados ${resultados.filter(r => r.success).length} de ${examenes.length} exámenes`,
            data: {
                totalExamenes: examenes.length,
                procesadosExitosos: resultados.filter(r => r.success).length,
                conErrores: resultados.filter(r => !r.success).length,
                detalle: resultados,
                reporte: reporte
            }
        };
    }

    /**
     * 📋 1. OBTENER EXAMENES PENDIENTES
     */
    async obtenerExamenesPendientes() {
        const query = `
            SELECT TOP 50
                id,
                fecha,
                examen_nombre,
                cantidad,
                fuente,
                fecha_importacion
            FROM tmp_importacion_examenes
            WHERE procesado = 0
                AND cantidad > 0
            ORDER BY fecha ASC, id ASC
        `;
        
        const result = await this.pool.request().query(query);
        return result.recordset;
    }

    /**
     * 🧪 2. PROCESAR EXAMEN INDIVIDUAL
     */
    async procesarExamenIndividual(examen) {
        const transaction = await this.pool.transaction();
        
        try {
            await transaction.begin();
            
            // A. BUSCAR REACTIVO EN MAPEO
            const mapeo = await this.buscarMapeoReactivo(examen.examen_nombre, transaction);
            
            if (!mapeo) {
                throw new Error(`No hay mapeo para: ${examen.examen_nombre}`);
            }
            
            console.log(`   🧪 Reactivo: ${mapeo.reactivo_id}, Consumo: ${mapeo.consumo_por_prueba}ml por prueba`);
            
            // B. CALCULAR CANTIDAD TOTAL NECESARIA
            const cantidadTotalNecesaria = examen.cantidad * mapeo.consumo_por_prueba;
            console.log(`   📐 Necesario: ${examen.cantidad} pruebas × ${mapeo.consumo_por_prueba}ml = ${cantidadTotalNecesaria}ml`);
            
            // C. BUSCAR LOTES DISPONIBLES (FIFO)
            const lotesConsumidos = await this.consumirDeLotes(
                mapeo.reactivo_id,
                cantidadTotalNecesaria,
                transaction
            );
            
            // D. ACTUALIZAR INVENTARIO (si existe la tabla)
            await this.actualizarInventarioReactivo(
                mapeo.reactivo_id,
                cantidadTotalNecesaria,
                transaction
            );
            
            // E. MARCAR EXAMEN COMO PROCESADO
            await this.marcarExamenProcesado(examen.id, transaction);
            
            // F. REGISTRAR EN BITÁCORA
            await this.registrarBitacoraConsumo(
                examen,
                mapeo,
                cantidadTotalNecesaria,
                lotesConsumidos,
                transaction
            );
            
            await transaction.commit();
            
            return {
                success: true,
                examen: examen.examen_nombre,
                cantidadPruebas: examen.cantidad,
                reactivoId: mapeo.reactivo_id,
                consumoPorPrueba: mapeo.consumo_por_prueba,
                consumidoTotal: cantidadTotalNecesaria,
                lotesUtilizados: lotesConsumidos,
                fecha: examen.fecha
            };
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * 🔍 3. BUSCAR REACTIVO EN MAPEO
     */
    async buscarMapeoReactivo(nombreExamen, transaction) {
        // Buscar por nombre exacto o por patrón
        const query = `
            SELECT TOP 1
                id,
                nombre_prueba,
                reactivo_id,
                consumo_por_prueba,
                categoria_reactivo
            FROM mapeo_pruebas_reactivos
            WHERE activo = 1
                AND (
                    -- Buscar por nombre exacto
                    nombre_prueba LIKE @nombreExamen
                    OR
                    -- Buscar en patrones
                    @nombreExamen LIKE CONCAT('%', patron_busqueda, '%')
                    OR patron_busqueda LIKE CONCAT('%', @nombreExamen, '%')
                )
            ORDER BY prioridad ASC
        `;
        
        const request = transaction.request();
        request.input('nombreExamen', `%${nombreExamen}%`);
        
        const result = await request.query(query);
        
        if (result.recordset.length === 0) {
            // Intentar búsqueda más flexible
            const queryFlexible = `
                SELECT TOP 1 *
                FROM mapeo_pruebas_reactivos
                WHERE activo = 1
                    AND (
                        @nombreExamen LIKE CONCAT('%', nombre_prueba, '%')
                        OR nombre_prueba LIKE CONCAT('%', @nombreExamen, '%')
                    )
            `;
            
            const requestFlex = transaction.request();
            requestFlex.input('nombreExamen', nombreExamen);
            const resultFlex = await requestFlex.query(queryFlexible);
            
            if (resultFlex.recordset.length > 0) {
                console.log(`   🔍 Mapeo encontrado (búsqueda flexible): ${resultFlex.recordset[0].nombre_prueba}`);
                return resultFlex.recordset[0];
            }
            
            return null;
        }
        
        console.log(`   🔍 Mapeo encontrado: ${result.recordset[0].nombre_prueba}`);
        return result.recordset[0];
    }

    /**
     * 💰 4. CONSUMIR DE LOTES (FIFO)
     */
    async consumirDeLotes(reactivoId, cantidadNecesaria, transaction) {
        console.log(`   📦 Buscando lotes para reactivo ${reactivoId}...`);
        
        // Obtener lotes ordenados por FIFO (FechaFabricación más antigua primero)
        const queryLotes = `
            SELECT 
                Id,
                NumeroLote,
                CantidadActual,
                ConsumoPorPrueba,
                FechaFabricacion,
                FechaVencimiento,
                Estado
            FROM LotesReactivos
            WHERE InventarioId = @reactivoId
                AND Estado = 'Activo'
                AND CantidadActual > 0
                AND FechaVencimiento > GETDATE()
            ORDER BY 
                FechaFabricacion ASC,  -- FIFO
                FechaVencimiento ASC   -- Los que vencen primero
        `;
        
        const request = transaction.request();
        request.input('reactivoId', reactivoId);
        const result = await request.query(queryLotes);
        
        if (result.recordset.length === 0) {
            throw new Error(`No hay lotes disponibles para reactivo ${reactivoId}`);
        }
        
        let cantidadRestante = cantidadNecesaria;
        const lotesConsumidos = [];
        
        console.log(`   📊 Lotes disponibles: ${result.recordset.length}`);
        
        for (const lote of result.recordset) {
            if (cantidadRestante <= 0) break;
            
            const cantidadDisponible = parseFloat(lote.CantidadActual);
            const cantidadAConsumir = Math.min(cantidadDisponible, cantidadRestante);
            
            console.log(`   🏷️  Lote ${lote.NumeroLote}: ${cantidadDisponible}ml disponible, consumiendo ${cantidadAConsumir}ml`);
            
            // Descontar del lote
            const nuevaCantidad = cantidadDisponible - cantidadAConsumir;
            
            const updateQuery = `
                UPDATE LotesReactivos 
                SET 
                    CantidadActual = @nuevaCantidad,
                    PruebasRestantes = FLOOR(@nuevaCantidad / NULLIF(ConsumoPorPrueba, 0)),
                    FechaActualizacion = GETDATE(),
                    Estado = CASE 
                        WHEN @nuevaCantidad <= 0 THEN 'Agotado'
                        WHEN @nuevaCantidad <= (ConsumoPorPrueba * 10) THEN 'Bajo Stock'
                        ELSE 'Activo'
                    END,
                    Rendimiento = CASE 
                        WHEN CantidadInicial > 0 
                        THEN ((CantidadInicial - @nuevaCantidad) / CantidadInicial) * 100
                        ELSE 0
                    END
                WHERE Id = @loteId
            `;
            
            const updateRequest = transaction.request();
            updateRequest.input('loteId', lote.Id);
            updateRequest.input('nuevaCantidad', nuevaCantidad);
            await updateRequest.query(updateQuery);
            
            lotesConsumidos.push({
                loteId: lote.Id,
                numeroLote: lote.NumeroLote,
                cantidadConsumida: cantidadAConsumir,
                cantidadRestante: nuevaCantidad,
                fechaVencimiento: lote.FechaVencimiento,
                estadoNuevo: nuevaCantidad <= 0 ? 'Agotado' : 
                           nuevaCantidad <= (lote.ConsumoPorPrueba * 10) ? 'Bajo Stock' : 'Activo'
            });
            
            cantidadRestante -= cantidadAConsumir;
        }
        
        if (cantidadRestante > 0) {
            throw new Error(`Stock insuficiente. Faltan ${cantidadRestante}ml para completar el consumo`);
        }
        
        console.log(`   ✅ Consumo completado: ${cantidadNecesaria}ml de ${lotesConsumidos.length} lotes`);
        return lotesConsumidos;
    }

    /**
     * 📊 5. ACTUALIZAR INVENTARIO REACTIVO
     */
    async actualizarInventarioReactivo(reactivoId, cantidadConsumida, transaction) {
        // Primero verificar si existe la tabla inventario_reactivos
        const checkTableQuery = `
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'inventario_reactivos'
        `;
        
        const checkResult = await transaction.request().query(checkTableQuery);
        
        if (checkResult.recordset.length > 0) {
            // Si existe la tabla, actualizar
            const updateQuery = `
                UPDATE inventario_reactivos 
                SET 
                    StockActual = StockActual - @cantidadConsumida,
                    FechaUltimoConsumo = GETDATE(),
                    Estado = CASE 
                        WHEN (StockActual - @cantidadConsumida) <= StockMinimo 
                        THEN 'Bajo Stock' 
                        ELSE 'Activo' 
                    END
                WHERE Id = @reactivoId
            `;
            
            const request = transaction.request();
            request.input('reactivoId', reactivoId);
            request.input('cantidadConsumida', cantidadConsumida);
            await request.query(updateQuery);
            
            console.log(`   📊 Inventario actualizado para reactivo ${reactivoId}`);
        }
    }

    /**
     * ✅ 6. MARCAR EXAMEN COMO PROCESADO
     */
    async marcarExamenProcesado(examenId, transaction) {
        const query = `
            UPDATE tmp_importacion_examenes 
            SET 
                procesado = 1,
                fecha_procesamiento = GETDATE()
            WHERE id = @examenId
        `;
        
        const request = transaction.request();
        request.input('examenId', examenId);
        await request.query(query);
        
        console.log(`   ✅ Examen ${examenId} marcado como procesado`);
    }

    /**
     * 📝 7. REGISTRAR EN BITÁCORA
     */
    async registrarBitacoraConsumo(examen, mapeo, cantidadTotal, lotesConsumidos, transaction) {
        // Crear tabla de bitácora si no existe
        const createTableQuery = `
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='bitacora_consumos' AND xtype='U')
            CREATE TABLE bitacora_consumos (
                id INT IDENTITY(1,1) PRIMARY KEY,
                examen_id INT NOT NULL,
                examen_nombre VARCHAR(255),
                reactivo_id INT,
                cantidad_total DECIMAL(10,4),
                fecha_consumo DATETIME DEFAULT GETDATE(),
                lotes_utilizados INT,
                detalle_lotes NVARCHAR(MAX),
                cantidad_pruebas INT
            )
        `;
        
        await transaction.request().query(createTableQuery);
        
        // Insertar registro
        const insertQuery = `
            INSERT INTO bitacora_consumos 
            (examen_id, examen_nombre, reactivo_id, cantidad_total, 
             lotes_utilizados, detalle_lotes, cantidad_pruebas)
            VALUES (@examenId, @examenNombre, @reactivoId, @cantidadTotal,
                    @lotesUtilizados, @detalleLotes, @cantidadPruebas)
        `;
        
        const request = transaction.request();
        request.input('examenId', examen.id);
        request.input('examenNombre', examen.examen_nombre);
        request.input('reactivoId', mapeo.reactivo_id);
        request.input('cantidadTotal', cantidadTotal);
        request.input('lotesUtilizados', lotesConsumidos.length);
        request.input('detalleLotes', JSON.stringify(lotesConsumidos));
        request.input('cantidadPruebas', examen.cantidad);
        
        await request.query(insertQuery);
        
        console.log(`   📝 Registrado en bitácora`);
    }

    /**
     * 📈 8. GENERAR REPORTE DE CONSUMO
     */
    async generarReporteConsumo(resultados) {
        const exitosos = resultados.filter(r => r.success);
        
        const resumen = {
            totalExamenes: resultados.length,
            exitosos: exitosos.length,
            conErrores: resultados.length - exitosos.length,
            totalConsumido: exitosos.reduce((sum, r) => sum + r.consumidoTotal, 0),
            reactivosUtilizados: [...new Set(exitosos.map(r => r.reactivoId))],
            fechaInicio: new Date().toISOString(),
            fechaFin: new Date().toISOString()
        };
        
        // Actualizar estadísticas en tabla de reportes
        const updateStatsQuery = `
            INSERT INTO reportes_consumo_diario 
            (fecha, total_examenes, total_ml_consumidos, reactivos_utilizados)
            VALUES (GETDATE(), @totalExamenes, @totalConsumido, @reactivosUtilizados)
        `;
        
        try {
            const request = this.pool.request();
            request.input('totalExamenes', resumen.totalExamenes);
            request.input('totalConsumido', resumen.totalConsumido);
            request.input('reactivosUtilizados', resumen.reactivosUtilizados.join(','));
            await request.query(updateStatsQuery);
        } catch (error) {
            // Si la tabla no existe, continuar sin errores
            console.log('Tabla de reportes no encontrada, continuando...');
        }
        
        return resumen;
    }

    /**
     * 🔍 9. VERIFICAR STOCK ANTES DE PROCESAR
     */
    async verificarStockDisponible() {
        const query = `
            SELECT 
                mpr.nombre_prueba,
                mpr.reactivo_id,
                mpr.consumo_por_prueba,
                SUM(tie.cantidad) as pruebas_pendientes,
                SUM(tie.cantidad * mpr.consumo_por_prueba) as ml_necesarios,
                COALESCE(SUM(lr.CantidadActual), 0) as stock_disponible_ml,
                CASE 
                    WHEN COALESCE(SUM(lr.CantidadActual), 0) >= SUM(tie.cantidad * mpr.consumo_por_prueba)
                    THEN 'SUFICIENTE'
                    ELSE 'INSUFICIENTE'
                END as estado_stock
            FROM tmp_importacion_examenes tie
            INNER JOIN mapeo_pruebas_reactivos mpr ON 
                tie.examen_nombre LIKE CONCAT('%', mpr.nombre_prueba, '%')
                OR mpr.nombre_prueba LIKE CONCAT('%', tie.examen_nombre, '%')
            LEFT JOIN LotesReactivos lr ON mpr.reactivo_id = lr.InventarioId
                AND lr.Estado = 'Activo'
                AND lr.CantidadActual > 0
                AND lr.FechaVencimiento > GETDATE()
            WHERE tie.procesado = 0
                AND mpr.activo = 1
            GROUP BY mpr.nombre_prueba, mpr.reactivo_id, mpr.consumo_por_prueba
            ORDER BY estado_stock ASC, ml_necesarios DESC
        `;
        
        const result = await this.pool.request().query(query);
        return result.recordset;
    }
}

module.exports = SistemaConsumoReal;