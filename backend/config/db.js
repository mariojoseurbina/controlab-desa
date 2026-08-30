const sql = require('mssql');
require('dotenv').config();

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

// Configuración centralizada de la base de datos
const dbConfig = {
  server: parsedConfig?.server || process.env.DB_SERVER || 'localhost',
  database: parsedConfig?.database || process.env.DB_DATABASE || 'ControlabIA',
  user: parsedConfig?.user || process.env.DB_USER || 'controlab_user',
  password: parsedConfig?.password || process.env.DB_PASSWORD || 'Delicia1.',
  port: parsedConfig?.port || parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: parsedConfig ? parsedConfig.encrypt : (process.env.DB_ENCRYPT === 'true'),
    trustServerCertificate: parsedConfig ? parsedConfig.trustServerCertificate : true,
    enableArithAbort: true
  },
  pool: {
    max: 20,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

// Singleton para el pool de conexiones
let poolPromise = null;

const getPool = () => {
  if (!poolPromise) {
    console.log('🔄 Inicializando Pool de Base de Datos...');
    poolPromise = new sql.ConnectionPool(dbConfig)
      .connect()
      .then(pool => {
        console.log('✅ Pool de base de datos conectado y listo.');
        return pool;
      })
      .catch(err => {
        console.error('❌ Error creando el pool de BD:', err);
        poolPromise = null; // Reiniciar en caso de error para reintentar
        throw err;
      });
  }
  return poolPromise;
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
