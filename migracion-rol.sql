-- =====================================================
-- Migración: Agregar columna ROL a la tabla Lideres
-- Ejecutar una sola vez en la base de datos existente
-- =====================================================

USE AsistenciaDB;
GO

IF NOT EXISTS (
    SELECT * FROM sys.columns
    WHERE object_id = OBJECT_ID('Lideres') AND name = 'rol'
)
BEGIN
    ALTER TABLE Lideres ADD rol VARCHAR(20) NOT NULL DEFAULT 'lider';
    PRINT 'Columna rol agregada correctamente.';
END
ELSE
BEGIN
    PRINT 'La columna rol ya existe.';
END
GO

-- Asignar rol admin al usuario que va a administrar el sistema.
-- Cambia ''demo'' por el usuario que quieras que sea admin:
-- UPDATE Lideres SET rol = 'admin' WHERE usuario = 'demo';

PRINT 'Recuerda ejecutar: UPDATE Lideres SET rol = ''admin'' WHERE usuario = ''tu_usuario_admin'';';
GO
