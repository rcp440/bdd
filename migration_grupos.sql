-- ============================================================
-- migration_grupos.sql
-- Ejecutar una sola vez en SQL Server para agregar grupos
-- ============================================================

-- 1. Tabla Grupos
CREATE TABLE Grupos (
    id        INT IDENTITY(1,1) PRIMARY KEY,
    lider_id  INT NOT NULL REFERENCES Lideres(id),
    nombre    NVARCHAR(100) NOT NULL,
    activo    BIT NOT NULL DEFAULT 1
);

-- 2. Crear "Grupo 1" para cada lider que ya tiene discipulos
INSERT INTO Grupos (lider_id, nombre)
SELECT DISTINCT lider_id, 'Grupo 1' FROM Discipulos;

-- 3. Agregar grupo_id a Discipulos y migrar datos
ALTER TABLE Discipulos ADD grupo_id INT REFERENCES Grupos(id);
UPDATE d SET d.grupo_id = g.id
FROM Discipulos d
JOIN Grupos g ON g.lider_id = d.lider_id;

-- 4. Agregar grupo_id a Asistencia y migrar datos
ALTER TABLE Asistencia ADD grupo_id INT REFERENCES Grupos(id);
UPDATE a SET a.grupo_id = g.id
FROM Asistencia a
JOIN Grupos g ON g.lider_id = a.lider_id;

-- 5. Agregar grupo_id a Reuniones y migrar datos
ALTER TABLE Reuniones ADD grupo_id INT REFERENCES Grupos(id);
UPDATE r SET r.grupo_id = g.id
FROM Reuniones r
JOIN Grupos g ON g.lider_id = r.lider_id;
