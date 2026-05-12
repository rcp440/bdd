-- ========================================
-- Script SQL Server - Asistencia al Grupo
-- ========================================

-- Crear base de datos
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'AsistenciaDB')
BEGIN
    CREATE DATABASE AsistenciaDB;
END;

GO

-- Usar la base de datos
USE AsistenciaDB;

GO

-- Tabla de Líderes
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Lideres')
BEGIN
    CREATE TABLE Lideres (
        id INT PRIMARY KEY IDENTITY(1,1),
        usuario VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        contrasena VARCHAR(255) NOT NULL,
        fecha_registro DATETIME DEFAULT GETDATE(),
        activo BIT DEFAULT 1
    );
    CREATE INDEX idx_usuario ON Lideres(usuario);
END;

GO

-- Tabla de Discípulos
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Discipulos')
BEGIN
    CREATE TABLE Discipulos (
        id INT PRIMARY KEY IDENTITY(1,1),
        lider_id INT NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        celular VARCHAR(20),
        fecha_registro DATETIME DEFAULT GETDATE(),
        activo BIT DEFAULT 1,
        FOREIGN KEY (lider_id) REFERENCES Lideres(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_lider ON Discipulos(lider_id);
END;

GO

-- Tabla de Asistencia
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Asistencia')
BEGIN
    CREATE TABLE Asistencia (
        id INT PRIMARY KEY IDENTITY(1,1),
        discipulo_id INT NOT NULL,
        lider_id INT NOT NULL,
        fecha DATETIME DEFAULT GETDATE(),
        presente BIT DEFAULT 0,
        celular VARCHAR(20),
        observacion VARCHAR(500),
        FOREIGN KEY (discipulo_id) REFERENCES Discipulos(id) ON DELETE CASCADE,
        FOREIGN KEY (lider_id) REFERENCES Lideres(id) ON DELETE CASCADE
    );
    CREATE INDEX idx_lider_fecha ON Asistencia(lider_id, fecha);
    CREATE INDEX idx_discipulo ON Asistencia(discipulo_id);
END;

GO

-- Tabla de Reuniones (observación por encuentro)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Reuniones')
BEGIN
    CREATE TABLE Reuniones (
        id INT PRIMARY KEY IDENTITY(1,1),
        lider_id INT NOT NULL,
        fecha DATE NOT NULL,
        observacion VARCHAR(1000),
        FOREIGN KEY (lider_id) REFERENCES Lideres(id) ON DELETE CASCADE,
        CONSTRAINT uq_reunion UNIQUE(lider_id, fecha)
    );
END;

GO

-- ========================================
-- Datos de prueba (usuario demo)
-- ========================================

-- Insertar líder demo (contraseña: demo123)
-- Hash bcrypt de "demo123": $2a$10$YourBcryptHashHere (usar bcryptjs para generar)
-- Para propósitos de este ejemplo, ejecuta primero el servidor para generar el hash

-- Script para generar hash (ejecuta en Node.js):
-- const bcrypt = require('bcryptjs');
-- bcrypt.hash('demo123', 10).then(hash => console.log(hash));

-- Insertar líder demo automáticamente
IF NOT EXISTS (SELECT * FROM Lideres WHERE usuario = 'demo')
BEGIN
    INSERT INTO Lideres (usuario, email, nombre, contrasena)
    VALUES ('demo', 'demo@example.com', 'Demo Líder', '$2a$10$5KZtA/FzZBeNmlTfkD.is.mh738PuNwDknc7AUgW4p0U5lh1yChhi');
END;

GO

DECLARE @demoLiderId INT = (SELECT id FROM Lideres WHERE usuario = 'demo');

IF NOT EXISTS (SELECT 1 FROM Discipulos WHERE lider_id = @demoLiderId AND nombre = 'Juan García')
BEGIN
    INSERT INTO Discipulos (lider_id, nombre, celular)
    VALUES
      (@demoLiderId, 'Juan García', '2996205606'),
      (@demoLiderId, 'María López', '2996205607'),
      (@demoLiderId, 'Carlos Rodríguez', '2996205608');
END;

GO

-- ========================================
-- Vistas útiles (opcional)
-- ========================================

-- Vista: Resumen de asistencia por líder
IF NOT EXISTS (SELECT * FROM sys.views WHERE name = 'vw_ResumenAsistencia')
BEGIN
    CREATE VIEW vw_ResumenAsistencia AS
    SELECT 
        l.id,
        l.nombre AS lider,
        CAST(a.fecha AS DATE) AS fecha,
        COUNT(DISTINCT a.discipulo_id) AS total_presentes,
        (SELECT COUNT(*) FROM Discipulos WHERE lider_id = l.id) AS total_discipulos
    FROM Lideres l
    LEFT JOIN Asistencia a ON l.id = a.lider_id AND a.presente = 1
    WHERE l.activo = 1
    GROUP BY l.id, l.nombre, CAST(a.fecha AS DATE);
END;

GO

PRINT '✅ Base de datos creada exitosamente!';
PRINT 'Próximos pasos:';
PRINT '1. Asegurate de tener SQL Server corriendo';
PRINT '2. Ejecuta: npm install';
PRINT '3. Configura el archivo .env con tus credenciales de SQL Server';
PRINT '4. Ejecuta: npm start';
