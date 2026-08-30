const { sql, getPool } = require('../config/database');
const auditService = require('../services/auditService');

// Database auto-migration for FechaApertura, UsuarioApertura, and Trazabilidad
(async () => {
  try {
    const pool = await getPool();
    console.log('🔄 [Auto-Migration] Checking columns for LotesReactivos and Trazabilidad table...');
    
    // 1. Create registro_trazabilidad
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='registro_trazabilidad' and xtype='U')
      BEGIN
          CREATE TABLE registro_trazabilidad (
              id INT IDENTITY(1,1) PRIMARY KEY,
              usuario_id INT NOT NULL,
              accion NVARCHAR(100) NOT NULL,
              entidad NVARCHAR(100) NOT NULL,
              entidad_id INT NULL,
              detalles_json NVARCHAR(MAX) NULL,
              direccion_ip NVARCHAR(50) NULL,
              fecha_registro DATETIME DEFAULT GETDATE() NOT NULL,
              CONSTRAINT FK_Trazabilidad_Usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
          );
          
          CREATE INDEX IX_Trazabilidad_Usuario ON registro_trazabilidad(usuario_id);
          CREATE INDEX IX_Trazabilidad_Entidad ON registro_trazabilidad(entidad, entidad_id);
          CREATE INDEX IX_Trazabilidad_Fecha ON registro_trazabilidad(fecha_registro);
          
          PRINT '✅ [Auto-Migration] Tabla registro_trazabilidad creada con éxito.';
      END
    `);

    const checkColumns = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'LotesReactivos' 
        AND COLUMN_NAME IN ('FechaApertura', 'UsuarioApertura')
    `);
    
    const existing = checkColumns.recordset.map(c => c.COLUMN_NAME);
    if (!existing.includes('FechaApertura')) {
      await pool.request().query(`
        ALTER TABLE LotesReactivos ADD FechaApertura DATE NULL;
      `);
      console.log('✅ [Auto-Migration] Added FechaApertura column successfully.');
    }
    
    if (!existing.includes('UsuarioApertura')) {
      await pool.request().query(`
        ALTER TABLE LotesReactivos ADD UsuarioApertura VARCHAR(100) NULL;
      `);
      console.log('✅ [Auto-Migration] Added UsuarioApertura column successfully.');
    }
  } catch (error) {
    console.error('❌ [Auto-Migration] Error running database migration:', error.message);
  }
})();

