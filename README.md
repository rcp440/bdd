# 📋 Asistencia al Grupo - SQL Server Edition

Sistema de asistencia para grupos con base de datos SQL Server. Incluye autenticación de usuarios (líderes) y gestión de discípulos.

## ✨ Características

- **Autenticación segura**: Login con usuario y contraseña (bcrypt)
- **Base de datos SQL Server**: Almacenamiento persistente
- **Múltiples líderes**: Cada líder ve sus propios discípulos
- **Asistencia diaria**: Marca presencia/ausencia con observaciones
- **Exportar datos**: Descarga CSV o PDF
- **Interfaz intuitiva**: Diseño mobile-first

## 📦 Instalación

### Requisitos previos
- Node.js 14+ y npm
- SQL Server 2019 o superior (con SQL Server Management Studio)
- Un editor de código (VS Code)

### 1. Clonar o descargar el proyecto

```bash
cd "c:\Datos\VSCode\Asistencia\Sql Server"
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Crear la base de datos SQL Server

#### Opción A: Usando SQL Server Management Studio (recomendado)

1. Abre **SQL Server Management Studio**
2. Conéctate a tu servidor SQL Server
3. Abre el archivo `setup-database.sql`
4. Ejecuta el script (F5)
5. Listo! La BD `AsistenciaDB` se creará automáticamente

#### Opción B: Desde línea de comandos

```bash
sqlcmd -S localhost -U sa -P TuPassword123 -i setup-database.sql
```

### 4. Configurar archivo `.env`

Edita el archivo `.env` con tus credenciales de SQL Server:

```env
SQL_SERVER=localhost
SQL_PORT=1433
SQL_DATABASE=AsistenciaDB
SQL_USER=sa
SQL_PASSWORD=TuPassword123
SQL_ENCRYPT=false
PORT=3000
JWT_SECRET=tu_clave_secreta_muy_segura_2024
```

**⚠️ Importante**: 
- `SQL_SERVER`: El host de tu SQL Server (localhost, IP, o nombre del servidor)
- `SQL_USER`: Usuario de SQL Server (generalmente `sa` o tu usuario personalizado)
- `SQL_PASSWORD`: Contraseña del usuario SQL Server
- `SQL_PORT`: Puerto de SQL Server (por defecto 1433)

### 5. Crear usuario demo (opcional)

Abre **SQL Server Management Studio** y ejecuta:

```sql
USE AsistenciaDB;

INSERT INTO Lideres (usuario, email, nombre, contrasena)
VALUES ('demo', 'demo@example.com', 'Demo Líder', '$2a$10$VdhVXK7p/Yk7/qyF8V8He.ow/s6JjXKUWOmrFLT0Xv1e8L3Z5YsAi');

-- Agregar algunos discípulos de demo
DECLARE @lider_id INT = (SELECT id FROM Lideres WHERE usuario = 'demo');
INSERT INTO Discipulos (lider_id, nombre, celular) VALUES
(@lider_id, 'Juan García', '2996205606'),
(@lider_id, 'María López', '2996205607'),
(@lider_id, 'Carlos Rodríguez', '2996205608'),
(@lider_id, 'Ana Martínez', '2996205609');
```

**Credenciales de demo:**
- Usuario: `demo`
- Contraseña: `demo123`

## 🚀 Iniciar la aplicación

```bash
npm start
```

Luego abre tu navegador en: **http://localhost:3000**

### Modo desarrollo (con auto-reload)

```bash
npm run dev
```

Requiere `nodemon` (ya instalado).

## 📚 Estructura del proyecto

```
.
├── server.js              # Servidor Express + SQL Server
├── package.json           # Dependencias
├── .env                   # Configuración
├── setup-database.sql     # Script de creación BD
├── public/
│   ├── index.html         # Login
│   └── app.html           # Aplicación principal
└── README.md              # Este archivo
```

## 🔐 Seguridad

- **Contraseñas**: Hasheadas con bcrypt
- **BD**: Requiere autenticación SQL Server
- **CORS**: Configurado para localhost
- **Validaciones**: Input validation en servidor

## 📊 Estructura de la base de datos

### Tabla `Lideres`
```
id (INT) - Clave primaria
usuario (VARCHAR) - Único
email (VARCHAR)
nombre (VARCHAR)
contrasena (VARCHAR) - Hasheada con bcrypt
fecha_registro (DATETIME)
activo (BIT)
```

### Tabla `Discipulos`
```
id (INT) - Clave primaria
lider_id (INT) - FK a Lideres
nombre (VARCHAR)
celular (VARCHAR)
fecha_registro (DATETIME)
activo (BIT)
```

### Tabla `Asistencia`
```
id (INT) - Clave primaria
discipulo_id (INT) - FK a Discipulos
lider_id (INT) - FK a Lideres
fecha (DATETIME)
presente (BIT)
celular (VARCHAR)
observacion (VARCHAR)
```

## 🔌 API Endpoints

### POST `/api/login`
Autentica un líder
```json
{
  "usuario": "demo",
  "contrasena": "demo123"
}
```

### POST `/api/registro`
Registra un nuevo líder
```json
{
  "usuario": "nuevo_usuario",
  "email": "usuario@email.com",
  "nombre": "Nombre Completo",
  "contrasena": "contraseña123"
}
```

### GET `/api/discipulos/:lider_id`
Obtiene discípulos de un líder

### POST `/api/asistencia`
Guarda registros de asistencia
```json
{
  "lider_id": 1,
  "fecha": "2024-05-11",
  "registros": [
    {"discipulo_id": 1, "presente": true, "celular": "299...", "observacion": ""}
  ]
}
```

### GET `/api/asistencia/:lider_id/:fecha`
Obtiene asistencia de un día específico

## 🐛 Solución de problemas

### Error: "Cannot connect to SQL Server"
- Verifica que SQL Server esté corriendo
- Comprueba las credenciales en `.env`
- Asegúrate de que el firewall permita la conexión al puerto 1433

### Error: "Async context is not available"
- Reinicia el servidor: `npm start`
- Limpia node_modules: `rm -r node_modules` y `npm install`

### Base de datos no se crea
- Abre SQL Server Management Studio
- Copia y pega el contenido de `setup-database.sql`
- Ejecuta como administrador

## 💡 Próximas mejoras

- [ ] Sistema de sesiones (JWT)
- [ ] Reportes avanzados
- [ ] Búsqueda y filtrado
- [ ] Backup automático de BD
- [ ] Temas oscuro/claro
- [ ] App móvil nativa

## 📝 Licencia

MIT

## 👨‍💻 Soporte

Para reportar errores o sugerencias, abre un issue.

---

**Versión**: 1.0.0  
**Última actualización**: Mayo 2024
