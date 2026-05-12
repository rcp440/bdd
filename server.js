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
      'SELECT id, usuario, email, nombre, contrasena, rol FROM Lideres WHERE usuario = @usuario AND activo = 1'
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
        email: lider.email,
        rol: lider.rol || 'lider'
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
    const { lider_id, nombre, celular, fecha_nacimiento } = req.body;

    if (!lider_id || !nombre) {
      return res.status(400).json({ error: 'Lider_id y nombre requeridos' });
    }

    const request = pool.request();
    request.input('lider_id', sql.Int, lider_id);
    request.input('nombre', sql.VarChar, nombre);
    request.input('celular', sql.VarChar, celular || '');
    request.input('fecha_nacimiento', sql.Date, fecha_nacimiento || null);

    const result = await request.query(
      `INSERT INTO Discipulos (lider_id, nombre, celular, fecha_nacimiento)
       VALUES (@lider_id, @nombre, @celular, @fecha_nacimiento);
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
      `SELECT id, nombre, celular, CONVERT(VARCHAR(10), fecha_nacimiento, 23) AS fecha_nacimiento
       FROM Discipulos WHERE lider_id = @lider_id ORDER BY nombre`
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

// ---- ADMIN: LISTAR LÍDERES ----
app.get('/api/lideres', async (req, res) => {
  try {
    const lider_id = parseInt(req.query.lider_id);
    const chk = pool.request();
    chk.input('id', sql.Int, lider_id);
    const r = await chk.query('SELECT rol FROM Lideres WHERE id = @id AND activo = 1');
    if (r.recordset[0]?.rol !== 'admin') return res.status(403).json({ error: 'Sin permisos' });
    const result = await pool.request().query(
      `SELECT id, nombre, usuario, email, rol, activo,
              CONVERT(VARCHAR(10), fecha_nacimiento, 23) AS fecha_nacimiento
       FROM Lideres ORDER BY nombre`
    );
    res.json({ lideres: result.recordset });
  } catch (err) {
    console.error('Error listando líderes:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// ---- ADMIN: CREAR LÍDER ----
app.post('/api/lideres', async (req, res) => {
  try {
    const { lider_id, nombre, usuario, email, contrasena, rol, fecha_nacimiento } = req.body;
    if (!nombre || !usuario || !email || !contrasena) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    const chk = pool.request();
    chk.input('id', sql.Int, parseInt(lider_id));
    const r = await chk.query('SELECT rol FROM Lideres WHERE id = @id AND activo = 1');
    if (r.recordset[0]?.rol !== 'admin') return res.status(403).json({ error: 'Sin permisos' });
    const hash = await bcrypt.hash(contrasena, 10);
    const req2 = pool.request();
    req2.input('nombre', sql.VarChar, nombre);
    req2.input('usuario', sql.VarChar, usuario);
    req2.input('email', sql.VarChar, email);
    req2.input('contrasena', sql.VarChar, hash);
    req2.input('rol', sql.VarChar, rol || 'lider');
    req2.input('fecha_nacimiento', sql.Date, fecha_nacimiento || null);
    await req2.query(
      `INSERT INTO Lideres (nombre, usuario, email, contrasena, rol, fecha_nacimiento)
       VALUES (@nombre, @usuario, @email, @contrasena, @rol, @fecha_nacimiento)`
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error creando líder:', err);
    if (err.originalError?.info?.message?.includes('UNIQUE')) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// ---- ADMIN: EDITAR LÍDER ----
app.put('/api/lideres/:id', async (req, res) => {
  try {
    const { lider_id, nombre, usuario, email, rol, contrasena, fecha_nacimiento } = req.body;
    if (!nombre || !usuario || !email || !rol) {
      return res.status(400).json({ error: 'Nombre, usuario, email y rol son requeridos' });
    }
    const chk = pool.request();
    chk.input('id', sql.Int, parseInt(lider_id));
    const r = await chk.query('SELECT rol FROM Lideres WHERE id = @id AND activo = 1');
    if (r.recordset[0]?.rol !== 'admin') return res.status(403).json({ error: 'Sin permisos' });
    const req2 = pool.request();
    req2.input('id', sql.Int, parseInt(req.params.id));
    req2.input('nombre', sql.VarChar, nombre);
    req2.input('usuario', sql.VarChar, usuario);
    req2.input('email', sql.VarChar, email);
    req2.input('rol', sql.VarChar, rol);
    req2.input('fecha_nacimiento', sql.Date, fecha_nacimiento || null);
    if (contrasena && contrasena.length >= 6) {
      const hash = await bcrypt.hash(contrasena, 10);
      req2.input('contrasena', sql.VarChar, hash);
      await req2.query(
        `UPDATE Lideres SET nombre=@nombre, usuario=@usuario, email=@email, rol=@rol,
         fecha_nacimiento=@fecha_nacimiento, contrasena=@contrasena WHERE id=@id`
      );
    } else {
      await req2.query(
        `UPDATE Lideres SET nombre=@nombre, usuario=@usuario, email=@email, rol=@rol,
         fecha_nacimiento=@fecha_nacimiento WHERE id=@id`
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Error editando líder:', err);
    if (err.originalError?.info?.message?.includes('UNIQUE')) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// ---- ADMIN: TOGGLE ACTIVO ----
app.patch('/api/lideres/:id/activo', async (req, res) => {
  try {
    const { lider_id, activo } = req.body;
    const chk = pool.request();
    chk.input('id', sql.Int, parseInt(lider_id));
    const r = await chk.query('SELECT rol FROM Lideres WHERE id = @id AND activo = 1');
    if (r.recordset[0]?.rol !== 'admin') return res.status(403).json({ error: 'Sin permisos' });
    const req2 = pool.request();
    req2.input('id', sql.Int, parseInt(req.params.id));
    req2.input('activo', sql.Bit, activo ? 1 : 0);
    await req2.query('UPDATE Lideres SET activo = @activo WHERE id = @id');
    res.json({ ok: true });
  } catch (err) {
    console.error('Error toggle activo:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// ---- ADMIN: LISTAR TODOS LOS DISCÍPULOS ----
app.get('/api/admin/discipulos', async (req, res) => {
  try {
    const lider_id = parseInt(req.query.lider_id);
    const chk = pool.request();
    chk.input('id', sql.Int, lider_id);
    const r = await chk.query('SELECT rol FROM Lideres WHERE id = @id AND activo = 1');
    if (r.recordset[0]?.rol !== 'admin') return res.status(403).json({ error: 'Sin permisos' });
    const result = await pool.request().query(
      `SELECT d.id, d.nombre, d.celular, d.lider_id, d.activo,
              CONVERT(VARCHAR(10), d.fecha_nacimiento, 23) AS fecha_nacimiento,
              l.nombre AS lider_nombre
       FROM Discipulos d
       JOIN Lideres l ON d.lider_id = l.id
       ORDER BY l.nombre, d.nombre`
    );
    res.json({ discipulos: result.recordset });
  } catch (err) {
    console.error('Error listando discípulos:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// ---- ADMIN: EDITAR DISCÍPULO ----
app.put('/api/discipulos/:id', async (req, res) => {
  try {
    const { lider_id, nombre, celular, fecha_nacimiento } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const chk = pool.request();
    chk.input('id', sql.Int, parseInt(lider_id));
    const r = await chk.query('SELECT rol FROM Lideres WHERE id = @id AND activo = 1');
    if (r.recordset[0]?.rol !== 'admin') return res.status(403).json({ error: 'Sin permisos' });
    const req2 = pool.request();
    req2.input('id', sql.Int, parseInt(req.params.id));
    req2.input('nombre', sql.VarChar, nombre);
    req2.input('celular', sql.VarChar, celular || '');
    req2.input('fecha_nacimiento', sql.Date, fecha_nacimiento || null);
    await req2.query(
      `UPDATE Discipulos SET nombre=@nombre, celular=@celular, fecha_nacimiento=@fecha_nacimiento WHERE id=@id`
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error editando discípulo:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// ---- ADMIN: TOGGLE ACTIVO DISCÍPULO ----
app.patch('/api/discipulos/:id/activo', async (req, res) => {
  try {
    const { lider_id, activo } = req.body;
    const chk = pool.request();
    chk.input('id', sql.Int, parseInt(lider_id));
    const r = await chk.query('SELECT rol FROM Lideres WHERE id = @id AND activo = 1');
    if (r.recordset[0]?.rol !== 'admin') return res.status(403).json({ error: 'Sin permisos' });
    const req2 = pool.request();
    req2.input('id', sql.Int, parseInt(req.params.id));
    req2.input('activo', sql.Bit, activo ? 1 : 0);
    await req2.query('UPDATE Discipulos SET activo = @activo WHERE id = @id');
    res.json({ ok: true });
  } catch (err) {
    console.error('Error toggle activo discípulo:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// ---- STATS: MENSUAL ----
app.get('/api/stats/mensual/:lider_id/:anio/:mes', async (req, res) => {
  try {
    const { lider_id, anio, mes } = req.params;
    const by = parseInt(req.query.by);
    const chk = pool.request();
    chk.input('by', sql.Int, by);
    const r = await chk.query('SELECT rol FROM Lideres WHERE id = @by AND activo = 1');
    if (r.recordset[0]?.rol !== 'admin') return res.status(403).json({ error: 'Sin permisos' });
    const r1 = pool.request();
    r1.input('lider_id', sql.Int, parseInt(lider_id));
    r1.input('anio', sql.Int, parseInt(anio));
    r1.input('mes', sql.Int, parseInt(mes));
    const asistencia = await r1.query(`
      SELECT d.id AS discipulo_id, d.nombre,
             CONVERT(VARCHAR(10), a.fecha, 23) AS fecha, a.presente
      FROM Discipulos d
      LEFT JOIN Asistencia a ON d.id = a.discipulo_id
        AND MONTH(a.fecha) = @mes AND YEAR(a.fecha) = @anio
      WHERE d.lider_id = @lider_id AND d.activo = 1
      ORDER BY d.nombre, a.fecha
    `);
    const r2 = pool.request();
    r2.input('lider_id', sql.Int, parseInt(lider_id));
    r2.input('anio', sql.Int, parseInt(anio));
    r2.input('mes', sql.Int, parseInt(mes));
    const reuniones = await r2.query(`
      SELECT CONVERT(VARCHAR(10), fecha, 23) AS fecha, observacion
      FROM Reuniones
      WHERE lider_id = @lider_id AND MONTH(fecha) = @mes AND YEAR(fecha) = @anio
      ORDER BY fecha
    `);
    const r3 = pool.request();
    r3.input('id', sql.Int, parseInt(lider_id));
    const liderInfo = await r3.query('SELECT nombre FROM Lideres WHERE id = @id');
    res.json({ lider: liderInfo.recordset[0], asistencia: asistencia.recordset, reuniones: reuniones.recordset });
  } catch (err) {
    console.error('Error stats mensual:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// ---- STATS: POR PERSONA ----
app.get('/api/stats/persona/:discipulo_id', async (req, res) => {
  try {
    const { discipulo_id } = req.params;
    const { desde, hasta, by } = req.query;
    const chk = pool.request();
    chk.input('by', sql.Int, parseInt(by));
    const r = await chk.query('SELECT rol FROM Lideres WHERE id = @by AND activo = 1');
    if (r.recordset[0]?.rol !== 'admin') return res.status(403).json({ error: 'Sin permisos' });
    const r1 = pool.request();
    r1.input('discipulo_id', sql.Int, parseInt(discipulo_id));
    r1.input('desde', sql.Date, desde);
    r1.input('hasta', sql.Date, hasta);
    const registros = await r1.query(`
      SELECT CONVERT(VARCHAR(10), a.fecha, 23) AS fecha, a.presente, a.observacion
      FROM Asistencia a
      WHERE a.discipulo_id = @discipulo_id
        AND CAST(a.fecha AS DATE) BETWEEN @desde AND @hasta
      ORDER BY a.fecha
    `);
    const r2 = pool.request();
    r2.input('id', sql.Int, parseInt(discipulo_id));
    const disc = await r2.query(`
      SELECT d.nombre, d.celular, l.nombre AS lider_nombre
      FROM Discipulos d JOIN Lideres l ON d.lider_id = l.id
      WHERE d.id = @id
    `);
    res.json({ registros: registros.recordset, discipulo: disc.recordset[0] });
  } catch (err) {
    console.error('Error stats persona:', err);
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
