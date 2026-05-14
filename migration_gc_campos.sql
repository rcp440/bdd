-- Agregar campos Dia, Horario y Lugar a la tabla Grupos
ALTER TABLE Grupos ADD dia     NVARCHAR(20)  NULL;
ALTER TABLE Grupos ADD horario NVARCHAR(10)  NULL;
ALTER TABLE Grupos ADD lugar   NVARCHAR(100) NULL;
