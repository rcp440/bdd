require('dotenv').config();
const sql = require('mssql');
const bcrypt = require('bcryptjs');

const sqlConfig = {
  server: process.env.SQL_SERVER,
  port: parseInt(process.env.SQL_PORT),
  database: process.env.SQL_DATABASE,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  encrypt: process.env.SQL_ENCRYPT === 'true',
  trustServerCertificate: true
};

async function seed() {
  try {
    const pool = new sql.ConnectionPool(sqlConfig);
    await pool.connect();
    console.log('✅ Conectado a SQL Server');

    // Generar hash para demo123
    const demoHash = await bcrypt.hash('demo123', 10);

    // Insertar líder demo
    const request = pool.request();
    request.input('usuario', sql.VarChar, 'demo');
    request.input('email', sql.VarChar, 'demo@example.com');
    request.input('nombre', sql.VarChar, 'Demo Líder');
    request.input('contrasena', sql.VarChar, demoHash);

    await request.query(`
      IF NOT EXISTS (SELECT 1 FROM Lideres WHERE usuario = 'demo')
      BEGIN
        INSERT INTO Lideres (usuario, email, nombre, contrasena, fecha_registro)
        VALUES (@usuario, @email, @nombre, @contrasena, GETDATE())
      END
    `);

    console.log('✅ Líder demo insertado');

    // Obtener ID del líder demo
    const liderResult = await pool.request().query(
      "SELECT id FROM Lideres WHERE usuario = 'demo'"
    );
    const liderId = liderResult.recordset[0]?.id;

    if (liderId) {
      // Insertar discípulos de prueba
      const discipulos = [
        { nombre: 'Juan García', celular: '2996205606' },
        { nombre: 'María López', celular: '2996205607' },
        { nombre: 'Carlos Rodríguez', celular: '2996205608' },
        { nombre: 'Ana Martínez', celular: '2996205609' },
        { nombre: 'Pedro Fernández', celular: '2996205610' },
        { nombre: 'Laura Sánchez', celular: '2996205611' }
      ];

      for (const disc of discipulos) {
        const req = pool.request();
        req.input('lider_id', sql.Int, liderId);
        req.input('nombre', sql.VarChar, disc.nombre);
        req.input('celular', sql.VarChar, disc.celular);

        await req.query(`
          IF NOT EXISTS (SELECT 1 FROM Discipulos WHERE lider_id = @lider_id AND nombre = @nombre)
          BEGIN
            INSERT INTO Discipulos (lider_id, nombre, celular)
            VALUES (@lider_id, @nombre, @celular)
          END
        `);
      }

      console.log(`✅ ${discipulos.length} discípulos insertados`);
    }

    await pool.close();
    console.log('\n🎉 Base de datos inicializada exitosamente!');
    console.log('\nCredenciales de prueba:');
    console.log('👤 Usuario: demo');
    console.log('🔐 Contraseña: demo123');
    console.log('\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

seed();
