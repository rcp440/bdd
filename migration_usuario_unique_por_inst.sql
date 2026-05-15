-- Cambia el UNIQUE constraint de usuario (global) a compuesto (usuario, institucion_id)
-- para permitir el mismo nombre de usuario en distintas instituciones.

-- 1. Buscar y borrar el constraint UNIQUE existente sobre 'usuario'
DECLARE @constraintName NVARCHAR(200);

SELECT @constraintName = name
FROM sys.key_constraints
WHERE type = 'UQ'
  AND parent_object_id = OBJECT_ID('Lideres')
  AND name LIKE '%usuario%';

IF @constraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE Lideres DROP CONSTRAINT ' + @constraintName);
    PRINT 'Constraint ' + @constraintName + ' eliminado.';
END
ELSE
BEGIN
    -- Puede estar definido inline sin nombre explícito; buscar por columna
    SELECT @constraintName = kc.name
    FROM sys.key_constraints kc
    JOIN sys.index_columns ic ON ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE kc.type = 'UQ'
      AND kc.parent_object_id = OBJECT_ID('Lideres')
      AND c.name = 'usuario';

    IF @constraintName IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE Lideres DROP CONSTRAINT ' + @constraintName);
        PRINT 'Constraint ' + @constraintName + ' eliminado.';
    END
    ELSE
        PRINT 'No se encontro constraint UNIQUE sobre usuario. Puede que ya haya sido eliminado.';
END

-- 2. Crear constraint compuesto: mismo usuario permitido solo dentro de la misma institucion
IF NOT EXISTS (
    SELECT 1 FROM sys.key_constraints
    WHERE name = 'UQ_Lideres_usuario_inst'
      AND parent_object_id = OBJECT_ID('Lideres')
)
BEGIN
    ALTER TABLE Lideres
    ADD CONSTRAINT UQ_Lideres_usuario_inst UNIQUE (usuario, institucion_id);
    PRINT 'Constraint UQ_Lideres_usuario_inst creado.';
END
ELSE
    PRINT 'Constraint UQ_Lideres_usuario_inst ya existe.';
