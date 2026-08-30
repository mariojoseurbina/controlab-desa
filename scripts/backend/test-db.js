const sql = require('mssql');
require('dotenv').config();

async function testDatabase() {
  console.log('🧪 TESTEANDO CONEXIÓN A BASE DE DATOS...\n');

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
    }
  };

  console.log('🔧 Configuración de BD:');
  console.log('   Servidor:', dbConfig.server);
  console.log('   Base de datos:', dbConfig.database);
  console.log('   Usuario:', dbConfig.user);
  console.log('   Puerto:', dbConfig.port);

  try {
    const pool = await new sql.ConnectionPool(dbConfig).connect();
    console.log('\n✅ CONEXIÓN EXITOSA A SQL SERVER');

    // Verificar si la tabla usuarios existe
    const tableCheck = await pool.request()
      .query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'usuarios'
      `);

    if (tableCheck.recordset.length > 0) {
      console.log('✅ Tabla "usuarios" encontrada');

      // Verificar usuarios existentes
      const users = await pool.request()
        .query('SELECT usuario, rol, activo FROM usuarios ORDER BY usuario');

      console.log('\n📊 USUARIOS EXISTENTES:');
      if (users.recordset.length > 0) {
        users.recordset.forEach(user => {
          console.log(`   👤 ${user.usuario} (${user.rol}) - ${user.activo ? 'ACTIVO' : 'INACTIVO'}`);
        });
      } else {
        console.log('   ℹ️  No hay usuarios en la tabla');
      }
    } else {
      console.log('❌ Tabla "usuarios" NO encontrada');
    }

    await pool.close();
    
  } catch (error) {
    console.error('\n❌ ERROR DE CONEXIÓN:');
    console.error('   Mensaje:', error.message);
    console.log('\n🔧 SOLUCIONES:');
    console.log('   1. Verifica que SQL Server esté ejecutándose');
    console.log('   2. Revisa el usuario y contraseña en .env');
    console.log('   3. Asegúrate de que la base de datos exista');
    console.log('   4. Verifica que el puerto 1433 esté abierto');
  }
}

testDatabase();