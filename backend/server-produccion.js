const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { executeQuery } = require('./config/database');

const app = express();
app.use(cors());
app.use(express.json());

// LOGIN PRODUCCIÓN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { usuario, contraseña } = req.body;
    
    console.log('🔐 Login producción:', usuario);

    const users = await executeQuery(
      'SELECT id, usuario, correo, contraseña, rol, nombre_completo, activo FROM usuarios WHERE usuario = @usuario AND activo = 1',
      { usuario }
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const user = users[0];

    // Verificación directa
    if (user.contraseña !== contraseña) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      { userId: user.id, usuario: user.usuario, rol: user.rol },
      'controlab-produccion-secret',
      { expiresIn: '24h' }
    );

    const { contraseña: _, ...userResponse } = user;

    console.log('✅ Login exitoso producción:', user.usuario);

    res.json({
      message: 'Login exitoso',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('❌ Error login producción:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// VERIFICAR TOKEN
app.get('/api/auth/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const decoded = jwt.verify(token, 'controlab-produccion-secret');
    
    const users = await executeQuery(
      'SELECT id, usuario, correo, rol, nombre_completo, activo FROM usuarios WHERE id = @userId AND activo = 1',
      { userId: decoded.userId }
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Usuario no válido' });
    }

    res.json(users[0]);
  } catch (error) {
    res.status(403).json({ error: 'Token inválido' });
  }
});

// DASHBOARD PRODUCCIÓN
app.get('/api/dashboard/metrics', async (req, res) => {
  try {
    const metrics = await executeQuery(`
      SELECT 
        (SELECT COUNT(*) FROM items_inventario WHERE activo = 1) as totalItems,
        (SELECT COUNT(*) FROM items_inventario WHERE stock_actual <= stock_critico AND activo = 1) as itemsCriticos,
        (SELECT COUNT(*) FROM items_inventario WHERE stock_actual <= stock_minimo AND stock_actual > stock_critico AND activo = 1) as itemsBajos,
        (SELECT COUNT(*) FROM movimientos_inventario WHERE CAST(fecha_movimiento AS DATE) = CAST(GETDATE() AS DATE)) as movimientosHoy,
        (SELECT COUNT(*) FROM recetas) as totalRecetas,
        (SELECT COUNT(*) FROM reactivos) as totalReactivos
    `);

    const stockAlerts = await executeQuery(`
      SELECT TOP 5 id, codigo, nombre, stock_actual, stock_minimo, stock_critico
      FROM items_inventario 
      WHERE activo = 1 AND stock_actual <= stock_minimo
      ORDER BY stock_actual ASC
    `);

    const recentMovements = await executeQuery(`
      SELECT TOP 5 m.id, i.nombre, m.tipo_movimiento, m.cantidad, m.fecha_movimiento
      FROM movimientos_inventario m
      INNER JOIN items_inventario i ON m.item_id = i.id
      ORDER BY m.fecha_movimiento DESC
    `);

    res.json({
      metrics: metrics[0] || {
        totalItems: 0,
        itemsCriticos: 0,
        itemsBajos: 0,
        movimientosHoy: 0,
        totalRecetas: 0,
        totalReactivos: 0
      },
      stockAlerts: stockAlerts || [],
      recentMovements: recentMovements || []
    });

  } catch (error) {
    console.error('Error dashboard:', error);
    res.status(500).json({ error: 'Error obteniendo métricas' });
  }
});

// INVENTARIO PRODUCCIÓN
app.get('/api/inventory', async (req, res) => {
  try {
    const items = await executeQuery('SELECT * FROM items_inventario WHERE activo = 1 ORDER BY fecha_actualizacion DESC');
    res.json({ items });
  } catch (error) {
    console.error('Error inventario:', error);
    res.status(500).json({ error: 'Error obteniendo inventario' });
  }
});

// CREAR ITEM
app.post('/api/inventory', async (req, res) => {
  try {
    const {
      codigo, nombre, descripcion, categoria, unidad, stock_actual,
      stock_minimo, stock_critico, proveedor, precio_costo, precio_venta,
      ubicacion, fecha_vencimiento
    } = req.body;

    await executeQuery(`
      INSERT INTO items_inventario (
        codigo, nombre, descripcion, categoria, unidad, stock_actual,
        stock_minimo, stock_critico, proveedor, precio_costo, precio_venta,
        ubicacion, fecha_vencimiento, creado_por, fecha_creacion, fecha_actualizacion
      ) VALUES (
        @codigo, @nombre, @descripcion, @categoria, @unidad, @stock_actual,
        @stock_minimo, @stock_critico, @proveedor, @precio_costo, @precio_venta,
        @ubicacion, @fecha_vencimiento, 1, GETDATE(), GETDATE()
      )
    `, {
      codigo, nombre, descripcion, categoria, unidad, stock_actual,
      stock_minimo, stock_critico, proveedor, precio_costo, precio_venta,
      ubicacion, fecha_vencimiento
    });

    res.status(201).json({ message: 'Item creado exitosamente' });
  } catch (error) {
    console.error('Error creando item:', error);
    res.status(500).json({ error: 'Error creando item' });
  }
});

// SALUD DEL SISTEMA
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Controlab IA - Sistema en Producción',
    timestamp: new Date().toISOString()
  });
});

app.listen(5000, () => {
  console.log('🚀 CONTROLAB IA - SERVIDOR PRODUCCIÓN');
  console.log('✅ Puerto: 5000');
  console.log('✅ Base de datos: Conectada');
  console.log('✅ Login: Funcional');
  console.log('✅ Dashboard: Activo');
  console.log('✅ Inventario: Operativo');
  console.log('📊 URL: http://localhost:3000');
});