const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend de React
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Importar rutas
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
// const inventoryRoutes = require('./routes/inventory'); // Comentado por migración a Módulos (Screaming Arch)
const inventoryRoutes = require('./src/modules/inventory/inventory.routes');
const movementsRoutes = require('./routes/movements');
const reagentsRoutes = require('./routes/reagents');
const recipesRoutes = require('./routes/recipes');
const reportsRoutes = require('./routes/reports');
const aiRoutes = require('./src/modules/ai-assistant/ai.routes');
const usersRoutes = require('./routes/users');
const legacyRoutes = require('./routes/legacyRoutes');
const lotsRoutes = require('./routes/lots');
const kitsPruebaRoutes = require('./routes/kits-prueba');
const pruebasRoutes = require('./routes/pruebas');
const consumoRealRoutes = require('./routes/consumoRealRoutes');
const descuentosRoutes = require('./routes/descuentos.masivos');
const purchasesRoutes = require('./src/modules/purchases/purchases.routes');
const costosRoutes = require('./src/modules/costos/costos.routes');
const agentRoutes = require('./src/modules/agent/agent.routes');
const snifferRoutes = require('./src/modules/sniffer/sniffer.routes');
const almacenesRoutes = require('./src/modules/almacenes/almacenes.routes');
const auditRoutes = require('./routes/auditRoutes');

// Usar rutas
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/movements', movementsRoutes);
app.use('/api/reagents', reagentsRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/reports', aiRoutes); // Rutas de IA montadas bajo /api/reports/analyze
app.use('/api/reports', reportsRoutes); // Rutas legacy de reportes
app.use('/api/users', usersRoutes);
app.use('/api/lotes', lotsRoutes);
app.use('/api/kits-prueba', kitsPruebaRoutes);
app.use('/api/pruebas', pruebasRoutes);
app.use('/api/consumo', consumoRealRoutes);
app.use('/api/descuentos', descuentosRoutes);
app.use('/api/compras', purchasesRoutes);
app.use('/api/costos', costosRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/sniffer', snifferRoutes);
app.use('/api/almacenes', almacenesRoutes);

app.use('/api', legacyRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Controlab - IA API funcionando',
    timestamp: new Date().toISOString()
  });
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
  });
});

// Ruta no encontrada para la API
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada en la API' });
});

// Manejar rutas del frontend (SPA routing) sirviendo el index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor Controlab - IA ejecutándose en puerto ${PORT}`);
  console.log(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);
});
