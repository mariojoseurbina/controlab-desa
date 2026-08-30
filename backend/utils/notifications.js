const { getPool } = require('../config/database');

const checkStockAlerts = async () => {
  try {
    const pool = await getPool();
    
    // Buscar items con stock bajo o crítico
    const result = await pool.request().query(`
      SELECT 
        ii.id,
        ii.codigo,
        ii.nombre,
        ii.stock_actual,
        ii.stock_minimo,
        ii.stock_critico,
        CASE 
          WHEN ii.stock_actual <= ii.stock_critico THEN 'critico'
          WHEN ii.stock_actual <= ii.stock_minimo THEN 'bajo'
          ELSE 'normal'
        END as tipo_alerta
      FROM items_inventario ii
      WHERE ii.activo = 1 
        AND (ii.stock_actual <= ii.stock_minimo OR ii.stock_actual <= ii.stock_critico)
        AND NOT EXISTS (
          SELECT 1 FROM notificaciones n 
          WHERE n.tipo = 'alerta_stock' 
          AND n.mensaje LIKE '%' + ii.codigo + '%'
          AND n.fecha_creacion >= DATEADD(hour, -1, GETDATE())
        )
    `);

    // Crear notificaciones para administradores
    for (const item of result.recordset) {
      const titulo = `Alerta de Stock ${item.tipo_alerta.toUpperCase()}`;
      const mensaje = `El item ${item.codigo} - ${item.nombre} tiene stock ${item.tipo_alerta}. Stock actual: ${item.stock_actual}`;

      // Crear notificación para todos los administradores
      await pool.request()
        .input('tipo', 'alerta_stock')
        .input('titulo', titulo)
        .input('mensaje', mensaje)
        .query(`
          INSERT INTO notificaciones (tipo, titulo, mensaje, creada_para)
          SELECT @tipo, @titulo, @mensaje, id 
          FROM usuarios 
          WHERE rol = 'administrador' AND activo = 1
        `);
    }

    console.log(`✅ Verificadas alertas de stock: ${result.recordset.length} alertas encontradas`);
    
  } catch (error) {
    console.error('Error verificando alertas de stock:', error);
  }
};

const createNotification = async (tipo, titulo, mensaje, userId = null) => {
  try {
    const pool = await getPool();
    
    if (userId) {
      // Notificación para usuario específico
      await pool.request()
        .input('tipo', tipo)
        .input('titulo', titulo)
        .input('mensaje', mensaje)
        .input('creada_para', userId)
        .query(`
          INSERT INTO notificaciones (tipo, titulo, mensaje, creada_para)
          VALUES (@tipo, @titulo, @mensaje, @creada_para)
        `);
    } else {
      // Notificación para todos los administradores
      await pool.request()
        .input('tipo', tipo)
        .input('titulo', titulo)
        .input('mensaje', mensaje)
        .query(`
          INSERT INTO notificaciones (tipo, titulo, mensaje, creada_para)
          SELECT @tipo, @titulo, @mensaje, id 
          FROM usuarios 
          WHERE rol = 'administrador' AND activo = 1
        `);
    }
    
  } catch (error) {
    console.error('Error creando notificación:', error);
  }
};

const getUserNotifications = async (userId, limit = 10) => {
  try {
    const pool = await getPool();
    
    const result = await pool.request()
      .input('userId', userId)
      .input('limit', limit)
      .query(`
        SELECT TOP (@limit) 
          id, tipo, titulo, mensaje, leida, fecha_creacion
        FROM notificaciones 
        WHERE creada_para = @userId 
        ORDER BY fecha_creacion DESC
      `);

    return result.recordset;
    
  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    return [];
  }
};

const markNotificationAsRead = async (notificationId, userId) => {
  try {
    const pool = await getPool();
    
    await pool.request()
      .input('id', notificationId)
      .input('userId', userId)
      .query(`
        UPDATE notificaciones 
        SET leida = 1 
        WHERE id = @id AND creada_para = @userId
      `);
      
  } catch (error) {
    console.error('Error marcando notificación como leída:', error);
  }
};

module.exports = {
  checkStockAlerts,
  createNotification,
  getUserNotifications,
  markNotificationAsRead
};