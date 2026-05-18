-- ============================================================
-- migration_eventos.sql
-- 1. Discipulos.lider_id nullable (discipulos sin lider asignado)
-- 2. Tabla EventosEspeciales
-- 3. Tabla EventoAsistencia
-- ============================================================

-- 1. Hacer lider_id nullable en Discipulos
DECLARE @fkName NVARCHAR(200);
SELECT @fkName = fk.name
FROM sys.foreign_keys fk
JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
JOIN sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
WHERE fk.parent_object_id = OBJECT_ID('Discipulos') AND c.name = 'lider_id';

IF @fkName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE Discipulos DROP CONSTRAINT ' + @fkName);
    PRINT 'FK lider_id eliminado.';
END

ALTER TABLE Discipulos ALTER COLUMN lider_id INT NULL;
PRINT 'lider_id ahora es nullable.';

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Discipulos_Lider')
BEGIN
    ALTER TABLE Discipulos ADD CONSTRAINT FK_Discipulos_Lider
    FOREIGN KEY (lider_id) REFERENCES Lideres(id);
    PRINT 'FK_Discipulos_Lider recreado.';
END

GO

-- 2. Tabla EventosEspeciales
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EventosEspeciales')
BEGIN
    CREATE TABLE EventosEspeciales (
        id             INT IDENTITY(1,1) PRIMARY KEY,
        institucion_id INT NOT NULL REFERENCES Instituciones(id),
        nombre         NVARCHAR(200) NOT NULL,
        fecha          DATE NOT NULL,
        lugar          NVARCHAR(200) NULL,
        observacion    NVARCHAR(MAX) NULL,
        monto          DECIMAL(10,2) NULL,
        created_at     DATETIME DEFAULT GETDATE()
    );
    CREATE INDEX IX_Eventos_inst ON EventosEspeciales(institucion_id);
    PRINT 'Tabla EventosEspeciales creada.';
END
ELSE
    PRINT 'EventosEspeciales ya existe.';

GO

-- 3. Tabla EventoAsistencia
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'EventoAsistencia')
BEGIN
    CREATE TABLE EventoAsistencia (
        id           INT IDENTITY(1,1) PRIMARY KEY,
        evento_id    INT NOT NULL REFERENCES EventosEspeciales(id) ON DELETE CASCADE,
        discipulo_id INT NOT NULL REFERENCES Discipulos(id),
        pago         DECIMAL(10,2) NULL,
        asistio      BIT DEFAULT 0,
        CONSTRAINT UQ_EventoDisc UNIQUE(evento_id, discipulo_id)
    );
    CREATE INDEX IX_EventoAsist ON EventoAsistencia(evento_id);
    PRINT 'Tabla EventoAsistencia creada.';
END
ELSE
    PRINT 'EventoAsistencia ya existe.';
