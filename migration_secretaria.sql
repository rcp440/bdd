-- Agrega columna observaciones a Discipulos para uso de la secretaria
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('Discipulos') AND name = 'observaciones'
)
BEGIN
    ALTER TABLE Discipulos ADD observaciones NVARCHAR(MAX) NULL;
    PRINT 'Columna observaciones agregada a Discipulos.';
END
ELSE
    PRINT 'La columna observaciones ya existe.';