// Obtener todos los lotes
const getAllLotes = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        lr.*,
        DATEDIFF(DAY, GETDATE(), lr.FechaVencimiento) AS DiasParaVencer,
        ii.nombre as ItemNombre, 
        ii.codigo as ItemCodigo
      FROM LotesReactivos lr
      INNER JOIN items_inventario ii ON lr.InventarioId = ii.id
      ORDER BY lr.FechaVencimiento ASC
    `);
    res.json({ success: true, lotes: result.recordset });
  } catch (error) {
    console.error('Error al obtener lotes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Obtener lote por ID
const getLoteById = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          lr.*,
          DATEDIFF(DAY, GETDATE(), lr.FechaVencimiento) AS DiasParaVencer,
          ii.nombre as ItemNombre, 
          ii.codigo as ItemCodigo
        FROM LotesReactivos lr
        INNER JOIN items_inventario ii ON lr.InventarioId = ii.id
        WHERE lr.Id = @id
      `);
    if (result.recordset.length > 0) {
      res.json({ success: true, lote: result.recordset[0] });
    } else {
      res.status(404).json({ success: false, error: 'Lote no encontrado' });
    }
  } catch (error) {
    console.error('Error al obtener lote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Crear un nuevo lote - VERSIÓN FINAL CORREGIDA
const createLote = async (req, res) => {
  try {
    const {
      InventarioId, NumeroLote, FechaFabricacion, FechaVencimiento,
      CantidadInicial, CantidadActual, ConsumoPorPrueba, 
      VolumenTrabajoPractico, TemperaturaAlmacenamiento, 
      CondicionesEspeciales, Estado, PorcentajeMerma,
      EsBiReactivo, CantidadInicialR2, CantidadActualR2, ConsumoPorPruebaR2,
      FechaApertura, UsuarioApertura
    } = req.body;

    const pool = await getPool();

    // Cálculos automáticos
    const VolumenTrabajoTeorico = CantidadInicial / ConsumoPorPrueba;
    const Rendimiento = VolumenTrabajoPractico > 0 
      ? (VolumenTrabajoPractico / VolumenTrabajoTeorico) * 100 
      : 0;
    
    let PruebasTeoricas = 0;
    let PruebasRestantes = 0;
    
    if (ConsumoPorPrueba && ConsumoPorPrueba > 0) {
      PruebasTeoricas = Math.round(CantidadInicial / ConsumoPorPrueba);
      PruebasRestantes = Math.round(CantidadActual / ConsumoPorPrueba);
    }
    
    const ReactivoPorPrueba = ConsumoPorPrueba || 0;

    // NOTA: Rendimiento y VolumenTrabajoTeorico son columnas calculadas (COMPUTED COLUMNS)
    // en SQL Server — no se pueden escribir directamente con INSERT/UPDATE.
    // El motor de base de datos las recalcula automáticamente.
    const query = `
      INSERT INTO LotesReactivos (
        InventarioId, 
        NumeroLote, 
        FechaFabricacion, 
        FechaVencimiento,
        CantidadInicial, 
        CantidadActual, 
        ConsumoPorPrueba, 
        VolumenTrabajoPractico,
        TemperaturaAlmacenamiento, 
        CondicionesEspeciales, 
        Estado,
        FechaRegistro, 
        FechaActualizacion,
        PruebasTeoricas, 
        PruebasRestantes, 
        ReactivoPorPrueba,
        PorcentajeMerma,
        EsBiReactivo,
        CantidadInicialR2,
        CantidadActualR2,
        ConsumoPorPruebaR2,
        FechaApertura,
        UsuarioApertura
      ) VALUES (
        @InventarioId, 
        @NumeroLote, 
        @FechaFabricacion, 
        @FechaVencimiento,
        @CantidadInicial, 
        @CantidadActual, 
        @ConsumoPorPrueba,
        @VolumenTrabajoPractico,
        @TemperaturaAlmacenamiento, 
        @CondicionesEspeciales, 
        @Estado,
        GETDATE(), 
        GETDATE(),
        @PruebasTeoricas, 
        @PruebasRestantes, 
        @ReactivoPorPrueba,
        @PorcentajeMerma,
        @EsBiReactivo,
        @CantidadInicialR2,
        @CantidadActualR2,
        @ConsumoPorPruebaR2,
        @FechaApertura,
        @UsuarioApertura
      );
      SELECT SCOPE_IDENTITY() AS Id;
    `

    const request = pool.request();
    request.input('InventarioId', sql.Int, InventarioId);
    request.input('NumeroLote', sql.VarChar, NumeroLote);
    request.input('FechaFabricacion', sql.Date, FechaFabricacion);
    request.input('FechaVencimiento', sql.Date, FechaVencimiento);
    request.input('CantidadInicial', sql.Decimal(10, 2), CantidadInicial);
    request.input('CantidadActual', sql.Decimal(10, 2), CantidadActual);
    request.input('ConsumoPorPrueba', sql.Decimal(10, 3), ConsumoPorPrueba);
    request.input('VolumenTrabajoPractico', sql.Decimal(10, 2), VolumenTrabajoPractico || 0);
    request.input('TemperaturaAlmacenamiento', sql.VarChar, TemperaturaAlmacenamiento || '');
    request.input('CondicionesEspeciales', sql.Text, CondicionesEspeciales || '');
    request.input('Estado', sql.VarChar, Estado);
    request.input('PruebasTeoricas', sql.Int, PruebasTeoricas);
    request.input('PruebasRestantes', sql.Int, PruebasRestantes);
    request.input('ReactivoPorPrueba', sql.Decimal(10, 3), ReactivoPorPrueba);
    request.input('PorcentajeMerma', sql.Decimal(5, 2), PorcentajeMerma || 0);
    request.input('EsBiReactivo', sql.Bit, EsBiReactivo ? 1 : 0);
    request.input('CantidadInicialR2', sql.Decimal(18, 4), CantidadInicialR2 || null);
    request.input('CantidadActualR2', sql.Decimal(18, 4), CantidadActualR2 || null);
    request.input('ConsumoPorPruebaR2', sql.Decimal(10, 4), ConsumoPorPruebaR2 || null);
    request.input('FechaApertura', sql.Date, FechaApertura || null);
    request.input('UsuarioApertura', sql.VarChar, UsuarioApertura || null);

    const result = await request.query(query);
    const insertedId = result.recordset[0].Id;
    
    // Registrar trazabilidad
    await auditService.logEvent(
      req.user?.id || 1,
      'CREAR',
      'LOTE',
      insertedId,
      { 
        NumeroLote, 
        InventarioId, 
        CantidadInicial, 
        FechaVencimiento,
        FechaApertura: FechaApertura || 'Sin abrir',
        ConsumoPorPrueba,
        PruebasTeoricas,
        PorcentajeMerma: PorcentajeMerma || 0
      }
    );
    
    res.json({ 
      success: true, 
      message: 'Lote creado exitosamente',
      calculos: {
        volumenTrabajoTeorico: VolumenTrabajoTeorico.toFixed(2),
        rendimiento: Rendimiento.toFixed(2),
        pruebasTeoricas: PruebasTeoricas,
        pruebasRestantes: PruebasRestantes,
        reactivoPorPrueba: ReactivoPorPrueba
      }
    });

  } catch (error) {
    console.error('Error creando lote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Actualizar un lote
const updateLote = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      InventarioId, NumeroLote, FechaFabricacion, FechaVencimiento,
      CantidadInicial, CantidadActual, ConsumoPorPrueba, 
      VolumenTrabajoPractico, TemperaturaAlmacenamiento, 
      CondicionesEspeciales, Estado, PorcentajeMerma,
      EsBiReactivo, CantidadInicialR2, CantidadActualR2, ConsumoPorPruebaR2,
      FechaApertura, UsuarioApertura
    } = req.body;

    const pool = await getPool();

    // Obtener datos antiguos para comparar
    const oldDataReq = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT ConsumoPorPrueba, FechaApertura, UsuarioApertura, PruebasTeoricas FROM LotesReactivos WHERE Id = @id');
    
    if (oldDataReq.recordset.length === 0) {
      return res.status(404).json({ success: false, error: 'Lote no encontrado' });
    }
    const oldLot = oldDataReq.recordset[0];


    // Recalcular
    const VolumenTrabajoTeorico = CantidadInicial / ConsumoPorPrueba;
    const Rendimiento = VolumenTrabajoPractico > 0 
      ? (VolumenTrabajoPractico / VolumenTrabajoTeorico) * 100 
      : 0;
    
    let PruebasTeoricas = 0;
    let PruebasRestantes = 0;
    
    if (ConsumoPorPrueba && ConsumoPorPrueba > 0) {
      PruebasTeoricas = Math.round(CantidadInicial / ConsumoPorPrueba);
      PruebasRestantes = Math.round(CantidadActual / ConsumoPorPrueba);
    }
    
    const ReactivoPorPrueba = ConsumoPorPrueba || 0;

    // NOTA: Rendimiento y VolumenTrabajoTeorico son columnas calculadas (COMPUTED COLUMNS)
    // en SQL Server — no se pueden escribir directamente con INSERT/UPDATE.
    const query = `
      UPDATE LotesReactivos SET
        InventarioId = @InventarioId,
        NumeroLote = @NumeroLote,
        FechaFabricacion = @FechaFabricacion,
        FechaVencimiento = @FechaVencimiento,
        CantidadInicial = @CantidadInicial,
        CantidadActual = @CantidadActual,
        ConsumoPorPrueba = @ConsumoPorPrueba,
        VolumenTrabajoPractico = @VolumenTrabajoPractico,
        TemperaturaAlmacenamiento = @TemperaturaAlmacenamiento,
        CondicionesEspeciales = @CondicionesEspeciales,
        Estado = @Estado,
        FechaActualizacion = GETDATE(),
        PruebasTeoricas = @PruebasTeoricas,
        PruebasRestantes = @PruebasRestantes,
        ReactivoPorPrueba = @ReactivoPorPrueba,
        PorcentajeMerma = @PorcentajeMerma,
        EsBiReactivo = @EsBiReactivo,
        CantidadInicialR2 = @CantidadInicialR2,
        CantidadActualR2 = @CantidadActualR2,
        ConsumoPorPruebaR2 = @ConsumoPorPruebaR2,
        FechaApertura = @FechaApertura,
        UsuarioApertura = @UsuarioApertura
      WHERE Id = @id
    `;

    const request = pool.request();
    request.input('id', sql.Int, id);
    request.input('InventarioId', sql.Int, InventarioId);
    request.input('NumeroLote', sql.VarChar, NumeroLote);
    request.input('FechaFabricacion', sql.Date, FechaFabricacion);
    request.input('FechaVencimiento', sql.Date, FechaVencimiento);
    request.input('CantidadInicial', sql.Decimal(10, 2), CantidadInicial);
    request.input('CantidadActual', sql.Decimal(10, 2), CantidadActual);
    request.input('ConsumoPorPrueba', sql.Decimal(10, 3), ConsumoPorPrueba);
    request.input('VolumenTrabajoPractico', sql.Decimal(10, 2), VolumenTrabajoPractico || 0);
    request.input('TemperaturaAlmacenamiento', sql.VarChar, TemperaturaAlmacenamiento || '');
    request.input('CondicionesEspeciales', sql.Text, CondicionesEspeciales || '');
    request.input('Estado', sql.VarChar, Estado);
    request.input('PruebasTeoricas', sql.Int, PruebasTeoricas);
    request.input('PruebasRestantes', sql.Int, PruebasRestantes);
    request.input('ReactivoPorPrueba', sql.Decimal(10, 3), ReactivoPorPrueba);
    request.input('PorcentajeMerma', sql.Decimal(5, 2), PorcentajeMerma || 0);
    request.input('EsBiReactivo', sql.Bit, EsBiReactivo ? 1 : 0);
    request.input('CantidadInicialR2', sql.Decimal(18, 4), CantidadInicialR2 || null);
    request.input('CantidadActualR2', sql.Decimal(18, 4), CantidadActualR2 || null);
    request.input('ConsumoPorPruebaR2', sql.Decimal(10, 4), ConsumoPorPruebaR2 || null);
    request.input('FechaApertura', sql.Date, FechaApertura || null);
    request.input('UsuarioApertura', sql.VarChar, UsuarioApertura || null);

    await request.query(query);
    
    const currentUserId = req.user?.id || 1;

    // 1. Detectar APERTURA_LOTE
    if (!oldLot.FechaApertura && FechaApertura) {
      await auditService.logEvent(currentUserId, 'APERTURA_LOTE', 'LOTE', id, {
        mensaje: 'Se aperturó el lote de reactivo',
        FechaApertura,
        UsuarioApertura
      });
    }

    // 2. Detectar MODIFICAR_INSERTO (Cambios en el consumo/inserto)
    if (
      (oldLot.ConsumoPorPrueba !== ConsumoPorPrueba) || 
      (oldLot.PruebasTeoricas !== PruebasTeoricas)
    ) {
      await auditService.logEvent(currentUserId, 'MODIFICAR_INSERTO', 'LOTE', id, {
        mensaje: 'Se alteró el rendimiento o consumo teórico del reactivo',
        ConsumoPorPruebaAnterior: oldLot.ConsumoPorPrueba,
        ConsumoPorPruebaNuevo: ConsumoPorPrueba,
        PruebasTeoricasAnterior: oldLot.PruebasTeoricas,
        PruebasTeoricasNuevo: PruebasTeoricas
      });
    }

    // 3. Registrar trazabilidad estándar general de la edición
    await auditService.logEvent(currentUserId, 'EDITAR', 'LOTE', id, { ...req.body });

    res.json({ 
      success: true, 
      message: 'Lote actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error actualizando lote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Eliminar un lote
const deleteLote = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM LotesReactivos WHERE Id = @id');
      
    // Registrar trazabilidad
    await auditService.logEvent(
      req.user?.id || 1,
      'ELIMINAR',
      'LOTE',
      id,
      { accion: 'Eliminación permanente' }
    );

    res.json({ success: true, message: 'Lote eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando lote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Obtener lotes por reactivo
const getLotesByReactivo = async (req, res) => {
  try {
    const { reactivoId } = req.params;
    const pool = await getPool();
    const result = await pool.request()
      .input('reactivoId', sql.Int, reactivoId)
      .query(`
        SELECT 
          lr.*,
          DATEDIFF(DAY, GETDATE(), lr.FechaVencimiento) AS DiasParaVencer,
          ii.nombre as ItemNombre, 
          ii.codigo as ItemCodigo
        FROM LotesReactivos lr
        INNER JOIN items_inventario ii ON lr.InventarioId = ii.id
        WHERE lr.InventarioId = @reactivoId
        ORDER BY lr.FechaVencimiento ASC
      `);
    res.json({ success: true, lotes: result.recordset });
  } catch (error) {
    console.error('Error al obtener lotes por reactivo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllLotes,
  getLoteById,
  createLote,
  updateLote,
  deleteLote,
  getLotesByReactivo
};