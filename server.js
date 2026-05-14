require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

// ==================== LOGIN ====================

app.post('/api/login', async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;
    if (!usuario || !contrasena) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    const request = pool.request();
    request.input('usuario', sql.VarChar, usuario);
    const result = await request.query(
      `SELECT id, usuario, email, nombre, celular, contrasena, rol,
              CONVERT(VARCHAR(10), fecha_nacimiento, 23) AS fecha_nacimiento
       FROM Lideres WHERE usuario = @usuario AND activo = 1`
    );

    if (!result.recordset.length) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const lider = result.recordset[0];
    const esValido = await bcrypt.compare(contrasena, lider.contrasena);
    if (!esValido) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const rGrupos = pool.request();
    rGrupos.input('lider_id', sql.Int, lider.id);
    const grupos = await rGrupos.query(
      'SELECT id, nombre, dia, horario, lugar FROM Grupos WHERE lider_id = @lider_id AND activo = 1 ORDER BY nombre'
    );

    res.json({
      ok: true,
      lider: {
        id: lider.id,
        usuario: lider.usuario,
        nombre: lider.nombre,
        email: lider.email,
        celular: lider.celular || '',
        fecha_nacimiento: lider.fecha_nacimiento || '',
        rol: lider.rol || 'lider'
      },
      grupos: grupos.recordset
    });

  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// ==================== REGISTRO ====================

app.post('/api/registro', async (req, res) => {
  try {
    const { usuario, email, nombre, contrasena } = req.body;
    if (!usuario || !email || !nombre || !contrasena) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(contrasena, salt);
    const request = pool.request();
    request.input('usuario', sql.VarChar, usuario);
    request.input('email', sql.VarChar, email);
    request.input('nombre', sql.VarChar, nombre);
    request.input('contrasena', sql.VarChar, hash);
    await request.query(
      `INSERT INTO Lideres (usuario, email, nombre, contrasena, fecha_registro)
       VALUES (@usuario, @email, @nombre, @contrasena, GETDATE())`
    );
    res.json({ ok: true, mensaje: 'Líder registrado exitosamente' });
  } catch (err) {
    console.error('Error en registro:', err);
    if (err.originalError?.info?.message?.includes('UNIQUE')) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// ==================== GRUPOS ====================

app.get('/api/grupos/:lider_id', async (req, res) => {
  try {
    const r = await pool.request()
      .input('lider_id', sql.Int, parseInt(req.params.lider_id))
      .query('SELECT id, nombre, dia, horario, lugar FROM Grupos WHERE lider_id = @lider_id AND activo = 1 ORDER BY nombre');
    res.json({ grupos: r.recordset });
  } catch (err) {
    console.error('Error listando grupos:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

app.post('/api/grupos', async (req, res) => {
  try {
    const { lider_id, nombre, dia, horario, lugar } = req.body;
    if (!lider_id || !nombre) return res.status(400).json({ error: 'lider_id y nombre requeridos' });
    const chk = await pool.request()
      .input('id', sql.Int, parseInt(lider_id))
      .query('SELECT id FROM Lideres WHERE id = @id AND activo = 1');
    if (!chk.recordset.length) return res.status(403).json({ error: 'Sin permisos' });
    const r = await pool.request()
      .input('lider_id', sql.Int, parseInt(lider_id))
      .input('nombre', sql.VarChar, nombre)
      .input('dia', sql.VarChar, dia || null)
      .input('horario', sql.VarChar, horario || null)
      .input('lugar', sql.VarChar, lugar || null)
      .query('INSERT INTO Grupos (lider_id, nombre, dia, horario, lugar) VALUES (@lider_id, @nombre, @dia, @horario, @lugar); SELECT CAST(SCOPE_IDENTITY() AS INT) AS id');
    res.json({ ok: true, id: r.recordset[0].id });
  } catch (err) {
    console.error('Error creando GC:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

app.put('/api/grupos/:id', async (req, res) => {
  try {
    const { lider_id, nombre, dia, horario, lugar } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const chk = await pool.request()
      .input('id', sql.Int, parseInt(req.params.id))
      .input('lider_id', sql.Int, parseInt(lider_id))
      .query('SELECT id FROM Grupos WHERE id = @id AND lider_id = @lider_id');
    if (!chk.recordset.length) return res.status(403).json({ error: 'Sin permisos' });
    await pool.request()
      .input('id', sql.Int, parseInt(req.params.id))
      .input('nombre', sql.VarChar, nombre)
      .input('dia', sql.VarChar, dia || null)
      .input('horario', sql.VarChar, horario || null)
      .input('lugar', sql.VarChar, lugar || null)
      .query('UPDATE Grupos SET nombre=@nombre, dia=@dia, horario=@horario, lugar=@lugar WHERE id=@id');
    res.json({ ok: true });
  } catch (err) {
    console.error('Error editando GC:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

app.patch('/api/grupos/:id/activo', async (req, res) => {
  try {
    const { lider_id, activo } = req.body;
    const chk = await pool.request()
      .input('id', sql.Int, parseInt(req.params.id))
      .input('lider_id', sql.Int, parseInt(lider_id))
      .query('SELECT id FROM Grupos WHERE id = @id AND lider_id = @lider_id');
    if (!chk.recordset.length) return res.status(403).json({ error: 'Sin permisos' });
    await pool.request()
      .input('id', sql.Int, parseInt(req.params.id))
      .input('activo', sql.Bit, activo ? 1 : 0)
      .query('UPDATE Grupos SET activo = @activo WHERE id = @id');
    res.json({ ok: true });
  } catch (err) {
    console.error('Error toggle grupo:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// ==================== DISCÍPULOS ====================

// IMPORTANTE: rutas específicas antes que /:lider_id

// Búsqueda de discípulos (solo pastoral/admin)
app.get('/api/discipulos/buscar', async (req, res) => {
  try {
    const { q, lider_id, filtro_lider_id } = req.query;
    const rol = await getRolLider(lider_id);
    if (!esPastoral(rol)) return res.status(403).json({ error: 'Sin permisos' });

    const tieneNombre = q && q.trim().length >= 2;
    const tieneLider  = filtro_lider_id && parseInt(filtro_lider_id);

    // Sin ningún filtro: retornar vacío
    if (!tieneNombre && !tieneLider) return res.json({ discipulos: [] });

    const req2 = pool.request();
    req2.input('filtro_lider_id', sql.Int, tieneLider ? parseInt(filtro_lider_id) : null);
    req2.input('q', sql.NVarChar(100), tieneNombre ? `%${q.trim()}%` : null);

    const result = await req2.query(`
      SELECT d.id, d.nombre, d.celular,
             l.nombre AS lider_nombre,
             g.nombre AS grupo_nombre
      FROM Discipulos d
      JOIN Lideres l ON d.lider_id = l.id
      LEFT JOIN Grupos g ON d.grupo_id = g.id
      WHERE d.activo = 1
        AND (@filtro_lider_id IS NULL OR d.lider_id = @filtro_lider_id)
        AND (@q IS NULL OR d.nombre LIKE @q)
      ORDER BY d.nombre
    `);
    res.json({ discipulos: result.recordset });
  } catch (err) {
    console.error('Error buscar discipulos:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// Lista de líderes activos (pastoral/admin)
app.get('/api/lideres/activos', async (req, res) => {
  try {
    const { lider_id } = req.query;
    const rol = await getRolLider(lider_id);
    if (!esPastoral(rol)) return res.status(403).json({ error: 'Sin permisos' });
    const result = await pool.request().query(
      `SELECT id, nombre FROM Lideres WHERE activo = 1 ORDER BY nombre`
    );
    res.json({ lideres: result.recordset });
  } catch (err) {
    console.error('Error listando líderes activos:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

app.get('/api/discipulos/grupo/:grupo_id', async (req, res) => {
  try {
    const r = await pool.request()
      .input('grupo_id', sql.Int, parseInt(req.params.grupo_id))
      .query(
        `SELECT id, nombre, celular, CONVERT(VARCHAR(10), fecha_nacimiento, 23) AS fecha_nacimiento
         FROM Discipulos WHERE grupo_id = @grupo_id AND activo = 1 ORDER BY nombre`
      );
    res.json({ discipulos: r.recordset });
  } catch (err) {
    console.error('Error obteniendo discípulos:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

app.post('/api/discipulos', async (req, res) => {
  try {
    const { grupo_id, nombre, celular, fecha_nacimiento } = req.body;
    if (!grupo_id || !nombre) return res.status(400).json({ error: 'grupo_id y nombre requeridos' });

    const g = await pool.request()
      .input('id', sql.Int, parseInt(grupo_id))
      .query('SELECT lider_id FROM Grupos WHERE id = @id AND activo = 1');
    if (!g.recordset.length) return res.status(400).json({ error: 'Grupo no encontrado' });
    const lider_id = g.recordset[0].lider_id;

    const r = await pool.request()
      .input('grupo_id', sql.Int, parseInt(grupo_id))
      .input('lider_id', sql.Int, lider_id)
      .input('nombre', sql.VarChar, nombre)
      .input('celular', sql.VarChar, celular || '')
      .input('fecha_nacimiento', sql.Date, fecha_nacimiento || null)
      .query(
        `INSERT INTO Discipulos (lider_id, grupo_id, nombre, celular, fecha_nacimiento)
         VALUES (@lider_id, @grupo_id, @nombre, @celular, @fecha_nacimiento);
         SELECT CAST(SCOPE_IDENTITY() AS INT) AS id;`
      );

    res.json({ ok: true, id: r.recordset[0].id });
  } catch (err) {
    console.error('Error agregando discípulo:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// Ruta legacy por lider_id (admin)
app.get('/api/discipulos/:lider_id', async (req, res) => {
  try {
    const r = await pool.request()
      .input('lider_id', sql.Int, parseInt(req.params.lider_id))
      .query(
        `SELECT id, nombre, celular, CONVERT(VARCHAR(10), fecha_nacimiento, 23) AS fecha_nacimiento
         FROM Discipulos WHERE lider_id = @lider_id AND activo = 1 ORDER BY nombre`
      );
    res.json({ discipulos: r.recordset });
  } catch (err) {
    console.error('Error obteniendo discípulos:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// ==================== ASISTENCIA ====================

// IMPORTANTE: ruta específica antes que /:lider_id/:fecha
app.get('/api/asistencia/grupo/:grupo_id/:fecha', async (req, res) => {
  try {
    const r = await pool.request()
      .input('grupo_id', sql.Int, parseInt(req.params.grupo_id))
      .input('fecha', sql.Date, req.params.fecha)
      .query(`
        SELECT a.discipulo_id, d.nombre, a.presente, a.celular, a.observacion
        FROM Asistencia a
        JOIN Discipulos d ON a.discipulo_id = d.id
        WHERE a.grupo_id = @grupo_id AND CAST(a.fecha AS DATE) = @fecha
      `);
    res.json({ registros: r.recordset });
  } catch (err) {
    console.error('Error obteniendo asistencia:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

app.post('/api/asistencia', async (req, res) => {
  try {
    const { grupo_id, fecha, registros } = req.body;
    if (!grupo_id || !fecha || !registros) return res.status(400).json({ error: 'Datos incompletos' });

    const fechaObj = new Date(fecha + 'T12:00:00');
    if (Number.isNaN(fechaObj.getTime())) return res.status(400).json({ error: 'Fecha inválida' });

    const g = await pool.request()
      .input('id', sql.Int, parseInt(grupo_id))
      .query('SELECT lider_id FROM Grupos WHERE id = @id');
    const lider_id = g.recordset[0]?.lider_id;

    await pool.request()
      .input('grupo_id', sql.Int, parseInt(grupo_id))
      .input('fecha', sql.Date, fechaObj)
      .query('DELETE FROM Asistencia WHERE grupo_id = @grupo_id AND CAST(fecha AS DATE) = @fecha');

    for (const reg of registros) {
      const discipuloId = reg.discipulo_id ?? reg.id;
      const discipuloNum = Number(discipuloId);
      if (!discipuloId || Number.isNaN(discipuloNum)) {
        return res.status(400).json({ error: 'Cada registro debe tener un discipulo_id válido', registro: reg });
      }
      await pool.request()
        .input('discipulo_id', sql.Int, discipuloNum)
        .input('grupo_id', sql.Int, parseInt(grupo_id))
        .input('lider_id', sql.Int, lider_id)
        .input('fecha', sql.DateTime, fechaObj)
        .input('presente', sql.Bit, reg.presente ? 1 : 0)
        .input('celular', sql.VarChar, reg.celular || '')
        .input('observacion', sql.VarChar, reg.observacion || '')
        .query(
          `INSERT INTO Asistencia (discipulo_id, grupo_id, lider_id, fecha, presente, celular, observacion)
           VALUES (@discipulo_id, @grupo_id, @lider_id, @fecha, @presente, @celular, @observacion)`
        );
    }

    res.json({ ok: true, mensaje: 'Asistencia guardada' });
  } catch (err) {
    console.error('Error guardando asistencia:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// Ruta legacy por lider_id
app.get('/api/asistencia/:lider_id/:fecha', async (req, res) => {
  try {
    const r = await pool.request()
      .input('lider_id', sql.Int, parseInt(req.params.lider_id))
      .input('fecha', sql.Date, req.params.fecha)
      .query(`
        SELECT a.discipulo_id, d.nombre, a.presente, a.celular, a.observacion
        FROM Asistencia a
        JOIN Discipulos d ON a.discipulo_id = d.id
        WHERE a.lider_id = @lider_id AND CAST(a.fecha AS DATE) = @fecha
      `);
    res.json({ registros: r.recordset });
  } catch (err) {
    console.error('Error obteniendo asistencia:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// ==================== REUNIONES ====================

// IMPORTANTE: ruta específica antes que /:lider_id/:fecha
app.get('/api/reunion/grupo/:grupo_id/:fecha', async (req, res) => {
  try {
    const r = await pool.request()
      .input('grupo_id', sql.Int, parseInt(req.params.grupo_id))
      .input('fecha', sql.Date, req.params.fecha)
      .query('SELECT observacion FROM Reuniones WHERE grupo_id = @grupo_id AND fecha = @fecha');
    res.json({ observacion: r.recordset[0]?.observacion || '' });
  } catch (err) {
    console.error('Error obteniendo reunión:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

app.post('/api/reunion', async (req, res) => {
  try {
    const { grupo_id, fecha, observacion } = req.body;
    const fechaObj = new Date(fecha + 'T12:00:00');

    const g = await pool.request()
      .input('id', sql.Int, parseInt(grupo_id))
      .query('SELECT lider_id FROM Grupos WHERE id = @id');
    const lider_id = g.recordset[0]?.lider_id;

    await pool.request()
      .input('grupo_id', sql.Int, parseInt(grupo_id))
      .input('lider_id', sql.Int, lider_id)
      .input('fecha', sql.Date, fechaObj)
      .input('observacion', sql.VarChar, observacion || '')
      .query(`
        IF EXISTS (SELECT 1 FROM Reuniones WHERE grupo_id = @grupo_id AND fecha = @fecha)
          UPDATE Reuniones SET observacion = @observacion WHERE grupo_id = @grupo_id AND fecha = @fecha
        ELSE
          INSERT INTO Reuniones (grupo_id, lider_id, fecha, observacion) VALUES (@grupo_id, @lider_id, @fecha, @observacion)
      `);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error guardando reunión:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// Ruta legacy por lider_id
app.get('/api/reunion/:lider_id/:fecha', async (req, res) => {
  try {
    const r = await pool.request()
      .input('lider_id', sql.Int, parseInt(req.params.lider_id))
      .input('fecha', sql.Date, req.params.fecha)
      .query('SELECT observacion FROM Reuniones WHERE lider_id = @lider_id AND fecha = @fecha');
    res.json({ observacion: r.recordset[0]?.observacion || '' });
  } catch (err) {
    console.error('Error obteniendo reunión:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// ==================== ADMIN: LÍDERES ====================

app.get('/api/lideres', async (req, res) => {
  try {
    const lider_id = parseInt(req.query.lider_id);
    const chk = await pool.request()
      .input('id', sql.Int, lider_id)
      .query('SELECT rol FROM Lideres WHERE id = @id AND activo = 1');
    if (chk.recordset[0]?.rol !== 'admin') return res.status(403).json({ error: 'Sin permisos' });
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

app.post('/api/lideres', async (req, res) => {
  try {
    const { lider_id, nombre, usuario, email, contrasena, rol, fecha_nacimiento } = req.body;
    if (!nombre || !usuario || !email || !contrasena) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    const chk = await pool.request()
      .input('id', sql.Int, parseInt(lider_id))
      .query('SELECT rol FROM Lideres WHERE id = @id AND activo = 1');
    if (chk.recordset[0]?.rol !== 'admin') return res.status(403).json({ error: 'Sin permisos' });
    const hash = await bcrypt.hash(contrasena, 10);
    await pool.request()
      .input('nombre', sql.VarChar, nombre)
      .input('usuario', sql.VarChar, usuario)
      .input('email', sql.VarChar, email)
      .input('contrasena', sql.VarChar, hash)
      .input('rol', sql.VarChar, rol || 'lider')
      .input('fecha_nacimiento', sql.Date, fecha_nacimiento || null)
      .query(
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

app.put('/api/lideres/:id', async (req, res) => {
  try {
    const { lider_id, nombre, usuario, email, rol, contrasena, fecha_nacimiento } = req.body;
    if (!nombre || !usuario || !email || !rol) {
      return res.status(400).json({ error: 'Nombre, usuario, email y rol son requeridos' });
    }
    const chk = await pool.request()
      .input('id', sql.Int, parseInt(lider_id))
      .query('SELECT rol FROM Lideres WHERE id = @id AND activo = 1');
    if (chk.recordset[0]?.rol !== 'admin') return res.status(403).json({ error: 'Sin permisos' });
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

app.patch('/api/lideres/:id/activo', async (req, res) => {
  try {
    const { lider_id, activo } = req.body;
    const chk = await pool.request()
      .input('id', sql.Int, parseInt(lider_id))
      .query('SELECT rol FROM Lideres WHERE id = @id AND activo = 1');
    if (chk.recordset[0]?.rol !== 'admin') return res.status(403).json({ error: 'Sin permisos' });
    await pool.request()
      .input('id', sql.Int, parseInt(req.params.id))
      .input('activo', sql.Bit, activo ? 1 : 0)
      .query('UPDATE Lideres SET activo = @activo WHERE id = @id');
    res.json({ ok: true });
  } catch (err) {
    console.error('Error toggle activo:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

app.put('/api/lideres/:id/perfil', async (req, res) => {
  try {
    const { lider_id, nombre, email, celular, fecha_nacimiento } = req.body;
    if (parseInt(req.params.id) !== parseInt(lider_id)) {
      return res.status(403).json({ error: 'Sin permisos' });
    }
    if (!nombre || !email) return res.status(400).json({ error: 'Nombre y email son requeridos' });
    const chk = await pool.request()
      .input('id', sql.Int, parseInt(lider_id))
      .query('SELECT id FROM Lideres WHERE id = @id AND activo = 1');
    if (!chk.recordset.length) return res.status(403).json({ error: 'Sin permisos' });
    await pool.request()
      .input('id', sql.Int, parseInt(req.params.id))
      .input('nombre', sql.VarChar, nombre)
      .input('email', sql.VarChar, email)
      .input('celular', sql.VarChar, celular || '')
      .input('fecha_nacimiento', sql.Date, fecha_nacimiento || null)
      .query(
        `UPDATE Lideres SET nombre=@nombre, email=@email, celular=@celular, fecha_nacimiento=@fecha_nacimiento WHERE id=@id`
      );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error editando perfil:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// ==================== ADMIN: DISCÍPULOS ====================

app.get('/api/admin/discipulos', async (req, res) => {
  try {
    const lider_id = parseInt(req.query.lider_id);
    const chk = await pool.request()
      .input('id', sql.Int, lider_id)
      .query('SELECT rol FROM Lideres WHERE id = @id AND activo = 1');
    if (chk.recordset[0]?.rol !== 'admin') return res.status(403).json({ error: 'Sin permisos' });
    const result = await pool.request().query(
      `SELECT d.id, d.nombre, d.celular, d.lider_id, d.grupo_id, d.activo,
              CONVERT(VARCHAR(10), d.fecha_nacimiento, 23) AS fecha_nacimiento,
              l.nombre AS lider_nombre,
              g.nombre AS grupo_nombre
       FROM Discipulos d
       JOIN Lideres l ON d.lider_id = l.id
       LEFT JOIN Grupos g ON d.grupo_id = g.id
       ORDER BY l.nombre, g.nombre, d.nombre`
    );
    res.json({ discipulos: result.recordset });
  } catch (err) {
    console.error('Error listando discípulos:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

app.put('/api/discipulos/:id', async (req, res) => {
  try {
    const { lider_id, nombre, celular, fecha_nacimiento, grupo_id } = req.body;
    if (!nombre && !grupo_id) return res.status(400).json({ error: 'Nombre o grupo_id requerido' });
    const chk = await pool.request()
      .input('id', sql.Int, parseInt(lider_id))
      .query('SELECT rol FROM Lideres WHERE id = @id AND activo = 1');
    const isAdmin = chk.recordset[0]?.rol === 'admin';
    if (!isAdmin) {
      const own = await pool.request()
        .input('disc_id', sql.Int, parseInt(req.params.id))
        .input('lider_id', sql.Int, parseInt(lider_id))
        .query('SELECT id FROM Discipulos WHERE id = @disc_id AND lider_id = @lider_id');
      if (!own.recordset.length) return res.status(403).json({ error: 'Sin permisos' });
    }
    const req2 = pool.request();
    req2.input('id', sql.Int, parseInt(req.params.id));
    req2.input('nombre', sql.VarChar, nombre || '');
    req2.input('celular', sql.VarChar, celular || '');
    req2.input('fecha_nacimiento', sql.Date, fecha_nacimiento || null);
    if (grupo_id) {
      req2.input('grupo_id', sql.Int, parseInt(grupo_id));
      await req2.query(
        `UPDATE Discipulos SET nombre=CASE WHEN @nombre='' THEN nombre ELSE @nombre END, celular=@celular, fecha_nacimiento=@fecha_nacimiento, grupo_id=@grupo_id WHERE id=@id`
      );
    } else {
      await req2.query(
        `UPDATE Discipulos SET nombre=@nombre, celular=@celular, fecha_nacimiento=@fecha_nacimiento WHERE id=@id`
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Error editando discípulo:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

app.patch('/api/discipulos/:id/activo', async (req, res) => {
  try {
    const { lider_id, activo } = req.body;
    const chk = await pool.request()
      .input('id', sql.Int, parseInt(lider_id))
      .query('SELECT rol FROM Lideres WHERE id = @id AND activo = 1');
    const isAdmin = chk.recordset[0]?.rol === 'admin';
    if (!isAdmin) {
      const own = await pool.request()
        .input('disc_id', sql.Int, parseInt(req.params.id))
        .input('lider_id', sql.Int, parseInt(lider_id))
        .query('SELECT id FROM Discipulos WHERE id = @disc_id AND lider_id = @lider_id');
      if (!own.recordset.length) return res.status(403).json({ error: 'Sin permisos' });
    }
    await pool.request()
      .input('id', sql.Int, parseInt(req.params.id))
      .input('activo', sql.Bit, activo ? 1 : 0)
      .query('UPDATE Discipulos SET activo = @activo WHERE id = @id');
    res.json({ ok: true });
  } catch (err) {
    console.error('Error toggle activo discípulo:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// ==================== STATS ====================

// IMPORTANTE: ruta específica antes que /:lider_id/:anio/:mes
app.get('/api/stats/mensual/grupo/:grupo_id/:anio/:mes', async (req, res) => {
  try {
    const { grupo_id, anio, mes } = req.params;
    const by = parseInt(req.query.by);
    const chk = await pool.request()
      .input('by', sql.Int, by)
      .query('SELECT rol FROM Lideres WHERE id = @by AND activo = 1');
    if (chk.recordset[0]?.rol !== 'admin') return res.status(403).json({ error: 'Sin permisos' });

    const asistencia = await pool.request()
      .input('grupo_id', sql.Int, parseInt(grupo_id))
      .input('anio', sql.Int, parseInt(anio))
      .input('mes', sql.Int, parseInt(mes))
      .query(`
        SELECT d.id AS discipulo_id, d.nombre,
               CONVERT(VARCHAR(10), a.fecha, 23) AS fecha, a.presente
        FROM Discipulos d
        LEFT JOIN Asistencia a ON d.id = a.discipulo_id
          AND MONTH(a.fecha) = @mes AND YEAR(a.fecha) = @anio
        WHERE d.grupo_id = @grupo_id AND d.activo = 1
        ORDER BY d.nombre, a.fecha
      `);

    const reuniones = await pool.request()
      .input('grupo_id', sql.Int, parseInt(grupo_id))
      .input('anio', sql.Int, parseInt(anio))
      .input('mes', sql.Int, parseInt(mes))
      .query(`
        SELECT CONVERT(VARCHAR(10), fecha, 23) AS fecha, observacion
        FROM Reuniones
        WHERE grupo_id = @grupo_id AND MONTH(fecha) = @mes AND YEAR(fecha) = @anio
        ORDER BY fecha
      `);

    const grupoInfo = await pool.request()
      .input('id', sql.Int, parseInt(grupo_id))
      .query(`
        SELECT g.nombre AS grupo_nombre, l.nombre AS lider_nombre
        FROM Grupos g JOIN Lideres l ON g.lider_id = l.id
        WHERE g.id = @id
      `);

    res.json({
      grupo: grupoInfo.recordset[0],
      asistencia: asistencia.recordset,
      reuniones: reuniones.recordset
    });
  } catch (err) {
    console.error('Error stats mensual grupo:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// Informe de entrevistas entre fechas (admin/pastoral)
app.get('/api/stats/entrevistas', async (req, res) => {
  try {
    const { desde, hasta, by, filtro_lider_id } = req.query;
    const rol = await getRolLider(by);
    if (!esPastoral(rol)) return res.status(403).json({ error: 'Sin permisos' });
    if (!desde || !hasta) return res.status(400).json({ error: 'Fechas requeridas' });

    const req2 = pool.request()
      .input('desde', sql.Date, desde)
      .input('hasta', sql.Date, hasta)
      .input('filtro_lider_id', sql.Int, filtro_lider_id ? parseInt(filtro_lider_id) : null);

    const result = await req2.query(`
      SELECT d.nombre AS discipulo,
             l.nombre AS lider,
             g.nombre AS gc,
             CONVERT(VARCHAR(10), e.fecha, 23) AS fecha,
             e.horario, e.lugar, e.temas,
             le.nombre AS entrevistador
      FROM Entrevistas e
      JOIN Discipulos d ON e.discipulo_id = d.id
      JOIN Lideres l ON d.lider_id = l.id
      LEFT JOIN Grupos g ON d.grupo_id = g.id
      JOIN Lideres le ON e.lider_id = le.id
      WHERE CAST(e.fecha AS DATE) BETWEEN @desde AND @hasta
        AND (@filtro_lider_id IS NULL OR d.lider_id = @filtro_lider_id)
      ORDER BY e.fecha DESC, d.nombre
    `);
    res.json({ entrevistas: result.recordset });
  } catch (err) {
    console.error('Error stats entrevistas:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// Ruta legacy por lider_id
app.get('/api/stats/mensual/:lider_id/:anio/:mes', async (req, res) => {
  try {
    const { lider_id, anio, mes } = req.params;
    const by = parseInt(req.query.by);
    const chk = await pool.request()
      .input('by', sql.Int, by)
      .query('SELECT rol FROM Lideres WHERE id = @by AND activo = 1');
    if (chk.recordset[0]?.rol !== 'admin') return res.status(403).json({ error: 'Sin permisos' });

    const asistencia = await pool.request()
      .input('lider_id', sql.Int, parseInt(lider_id))
      .input('anio', sql.Int, parseInt(anio))
      .input('mes', sql.Int, parseInt(mes))
      .query(`
        SELECT d.id AS discipulo_id, d.nombre,
               CONVERT(VARCHAR(10), a.fecha, 23) AS fecha, a.presente
        FROM Discipulos d
        LEFT JOIN Asistencia a ON d.id = a.discipulo_id
          AND MONTH(a.fecha) = @mes AND YEAR(a.fecha) = @anio
        WHERE d.lider_id = @lider_id AND d.activo = 1
        ORDER BY d.nombre, a.fecha
      `);

    const reuniones = await pool.request()
      .input('lider_id', sql.Int, parseInt(lider_id))
      .input('anio', sql.Int, parseInt(anio))
      .input('mes', sql.Int, parseInt(mes))
      .query(`
        SELECT CONVERT(VARCHAR(10), fecha, 23) AS fecha, observacion
        FROM Reuniones
        WHERE lider_id = @lider_id AND MONTH(fecha) = @mes AND YEAR(fecha) = @anio
        ORDER BY fecha
      `);

    const liderInfo = await pool.request()
      .input('id', sql.Int, parseInt(lider_id))
      .query('SELECT nombre FROM Lideres WHERE id = @id');

    res.json({
      lider: liderInfo.recordset[0],
      asistencia: asistencia.recordset,
      reuniones: reuniones.recordset
    });
  } catch (err) {
    console.error('Error stats mensual:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

app.get('/api/stats/persona/:discipulo_id', async (req, res) => {
  try {
    const { discipulo_id } = req.params;
    const { desde, hasta, by } = req.query;
    const chk = await pool.request()
      .input('by', sql.Int, parseInt(by))
      .query('SELECT rol FROM Lideres WHERE id = @by AND activo = 1');
    if (chk.recordset[0]?.rol !== 'admin') return res.status(403).json({ error: 'Sin permisos' });

    const registros = await pool.request()
      .input('discipulo_id', sql.Int, parseInt(discipulo_id))
      .input('desde', sql.Date, desde)
      .input('hasta', sql.Date, hasta)
      .query(`
        SELECT CONVERT(VARCHAR(10), a.fecha, 23) AS fecha, a.presente, a.observacion
        FROM Asistencia a
        WHERE a.discipulo_id = @discipulo_id
          AND CAST(a.fecha AS DATE) BETWEEN @desde AND @hasta
        ORDER BY a.fecha
      `);

    const disc = await pool.request()
      .input('id', sql.Int, parseInt(discipulo_id))
      .query(`
        SELECT d.nombre, d.celular, l.nombre AS lider_nombre, g.nombre AS grupo_nombre
        FROM Discipulos d
        JOIN Lideres l ON d.lider_id = l.id
        LEFT JOIN Grupos g ON d.grupo_id = g.id
        WHERE d.id = @id
      `);

    res.json({ registros: registros.recordset, discipulo: disc.recordset[0] });
  } catch (err) {
    console.error('Error stats persona:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

// ==================== ENTREVISTAS ====================

async function getRolLider(lider_id) {
  const r = await pool.request()
    .input('id', sql.Int, parseInt(lider_id))
    .query('SELECT rol FROM Lideres WHERE id = @id AND activo = 1');
  return r.recordset[0]?.rol || 'lider';
}

function esPastoral(rol) { return rol === 'pastoral' || rol === 'admin'; }

app.get('/api/entrevistas/discipulo/:discipulo_id', async (req, res) => {
  try {
    const { discipulo_id } = req.params;
    const { lider_id } = req.query;
    // Verificar acceso: propio grupo o rol pastoral/admin
    const rol = lider_id ? await getRolLider(lider_id) : 'lider';
    if (!esPastoral(rol) && lider_id) {
      const chk = await pool.request()
        .input('discipulo_id', sql.Int, parseInt(discipulo_id))
        .input('lider_id',     sql.Int, parseInt(lider_id))
        .query('SELECT id FROM Discipulos WHERE id = @discipulo_id AND lider_id = @lider_id AND activo = 1');
      if (!chk.recordset.length) return res.status(403).json({ error: 'Sin permisos' });
    }
    const result = await pool.request()
      .input('discipulo_id', sql.Int, parseInt(discipulo_id))
      .query(`
        SELECT e.id,
               CONVERT(VARCHAR(10), e.fecha, 23) AS fecha,
               e.horario, e.lugar, e.temas,
               l.nombre AS entrevistador,
               CONVERT(VARCHAR(10), e.created_at, 23) AS created_at
        FROM Entrevistas e
        JOIN Lideres l ON e.lider_id = l.id
        WHERE e.discipulo_id = @discipulo_id
        ORDER BY e.fecha DESC, e.created_at DESC
      `);
    res.json({ entrevistas: result.recordset });
  } catch (err) {
    console.error('Error get entrevistas:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

app.post('/api/entrevistas', async (req, res) => {
  try {
    const { discipulo_id, grupo_id, lider_id, fecha, horario, lugar, temas } = req.body;
    if (!discipulo_id || !lider_id || !fecha) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    const rol = await getRolLider(lider_id);

    // Resolver grupo_id: pastoral puede no enviar grupo_id
    let resolvedGrupoId = grupo_id ? parseInt(grupo_id) : null;
    if (!esPastoral(rol)) {
      // Lider normal: verificar que el discípulo pertenece a su grupo
      const chk = await pool.request()
        .input('discipulo_id', sql.Int, parseInt(discipulo_id))
        .input('grupo_id',     sql.Int, resolvedGrupoId)
        .query('SELECT id FROM Discipulos WHERE id = @discipulo_id AND grupo_id = @grupo_id AND activo = 1');
      if (!chk.recordset.length) return res.status(403).json({ error: 'Discípulo no pertenece a este GC' });
    } else if (!resolvedGrupoId) {
      // Pastoral sin grupo_id: obtener grupo del discípulo
      const d = await pool.request()
        .input('id', sql.Int, parseInt(discipulo_id))
        .query('SELECT grupo_id FROM Discipulos WHERE id = @id AND activo = 1');
      resolvedGrupoId = d.recordset[0]?.grupo_id || null;
    }

    const result = await pool.request()
      .input('discipulo_id', sql.Int, parseInt(discipulo_id))
      .input('grupo_id',     sql.Int, resolvedGrupoId)
      .input('lider_id',     sql.Int, parseInt(lider_id))
      .input('fecha',        sql.Date, fecha)
      .input('horario',      sql.NVarChar(10),  horario || null)
      .input('lugar',        sql.NVarChar(100), lugar   || null)
      .input('temas',        sql.NVarChar(sql.MAX), temas || null)
      .query(`
        INSERT INTO Entrevistas (discipulo_id, grupo_id, lider_id, fecha, horario, lugar, temas)
        OUTPUT INSERTED.id
        VALUES (@discipulo_id, @grupo_id, @lider_id, @fecha, @horario, @lugar, @temas)
      `);
    res.status(201).json({ id: result.recordset[0].id });
  } catch (err) {
    console.error('Error post entrevista:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

app.put('/api/entrevistas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { lider_id, fecha, horario, lugar, temas } = req.body;
    const rol = await getRolLider(lider_id);
    if (!esPastoral(rol)) {
      const chk = await pool.request()
        .input('id',       sql.Int, parseInt(id))
        .input('lider_id', sql.Int, parseInt(lider_id))
        .query('SELECT id FROM Entrevistas WHERE id = @id AND lider_id = @lider_id');
      if (!chk.recordset.length) return res.status(403).json({ error: 'Sin permisos' });
    }
    await pool.request()
      .input('id',      sql.Int, parseInt(id))
      .input('fecha',   sql.Date, fecha)
      .input('horario', sql.NVarChar(10),  horario || null)
      .input('lugar',   sql.NVarChar(100), lugar   || null)
      .input('temas',   sql.NVarChar(sql.MAX), temas || null)
      .query('UPDATE Entrevistas SET fecha=@fecha, horario=@horario, lugar=@lugar, temas=@temas WHERE id=@id');
    res.json({ ok: true });
  } catch (err) {
    console.error('Error put entrevista:', err);
    res.status(500).json({ error: 'Error en servidor' });
  }
});

app.delete('/api/entrevistas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { lider_id } = req.body;
    const rol = await getRolLider(lider_id);
    if (!esPastoral(rol)) {
      const chk = await pool.request()
        .input('id',       sql.Int, parseInt(id))
        .input('lider_id', sql.Int, parseInt(lider_id))
        .query('SELECT id FROM Entrevistas WHERE id = @id AND lider_id = @lider_id');
      if (!chk.recordset.length) return res.status(403).json({ error: 'Sin permisos' });
    }
    await pool.request()
      .input('id', sql.Int, parseInt(id))
      .query('DELETE FROM Entrevistas WHERE id = @id');
    res.json({ ok: true });
  } catch (err) {
    console.error('Error delete entrevista:', err);
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

process.on('SIGINT', async () => {
  console.log('\n📴 Cerrando conexión...');
  if (pool) await pool.close();
  process.exit(0);
});
