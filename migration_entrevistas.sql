-- Tabla de entrevistas individuales lider-discipulo
CREATE TABLE Entrevistas (
  id           INT IDENTITY(1,1) PRIMARY KEY,
  discipulo_id INT NOT NULL REFERENCES Discipulos(id),
  grupo_id     INT NOT NULL REFERENCES Grupos(id),
  lider_id     INT NOT NULL REFERENCES Lideres(id),
  fecha        DATE NOT NULL,
  horario      NVARCHAR(10)  NULL,
  lugar        NVARCHAR(100) NULL,
  temas        NVARCHAR(MAX) NULL,
  created_at   DATETIME DEFAULT GETDATE()
);

CREATE INDEX IX_Entrevistas_discipulo ON Entrevistas(discipulo_id);
CREATE INDEX IX_Entrevistas_grupo     ON Entrevistas(grupo_id);
