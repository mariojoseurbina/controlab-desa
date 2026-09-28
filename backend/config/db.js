const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const parseDatabaseUrl = (url) => {
  if (!url) return null;
  try {
    const cleanUrl = url.replace('sqlserver://', '');
    const semicolonParts = cleanUrl.split(';');
    const hostPort = semicolonParts[0];
    const [server, portStr] = hostPort.split(':');
    const port = portStr ? parseInt(portStr, 10) : 1433;
    const params = {};
    for (let i = 1; i < semicolonParts.length; i++) {
      const part = semicolonParts[i];
      if (!part.trim()) continue;
      const [key, value] = part.split('=');
      if (key && value) {
        params[key.trim().toLowerCase()] = value.trim();
      }
    }
    return {
      server: server || 'localhost',
      database: params['database'] || 'ControlabIA',
      user: params['user'] || 'controlab_user',
      password: params['password'] || 'Delicia1.',
      port: port,
      encrypt: params['encrypt'] === 'true',
      trustServerCertificate: params['trustservercertificate'] === 'true'
    };
  } catch (err) {
    console.error('Error parsing DATABASE_URL:', err);
    return null;
  }
};

const parsedConfig = parseDatabaseUrl(process.env.DATABASE_URL);

// ============================================================
// CONFIGURACIÓN ROBUSTA DEL POOL - Evita relojes de arena
// ============================================================
const dbConfig = {
  server: parsedConfig?.server || process.env.DB_SERVER || 'localhost',
  database: parsedConfig?.database || process.env.DB_DATABASE || 'ControlabIA',
  user: parsedConfig?.user || process.env.DB_USER || 'controlab_user',
  password: parsedConfig?.password || process.env.DB_PASSWORD || 'Delicia1.',
  port: parsedConfig?.port || parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: parsedConfig ? parsedConfig.encrypt : (process.env.DB_ENCRYPT === 'true'),
    trustServerCertificate: parsedConfig ? parsedConfig.trustServerCertificate : true,
    enableArithAbort: true,
    // Timeout corto para detectar problemas rapidamente y reintentar
    requestTimeout: 20000,
    connectionTimeout: 15000
  },
  pool: {
    max: 10,           // Reducido: 50 conexiones simultáneas agotaban el servidor
    min: 2,            // Mantener 2 conexiones siempre vivas = NO MAS reloj de arena al despertar
    idleTimeoutMillis: 60000,   // 1 minuto antes de cerrar conexiones idle
    acquireTimeoutMillis: 15000 // 15s máximo esperando una conexión libre
  }
};

// ============================================================
// SINGLETON CON RECONEXIÓN AUTOMÁTICA
// Si el pool muere (inactividad, red caída), se recrea solo.
// ============================================================
let poolInstance = null;
let poolPromise = null;

const createPool = () => {
  console.log('🔄 Inicializando Pool de Base de Datos...');
  const newPool = new sql.ConnectionPool(dbConfig);

  // CRÍTICO: Escuchar errores del pool para reiniciarlo automáticamente
  newPool.on('error', (err) => {
    console.error('❌ Error en el pool de BD (reconectando...):', err.message);
    poolInstance = null;
    poolPromise = null;
  });

  poolPromise = newPool.connect()
    .then(pool => {
      poolInstance = pool;
      console.log('✅ Pool de base de datos conectado y listo.');
      return pool;
    })
    .catch(err => {
      console.error('❌ Error creando el pool de BD:', err.message);
      poolInstance = null;
      poolPromise = null;
      throw err;
    });

  return poolPromise;
};

const getPool = async () => {
  // Si el pool existe y está conectado, devolverlo
  if (poolInstance && poolInstance.connected) {
    return poolInstance;
  }
  // Si hay un intento de conexión en progreso, esperar ese intento
  if (poolPromise) {
    try {
      return await poolPromise;
    } catch (_) {
      // Si falló, limpiar y reintentar
      poolPromise = null;
      poolInstance = null;
    }
  }
  // Crear nuevo pool
  return await createPool();
};

// Función auxiliar para transacciones
const executeTransaction = async (transactionCallback) => {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const result = await transactionCallback(transaction);
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = {
  sql,
  getPool,
  executeTransaction,
  dbConfig
};
