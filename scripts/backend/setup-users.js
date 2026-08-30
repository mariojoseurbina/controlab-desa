const bcrypt = require('bcryptjs');
const sql = require('mssql');
require('dotenv').config();

async function setupUsers() {
  console.log('👥 CONFIGURANDO USUARIOS DE PRUEBA...\n');

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

  try {
    // Conectar a la base de datos
    console.log('🔗 Conectando a SQL Server...');
    const pool = await new sql.ConnectionPool(dbConfig).connect();
    console.log('✅ Conectado a SQL Server');

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash('admin123', 10);
    console.log('🔐 Contraseña hasheada creada');

    // Insertar usuarios
    const users = [
      {
        usuario: 'admin',
        correo: 'admin@controlab.com',
        contraseña: hashedPassword,
        rol: 'admin',
        nombre_completo: 'Administrador Principal'
      },
      {
        usuario: 'mario',
        correo: 'mario@controlab.com', 
        contraseña: hashedPassword,
        rol: 'supervisor',
        nombre_completo: 'Mario Rodriguez'
      },
      {
        usuario: 'ana',
        correo: 'ana@controlab.com',
        contraseña: hashedPassword,
        rol: 'tecnico', 
        nombre_completo: 'Ana García'
      }
    ];

    for (const user of users) {
      try {
        const request = pool.request();
        request.input('usuario', sql.VarChar(100), user.usuario);
        request.input('correo', sql.VarChar(255), user.correo);
        request.input('contraseña', sql.VarChar(255), user.contraseña);
        request.input('rol', sql.VarChar(50), user.rol);
        request.input('nombre_completo', sql.VarChar(255), user.nombre_completo);

        await request.query(`
          IF NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario = @usuario)
          BEGIN
            INSERT INTO usuarios (usuario, correo, contraseña, rol, nombre_completo, activo, fecha_creacion)
            VALUES (@usuario, @correo, @contraseña, @rol, @nombre_completo, 1, GETDATE())
            PRINT 'Usuario creado: ' + @usuario
          END
          ELSE
          BEGIN
            UPDATE usuarios 
            SET contraseña = @contraseña, rol = @rol, nombre_completo = @nombre_completo,
                fecha_actualizacion = GETDATE()
            WHERE usuario = @usuario
            PRINT 'Usuario actualizado: ' + @usuario
          END
        `);
        
        console.log(`✅ ${user.usuario} configurado correctamente`);
      } catch (userError) {
        console.log(`⚠️  Error con ${user.usuario}:`, userError.message);
      }
    }

    // Verificar usuarios
    console.log('\n📊 Verificando usuarios en la base de datos...');
    const result = await pool.request()
      .query('SELECT usuario, correo, rol, activo FROM usuarios ORDER BY usuario');

    console.log('\n🎯 USUARIOS DISPONIBLES:');
    result.recordset.forEach(user => {
      console.log(`   👤 ${user.usuario} (${user.rol}) - ${user.correo} - ${user.activo ? 'ACTIVO' : 'INACTIVO'}`);
    });

    console.log('\n🔑 CREDENCIALES PARA LOGIN:');
    console.log('   Usuario: admin / Contraseña: admin123');
    console.log('   Usuario: mario / Contraseña: admin123'); 
    console.log('   Usuario: ana   / Contraseña: admin123');
    console.log('\n💡 Todos los usuarios usan la misma contraseña: admin123');

    await pool.close();
    console.log('\n🎉 CONFIGURACIÓN COMPLETADA!');
    
  } catch (error) {
    console.error('❌ Error configurando usuarios:', error.message);
    console.log('\n🔧 POSIBLES SOLUCIONES:');
    console.log('   1. Verifica que SQL Server esté ejecutándose');
    console.log('   2. Revisa las credenciales en backend/.env');
    console.log('   3. Asegúrate de que la base de datos exista');
  }
}

// Ejecutar la función
setupUsers();