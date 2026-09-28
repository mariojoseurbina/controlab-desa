// database.js - Redirige al pool robusto de db.js con reconexión automática
// Este archivo es usado por legacyRoutes.js y otros módulos que importan de '../config/database'

const { sql, getPool, executeTransaction, dbConfig } = require('./db');

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