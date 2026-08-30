const sql = require('mssql');
const { dbConfig } = require('./db');

let poolPromise;

const getPool = () => {
  if (!poolPromise) {
    console.log('🔌 Intentando conectar a SQL Server...');
    console.log('📋 Configuración:', {
      server: dbConfig.server,
      database: dbConfig.database,
      user: dbConfig.user
    });

    poolPromise = new sql.ConnectionPool(dbConfig)
      .connect()
      .then(pool => {
        console.log('✅ Conectado exitosamente a SQL Server');
        return pool;
      })
      .catch(err => {
        console.error('❌ Error conectando a SQL Server:', err.message);
        throw err;
      });
  }
  return poolPromise;
};

const getConnection = getPool;

const executeQuery = async (query, params = {}) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });
    
    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error('❌ Error en consulta SQL:', error.message);
    throw error;
  }
};

module.exports = {
  sql,
  getPool,
  getConnection,
  executeQuery
};