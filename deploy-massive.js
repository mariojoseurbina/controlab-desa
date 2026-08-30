const fs = require('fs');
const path = require('path');

// Configuración de archivos a crear
const filesStructure = {
  // BACKEND
  'backend/.env': `NODE_ENV=production
PORT=5000
DB_SERVER=localhost
DB_NAME=Controlab_IA
DB_USER=sa
DB_PASSWORD=TuPasswordSeguro
DB_PORT=1433
JWT_SECRET=TuClaveSecretaSuperSegura2024
JWT_EXPIRE=24h
FRONTEND_URL=http://localhost:3000`,

  'backend/config/database.js': `const sql = require('mssql');

const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
  options: {
    enableArithAbort: true,
    trustServerCertificate: true,
    encrypt: false
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool;

const connectDB = async () => {
  try {
    pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();
    console.log('✅ Conectado a SQL Server - Controlab IA');
    return pool;
  } catch (error) {
    console.error('❌ Error conectando a SQL Server:', error.message);
    process.exit(1);
  }
};

const getPool = () => pool;

module.exports = { connectDB, getPool };`,

  'backend/middleware/auth.js': `const jwt = require('jsonwebtoken');
const sql = require('mssql');

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token requerido.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const pool = req.app.locals.pool;
    
    const result = await pool.request()
      .input('id', sql.Int, decoded.id)
      .query('SELECT id, usuario, correo, rol, nombre_completo, activo FROM usuarios WHERE id = @id AND activo = 1');
    
    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Token inválido. Usuario no encontrado.' });
    }
    
    req.user = result.recordset[0];
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido.' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ 
        error: 'Acceso denegado. Permisos insuficientes.' 
      });
    }
    next();
  };
};

module.exports = { auth, authorize };`,

  'backend/controllers/authController.js': `const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sql = require('mssql');

const login = async (req, res) => {
  const { usuario, contraseña } = req.body;

  try {
    const pool = req.app.locals.pool;
    
    const result = await pool.request()
      .input('usuario', sql.VarChar, usuario)
      .query('SELECT * FROM usuarios WHERE usuario = @usuario AND activo = 1');

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.recordset[0];
    const validPassword = await bcrypt.compare(contraseña, user.contraseña);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        usuario: user.usuario, 
        rol: user.rol 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      token,
      user: {
        id: user.id,
        usuario: user.usuario,
        correo: user.correo,
        rol: user.rol,
        nombre_completo: user.nombre_completo
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { login };`,

  'backend/controllers/dashboardController.js': `const sql = require('mssql');

const getDashboardMetrics = async (req, res) => {
  try {
    const pool = req.app.locals.pool;

    const metricsQuery = \`
      SELECT 
        (SELECT COUNT(*) FROM items_inventario WHERE activo = 1) as total_items,
        (SELECT COUNT(*) FROM items_inventario WHERE stock_actual <= stock_critico AND activo = 1) as items_criticos,
        (SELECT COUNT(*) FROM items_inventario WHERE stock_actual <= stock_minimo AND activo = 1) as items_bajos,
        (SELECT COUNT(*) FROM movimientos_inventario WHERE CAST(fecha_movimiento AS DATE) = CAST(GETDATE() AS DATE)) as movimientos_hoy,
        (SELECT COUNT(*) FROM recetas) as total_recetas,
        (SELECT COUNT(*) FROM usuarios WHERE activo = 1) as total_usuarios
    \`;

    const criticalStockQuery = \`
      SELECT TOP 5 id, codigo, nombre, stock_actual, stock_minimo, stock_critico
      FROM items_inventario 
      WHERE stock_actual <= stock_critico AND activo = 1
      ORDER BY stock_actual ASC
    \`;

    const metricsResult = await pool.request().query(metricsQuery);
    const criticalStockResult = await pool.request().query(criticalStockQuery);

    res.json({
      metrics: metricsResult.recordset[0],
      critical_stock: criticalStockResult.recordset
    });
  } catch (error) {
    console.error('Error obteniendo métricas:', error);
    res.status(500).json({ error: 'Error obteniendo datos del dashboard' });
  }
};

module.exports = { getDashboardMetrics };`,

  'backend/controllers/inventoryController.js': `const sql = require('mssql');

const getAllItems = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    
    const result = await pool.request().query(\`
      SELECT * FROM items_inventario 
      WHERE activo = 1 
      ORDER BY fecha_creacion DESC
    \`);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error obteniendo items:', error);
    res.status(500).json({ error: 'Error obteniendo items del inventario' });
  }
};

const createItem = async (req, res) => {
  try {
    const pool = req.app.locals.pool;
    const {
      codigo, nombre, descripcion, categoria, unidad, stock_actual,
      stock_minimo, stock_critico, proveedor, precio_costo, precio_venta,
      ubicacion, fecha_vencimiento
    } = req.body;

    const result = await pool.request()
      .input('codigo', sql.VarChar, codigo)
      .input('nombre', sql.VarChar, nombre)
      .input('descripcion', sql.Text, descripcion)
      .input('categoria', sql.VarChar, categoria)
      .input('unidad', sql.VarChar, unidad)
      .input('stock_actual', sql.Decimal(10,2), stock_actual)
      .input('stock_minimo', sql.Decimal(10,2), stock_minimo)
      .input('stock_critico', sql.Decimal(10,2), stock_critico)
      .input('proveedor', sql.VarChar, proveedor)
      .input('precio_costo', sql.Decimal(10,2), precio_costo)
      .input('precio_venta', sql.Decimal(10,2), precio_venta)
      .input('ubicacion', sql.VarChar, ubicacion)
      .input('fecha_vencimiento', sql.Date, fecha_vencimiento)
      .input('creado_por', sql.Int, req.user.id)
      .query(\`
        INSERT INTO items_inventario (
          codigo, nombre, descripcion, categoria, unidad, stock_actual,
          stock_minimo, stock_critico, proveedor, precio_costo, precio_venta,
          ubicacion, fecha_vencimiento, creado_por, fecha_creacion, activo
        ) 
        OUTPUT INSERTED.*
        VALUES (
          @codigo, @nombre, @descripcion, @categoria, @unidad, @stock_actual,
          @stock_minimo, @stock_critico, @proveedor, @precio_costo, @precio_venta,
          @ubicacion, @fecha_vencimiento, @creado_por, GETDATE(), 1
        )
      \`);

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    console.error('Error creando item:', error);
    res.status(500).json({ error: 'Error creando item en inventario' });
  }
};

module.exports = { getAllItems, createItem };`,

  'backend/routes/auth.js': `const express = require('express');
const { login } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);

module.exports = router;`,

  'backend/routes/dashboard.js': `const express = require('express');
const { getDashboardMetrics } = require('../controllers/dashboardController');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/metrics', auth, getDashboardMetrics);

module.exports = router;`,

  'backend/routes/inventory.js': `const express = require('express');
const { getAllItems, createItem } = require('../controllers/inventoryController');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, getAllItems);
router.post('/', auth, createItem);

module.exports = router;`,

  'backend/server.js': `require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/database');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const inventoryRoutes = require('./routes/inventory');

const app = express();

app.use(cors());
app.use(express.json());

connectDB().then(pool => {
  app.locals.pool = pool;
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inventory', inventoryRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Controlab IA - Sistema LIMS Clínico',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(\`🚀 Servidor Controlab IA ejecutándose en puerto \${PORT}\`);
});`,

  'backend/package.json': `{
  "name": "controlab-ia-backend",
  "version": "1.0.0",
  "description": "Sistema LIMS Clínico Controlab IA - Backend",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mssql": "^9.1.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}`,

  // FRONTEND
  'frontend/package.json': `{
  "name": "controlab-ia-frontend",
  "version": "1.0.0",
  "description": "Sistema LIMS Clínico Controlab IA - Frontend",
  "main": "src/index.js",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "react-router-dom": "^6.15.0",
    "@mui/material": "^5.14.5",
    "@mui/icons-material": "^5.14.3",
    "@emotion/react": "^11.11.1",
    "@emotion/styled": "^11.11.0",
    "axios": "^1.5.0"
  }
}`,

  'frontend/src/services/api.js': `import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = \`Bearer \${token}\`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;`,

  'frontend/src/services/authService.js': `import api from './api';

export const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },
  getToken: () => localStorage.getItem('token'),
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  setAuth: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }
};`,

  'frontend/src/contexts/AuthContext.js': `import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = authService.getToken();
    const savedUser = authService.getUser();
    
    if (token && savedUser) {
      setUser(savedUser);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const { token, user } = await authService.login(credentials);
    authService.setAuth(token, user);
    setUser(user);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};`,

  'frontend/src/App.js': `import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Cargando...</div>;
  }
  
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;`,

  'frontend/src/index.js': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,

  'frontend/public/index.html': `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Controlab IA - Sistema LIMS Clínico" />
    <title>Controlab IA - LIMS</title>
  </head>
  <body>
    <noscript>Necesitas habilitar JavaScript para ejecutar esta app.</noscript>
    <div id="root"></div>
  </body>
</html>`
};

// Función para crear archivos masivamente
function createFiles() {
  console.log('🚀 INICIANDO CREACIÓN MASIVA DE ARCHIVOS...\n');
  
  let createdCount = 0;
  let errorCount = 0;

  Object.entries(filesStructure).forEach(([filePath, content]) => {
    try {
      // Crear directorios si no existen
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Crear archivo
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ CREADO: ${filePath}`);
      createdCount++;
    } catch (error) {
      console.log(`❌ ERROR creando ${filePath}:`, error.message);
      errorCount++;
    }
  });

  console.log('\n===================================');
  console.log(`📊 RESUMEN:`);
  console.log(`✅ Archivos creados: ${createdCount}`);
  console.log(`❌ Errores: ${errorCount}`);
  console.log('===================================\n');
  
  if (errorCount === 0) {
    console.log('🎉 ¡TODOS LOS ARCHIVOS SE CREARON EXITOSAMENTE!');
    console.log('\n📝 PRÓXIMOS PASOS:');
    console.log('1. cd backend && npm install');
    console.log('2. cd frontend && npm install');
    console.log('3. Configurar la base de datos en backend/.env');
    console.log('4. cd backend && npm start');
    console.log('5. cd frontend && npm start');
  }
}

// Ejecutar la creación
createFiles();