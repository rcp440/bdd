-- Migración: Convertir columnas de texto a NVARCHAR para soporte de ñ y acentos
USE AsistenciaDB;

-- ============================================================
-- Lideres: soltar índices/constraints antes de alterar columnas
-- ============================================================

-- Soltar índice idx_usuario si existe
IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('Lideres') AND name = 'idx_usuario')
    DROP INDEX idx_usuario ON Lideres;

-- Soltar constraint unique UQ_Lideres_usuario_inst si existe
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID('Lideres') AND name = 'UQ_Lideres_usuario_inst')
    ALTER TABLE Lideres DROP CONSTRAINT UQ_Lideres_usuario_inst;

-- Soltar constraint unique original si existe (por si no se corrió la migración anterior)
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID('Lideres') AND name = 'UQ__Lideres__usuario')
    ALTER TABLE Lideres DROP CONSTRAINT UQ__Lideres__usuario;

-- Soltar default constraint de 'rol' si existe (nombre autogenerado)
DECLARE @dfRol NVARCHAR(200);
SELECT @dfRol = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
WHERE dc.parent_object_id = OBJECT_ID('Lideres') AND c.name = 'rol';
IF @dfRol IS NOT NULL
    EXEC('ALTER TABLE Lideres DROP CONSTRAINT [' + @dfRol + ']');

-- Soltar default constraint de 'celular' si existe
DECLARE @dfCelular NVARCHAR(200);
SELECT @dfCelular = dc.name
FROM sys.default_constraints dc
JOIN sys.columns c ON dc.parent_object_id = c.object_id AND dc.parent_column_id = c.column_id
WHERE dc.parent_object_id = OBJECT_ID('Lideres') AND c.name = 'celular';
IF @dfCelular IS NOT NULL
    EXEC('ALTER TABLE Lideres DROP CONSTRAINT [' + @dfCelular + ']');

-- Ahora sí alterar columnas de Lideres
ALTER TABLE Lideres ALTER COLUMN nombre     NVARCHAR(100) NOT NULL;
ALTER TABLE Lideres ALTER COLUMN usuario    NVARCHAR(50)  NOT NULL;
ALTER TABLE Lideres ALTER COLUMN email      NVARCHAR(100) NOT NULL;
ALTER TABLE Lideres ALTER COLUMN contrasena NVARCHAR(255) NOT NULL;
ALTER TABLE Lideres ALTER COLUMN rol        NVARCHAR(50)  NULL;
ALTER TABLE Lideres ALTER COLUMN celular    NVARCHAR(20)  NULL;

-- Recrear índice y constraint unique compuesto
CREATE INDEX idx_usuario ON Lideres(usuario);

IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID('Lideres') AND name = 'UQ_Lideres_usuario_inst')
    ALTER TABLE Lideres ADD CONSTRAINT UQ_Lideres_usuario_inst UNIQUE (usuario, institucion_id);

-- ============================================================
-- Grupos
-- ============================================================
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Grupos') AND name = 'nombre')
    ALTER TABLE Grupos ALTER COLUMN nombre   NVARCHAR(100) NOT NULL;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Grupos') AND name = 'dia')
    ALTER TABLE Grupos ALTER COLUMN dia      NVARCHAR(50)  NULL;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Grupos') AND name = 'horario')
    ALTER TABLE Grupos ALTER COLUMN horario  NVARCHAR(50)  NULL;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Grupos') AND name = 'lugar')
    ALTER TABLE Grupos ALTER COLUMN lugar    NVARCHAR(200) NULL;

-- ============================================================
-- Discipulos
-- ============================================================
ALTER TABLE Discipulos ALTER COLUMN nombre  NVARCHAR(100) NOT NULL;
ALTER TABLE Discipulos ALTER COLUMN celular NVARCHAR(20)  NULL;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Discipulos') AND name = 'observaciones')
    ALTER TABLE Discipulos ALTER COLUMN observaciones NVARCHAR(MAX) NULL;

-- ============================================================
-- Asistencia
-- ============================================================
ALTER TABLE Asistencia ALTER COLUMN celular     NVARCHAR(20)  NULL;
ALTER TABLE Asistencia ALTER COLUMN observacion NVARCHAR(500) NULL;

-- ============================================================
-- Reuniones
-- ============================================================
ALTER TABLE Reuniones ALTER COLUMN observacion NVARCHAR(1000) NULL;

-- ============================================================
-- EventosEspeciales (si existe)
-- ============================================================
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EventosEspeciales')
BEGIN
    ALTER TABLE EventosEspeciales ALTER COLUMN nombre      NVARCHAR(200) NOT NULL;
    ALTER TABLE EventosEspeciales ALTER COLUMN lugar       NVARCHAR(200) NULL;
    ALTER TABLE EventosEspeciales ALTER COLUMN observacion NVARCHAR(MAX) NULL;
END

PRINT 'Migracion NVARCHAR completada OK';
