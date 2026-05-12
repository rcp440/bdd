-- Migración: agregar fecha_nacimiento a Lideres y Discipulos
USE AsistenciaDB;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Lideres') AND name = 'fecha_nacimiento')
BEGIN
    ALTER TABLE Lideres ADD fecha_nacimiento DATE NULL;
    PRINT 'Columna fecha_nacimiento agregada a Lideres';
END
ELSE
    PRINT 'Columna fecha_nacimiento ya existe en Lideres';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Discipulos') AND name = 'fecha_nacimiento')
BEGIN
    ALTER TABLE Discipulos ADD fecha_nacimiento DATE NULL;
    PRINT 'Columna fecha_nacimiento agregada a Discipulos';
END
ELSE
    PRINT 'Columna fecha_nacimiento ya existe en Discipulos';
