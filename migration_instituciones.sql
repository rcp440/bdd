-- =============================================
-- Multi-institución: tabla Instituciones + columna institucion_id
-- Ejecutar una sola vez en cada servidor
-- =============================================

CREATE TABLE Instituciones (
  id         INT IDENTITY(1,1) PRIMARY KEY,
  slug       NVARCHAR(50)  NOT NULL UNIQUE,   -- URL-friendly: 'iglesia-centro'
  nombre     NVARCHAR(200) NOT NULL,
  activo     BIT           DEFAULT 1,
  created_at DATETIME      DEFAULT GETDATE()
);

-- Institución por defecto para datos existentes
-- CAMBIAR slug y nombre antes de correr en producción
INSERT INTO Instituciones (slug, nombre) VALUES ('principal', 'Institución Principal');

-- Agregar columna a tablas existentes
ALTER TABLE Lideres    ADD institucion_id INT NULL REFERENCES Instituciones(id);
ALTER TABLE Grupos     ADD institucion_id INT NULL REFERENCES Instituciones(id);
ALTER TABLE Discipulos ADD institucion_id INT NULL REFERENCES Instituciones(id);

-- Asignar todos los datos existentes a la institución por defecto
UPDATE Lideres    SET institucion_id = 1 WHERE institucion_id IS NULL;
UPDATE Grupos     SET institucion_id = 1 WHERE institucion_id IS NULL;
UPDATE Discipulos SET institucion_id = 1 WHERE institucion_id IS NULL;

-- Índices de rendimiento
CREATE INDEX IX_Lideres_inst    ON Lideres(institucion_id);
CREATE INDEX IX_Grupos_inst     ON Grupos(institucion_id);
CREATE INDEX IX_Discipulos_inst ON Discipulos(institucion_id);
