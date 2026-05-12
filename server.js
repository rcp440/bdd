require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configuración SQL Server
const sqlConfig = {
  server: process.env.SQL_SERVER,
  port: parseInt(process.env.SQL_PORT),
  database: process.env.SQL_DATABASE,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  encrypt: process.env.SQL_ENCRYPT === 'true',
  trustServerCertificate: true,
  connectionTimeout: 30000,
  requestTimeout: 30000
};

// Pool de conexiones
let pool;

async function connectDB() {
  try {
    pool = new sql.ConnectionPool(sqlConfig);
    await pool.connect();
    console.log('✅ Conectado a SQL Server');
  } catch (err) {
    console.error('❌ Error conectando a SQL Server:', err);
    process.exit(1);
  }
}

// ==================== RUTAS ====================

// LOGIN
app.post('/api/login', async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;

    if (!usuario || !contrasena) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const request = pool.request();
    request.input('usuario', sql.VarChar, usuario);
    const result = await request.query(
      'SELECT id, usuario, email, nombre, contrasena FROM Lideres WHERE usuario = @usuario'
    );

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const lider = result.recordset[0];

    // Validar contraseña
    const esValido = await bcrypt.compare(contrasena, lider.contrasena);
    if (!esValido) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    // Obtener discípulos del líder
    const request2 = pool.request();
    request2.input('lider_id', sql.Int, lider.id);
    const discipulos = await request2.query(
      'SELECT id, nombre, celular FROM Discipulos WHERE lider_id = @lider_id ORDER BY nombre'
    );

    res.json({
      ok: true,
      lider: {
        id: lider.id,
        usuario: lider.usuario,
        nombre: lider.nombre,
        email: lider.email
      },
      discipulos: discipulos.recordset
    });

  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// REGISTRAR LÍDER
app.post('/api/registro', async (req, res) => {
  try {
    const { usuario, email, nombre, contrasena } = req.body;

    if (!usuario || !email || !nombre || !contrasena) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    // Hash de contraseña
    const salt = await bcrypt.genSalt(10);
    const contrasenhaHash = await bcrypt.hash(contrasena, salt);

    const request = pool.request();
    request.input('usuario', sql.VarChar, usuario);
    request.input('email', sql.VarChar, email);
    request.input('nombre', sql.VarChar, nombre);
    request.input('contrasena', sql.VarChar, contrasenhaHash);

    const result = await request.query(
      `INSERT INTO Lideres (usuario, email, nombre, contrasena, fecha_registro)
       VALUES (@usuario, @email, @nombre, @contrasena, GETDATE())`
    );

    res.json({ ok: true, mensaje: 'Líder registrado exitosamente' });

  } catch (err) {
    console.error('Error en registro:', err);
    if (err.originalError && err.originalError.info.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// AGREGAR DISCÍPULO
app.post('/api/discipulos', async (req, res) => {
  try {
    const { lider_id, nombre, celular } = req.body;

    if (!lider_id || !nombre) {
      return res.status(400).json({ error: 'Lider_id y nombre requeridos' });
    }

    const request = pool.request();
    request.input('lider_id', sql.Int, lider_id);
    request.input('nombre', sql.VarChar, nombre);
    request.input('celular', sql.VarChar, celular || '');

    const result = await request.query(
      `INSERT INTO Discipulos (lider_id, nombre, celular) 
       VALUES (@lider_id, @nombre, @celular);
       SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`
    );

    const insertedId = result.recordset?.[0]?.id;
    if (!insertedId) {
      throw new Error('No se obtuvo el id del discípulo insertado');
    }

    res.json({ ok: true, mensaje: 'Discípulo agregado', id: insertedId });

  } catch (err) {
    console.error('Error agregando discípulo:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// OBTENER DISCÍPULOS DE UN LÍDER
app.get('/api/discipulos/:lider_id', async (req, res) => {
  try {
    const { lider_id } = req.params;

    const request = pool.request();
    request.input('lider_id', sql.Int, parseInt(lider_id));

    const result = await request.query(
      'SELECT id, nombre, celular FROM Discipulos WHERE lider_id = @lider_id ORDER BY nombre'
    );

    res.json({ discipulos: result.recordset });

  } catch (err) {
    console.error('Error obteniendo discípulos:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// GUARDAR ASISTENCIA
app.post('/api/asistencia', async (req, res) => {
  try {
    const { lider_id, fecha, registros } = req.body;

    if (!lider_id || !fecha || !registros) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const fechaObj = new Date(fecha + 'T12:00:00');
    if (Number.isNaN(fechaObj.getTime())) {
      return res.status(400).json({ error: 'Fecha inválida' });
    }

    const request = pool.request();

    // Borrar asistencias previas del mismo día
    request.input('lider_id', sql.Int, lider_id);
    request.input('fecha', sql.Date, fechaObj);

    await request.query(
      'DELETE FROM Asistencia WHERE lider_id = @lider_id AND CAST(fecha AS DATE) = @fecha'
    );

    // Insertar nuevos registros
    for (const reg of registros) {
      const discipuloId = reg.discipulo_id ?? reg.id;
      const discipuloNum = Number(discipuloId);

      if (!discipuloId || Number.isNaN(discipuloNum)) {
        return res.status(400).json({ error: 'Cada registro debe tener un discipulo_id válido', registro: reg });
      }

      const req2 = pool.request();
      req2.input('discipulo_id', sql.Int, discipuloNum);
      req2.input('lider_id', sql.Int, lider_id);
      req2.input('fecha', sql.DateTime, fechaObj);
      req2.input('presente', sql.Bit, reg.presente ? 1 : 0);
      req2.input('celular', sql.VarChar, reg.celular || '');
      req2.input('observacion', sql.VarChar, reg.observacion || '');

      await req2.query(
        `INSERT INTO Asistencia (discipulo_id, lider_id, fecha, presente, celular, observacion)
         VALUES (@discipulo_id, @lider_id, @fecha, @presente, @celular, @observacion)`
      );
    }

    res.json({ ok: true, mensaje: 'Asistencia guardada' });

  } catch (err) {
    console.error('Error guardando asistencia:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// OBTENER ASISTENCIA DE UN DÍA
app.get('/api/asistencia/:lider_id/:fecha', async (req, res) => {
  try {
    const { lider_id, fecha } = req.params;

    const request = pool.request();
    request.input('lider_id', sql.Int, parseInt(lider_id));
    request.input('fecha', sql.Date, fecha);

    const result = await request.query(`
      SELECT a.discipulo_id, d.nombre, a.presente, a.celular, a.observacion
      FROM Asistencia a
      JOIN Discipulos d ON a.discipulo_id = d.id
      WHERE a.lider_id = @lider_id AND CAST(a.fecha AS DATE) = @fecha
    `);

    res.json({ registros: result.recordset });

  } catch (err) {
    console.error('Error obteniendo asistencia:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// OBTENER OBSERVACIÓN DEL ENCUENTRO
app.get('/api/reunion/:lider_id/:fecha', async (req, res) => {
  try {
    const { lider_id, fecha } = req.params;
    const request = pool.request();
    request.input('lider_id', sql.Int, parseInt(lider_id));
    request.input('fecha', sql.Date, fecha);
    const result = await request.query(
      'SELECT observacion FROM Reuniones WHERE lider_id = @lider_id AND fecha = @fecha'
    );
    res.json({ observacion: result.recordset[0]?.observacion || '' });
  } catch (err) {
    console.error('Error obteniendo reunión:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// GUARDAR OBSERVACIÓN DEL ENCUENTRO
app.post('/api/reunion', async (req, res) => {
  try {
    const { lider_id, fecha, observacion } = req.body;
    const fechaObj = new Date(fecha + 'T12:00:00');
    const request = pool.request();
    request.input('lider_id', sql.Int, lider_id);
    request.input('fecha', sql.Date, fechaObj);
    request.input('observacion', sql.VarChar, observacion || '');
    await request.query(`
      IF EXISTS (SELECT 1 FROM Reuniones WHERE lider_id = @lider_id AND fecha = @fecha)
        UPDATE Reuniones SET observacion = @observacion WHERE lider_id = @lider_id AND fecha = @fecha
      ELSE
        INSERT INTO Reuniones (lider_id, fecha, observacion) VALUES (@lider_id, @fecha, @observacion)
    `);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error guardando reunión:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// ==================== SERVIDOR ====================

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
});

// Manejo de errores global
process.on('SIGINT', async () => {
  console.log('\n📴 Cerrando conexión...');
  if (pool) await pool.close();
  process.exit(0);
});
