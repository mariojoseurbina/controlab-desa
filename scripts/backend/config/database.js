const sql = require('mssql');

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

module.exports = { connectDB, getPool };