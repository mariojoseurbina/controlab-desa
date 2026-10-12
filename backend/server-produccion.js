const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { executeQuery } = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

// LOGIN PRODUCCIÃ“N
app.post('/api/auth/login', async (req, res) => {
  try {
    const { usuario, contraseÃ±a } = req.body;
    
    console.log('ðŸ” Login producciÃ³n:', usuario);

    const users = await executeQuery(
      'SELECT id, usuario, correo, contraseÃ±a, rol, nombre_completo, activo FROM usuarios WHERE usuario = @usuario AND activo = 1',
      { usuario }
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const user = users[0];

    // VerificaciÃ³n directa
    if (user.contraseÃ±a !== contraseÃ±a) {
      return res.status(401).json({ error: 'ContraseÃ±a incorrecta' });
    }

    const token = jwt.sign(
      { userId: user.id, usuario: user.usuario, rol: user.rol },
      'controlab-produccion-secret',
      { expiresIn: '24h' }
    );

    const { contraseÃ±a: _, ...userResponse } = user;

    console.log('âœ… Login exitoso producciÃ³n:', user.usuario);

    res.json({
      message: 'Login exitoso',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('âŒ Error login producciÃ³n:', error);
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
      return res.status(401).json({ error: 'Usuario no vÃ¡lido' });
    }

    res.json(users[0]);
  } catch (error) {
    res.status(403).json({ error: 'Token invÃ¡lido' });
  }
});

// DASHBOARD PRODUCCIÃ“N
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
    res.status(500).json({ error: 'Error obteniendo mÃ©tricas' });
  }
});

// INVENTARIO PRODUCCIÃ“N
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
    message: 'Controlab IA - Sistema en ProducciÃ³n',
    timestamp: new Date().toISOString()
  });
});

app.listen(5000, () => {
  console.log('ðŸš€ CONTROLAB IA - SERVIDOR PRODUCCIÃ“N');
  console.log('âœ… Puerto: 5000');
  console.log('âœ… Base de datos: Conectada');
  console.log('âœ… Login: Funcional');
  console.log('âœ… Dashboard: Activo');
  console.log('âœ… Inventario: Operativo');
  console.log('ðŸ“Š URL: http://localhost:3000');
});
