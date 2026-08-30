const sql = require('mssql');

const config = {
  server: 'localhost',
  database: 'ControlabIA',
  user: 'sa',
  password: 'tu_password_sql',
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function testConnection() {
  try {
    console.log('🔌 Conectando a SQL Server...');
    const pool = await sql.connect(config);
    
    console.log('✅ Conectado a SQL Server!');
    
    // Probar consulta de usuarios
    const result = await pool.request()
      .query('SELECT id, usuario, rol, nombre_completo FROM usuarios');
    
    console.log('📊 Usuarios encontrados:', result.recordset.length);
    result.recordset.forEach(user => {
      console.log(`   - ${user.usuario} (${user.rol})`);
    });
    
    await pool.close();
    console.log('🎉 Conexión exitosa!');
    
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
    console.log('🔧 Solución:');
    console.log('   1. Verifica que SQL Server esté corriendo');
    console.log('   2. Verifica usuario y contraseña');
    console.log('   3. Verifica que la BD exista');
    console.log('   4. Verifica que la autenticación SQL esté habilitada');
  }
}

testConnection();