-- Migración: Convertir columnas de texto a NVARCHAR para soporte de ñ y acentos
USE AsistenciaDB;

-- Lideres
ALTER TABLE Lideres ALTER COLUMN nombre    NVARCHAR(100) NOT NULL;
ALTER TABLE Lideres ALTER COLUMN usuario   NVARCHAR(50)  NOT NULL;
ALTER TABLE Lideres ALTER COLUMN email     NVARCHAR(100) NOT NULL;
ALTER TABLE Lideres ALTER COLUMN contrasena NVARCHAR(255) NOT NULL;
ALTER TABLE Lideres ALTER COLUMN rol       NVARCHAR(50)  NULL;
ALTER TABLE Lideres ALTER COLUMN celular   NVARCHAR(20)  NULL;

-- Grupos
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Grupos') AND name = 'nombre')
    ALTER TABLE Grupos ALTER COLUMN nombre   NVARCHAR(100) NOT NULL;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Grupos') AND name = 'dia')
    ALTER TABLE Grupos ALTER COLUMN dia      NVARCHAR(50)  NULL;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Grupos') AND name = 'horario')
    ALTER TABLE Grupos ALTER COLUMN horario  NVARCHAR(50)  NULL;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Grupos') AND name = 'lugar')
    ALTER TABLE Grupos ALTER COLUMN lugar    NVARCHAR(200) NULL;

-- Discipulos
ALTER TABLE Discipulos ALTER COLUMN nombre  NVARCHAR(100) NOT NULL;
ALTER TABLE Discipulos ALTER COLUMN celular NVARCHAR(20)  NULL;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Discipulos') AND name = 'observaciones')
    ALTER TABLE Discipulos ALTER COLUMN observaciones NVARCHAR(MAX) NULL;

-- Asistencia
ALTER TABLE Asistencia ALTER COLUMN celular     NVARCHAR(20)  NULL;
ALTER TABLE Asistencia ALTER COLUMN observacion NVARCHAR(500) NULL;

-- Reuniones
ALTER TABLE Reuniones ALTER COLUMN observacion NVARCHAR(1000) NULL;

-- EventosEspeciales (si existe)
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EventosEspeciales')
BEGIN
    ALTER TABLE EventosEspeciales ALTER COLUMN nombre      NVARCHAR(200) NOT NULL;
    ALTER TABLE EventosEspeciales ALTER COLUMN lugar       NVARCHAR(200) NULL;
    ALTER TABLE EventosEspeciales ALTER COLUMN observacion NVARCHAR(MAX) NULL;
END

PRINT 'Migración NVARCHAR completada OK';
