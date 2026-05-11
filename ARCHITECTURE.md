# 📊 Diagrama de Arquitectura

## Flujo de Login y Asistencia

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTE (Navegador)                  │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐         ┌──────────────┐             │
│  │  login.html  │  ─────> │  app.html    │             │
│  │  (Login)     │         │  (Asistencia)│             │
│  └──────────────┘         └──────────────┘             │
└────────┬─────────────────────────────┬──────────────────┘
         │                             │
         │ POST /api/login             │ POST /api/asistencia
         │ GET /api/discipulos         │ GET /api/asistencia/:lider_id/:fecha
         ▼                             ▼
┌─────────────────────────────────────────────────────────┐
│           SERVIDOR (Node.js + Express)                  │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐  │
│  │              server.js (Puerto 3000)              │  │
│  │                                                   │  │
│  │  POST /api/login ────────────┐                  │  │
│  │  POST /api/registro ────────┐ │                  │  │
│  │  GET /api/discipulos/:id ──┐│ │                  │  │
│  │  POST /api/asistencia ─────┼┼─┼──────────────┐   │  │
│  │  GET /api/asistencia/:id   │││ │              │   │  │
│  └────────────────────────────┼┼─┼──────────────┼───┘  │
│                               │││ │              │       │
└────────────────────────────┬──┼┼─┼──────────────┼──────┘
                             │  │││ │              │
                             ▼  ││└─┘              │
                    ┌─────────────────┐            │
                    │ SQL Server      │            │
                    │ (AsistenciaDB)  │◄───────────┘
                    │                 │
                    │ ┌─────────────┐ │
                    │ │ Lideres     │ │
                    │ └─────────────┘ │
                    │                 │
                    │ ┌─────────────┐ │
                    │ │ Discipulos  │ │
                    │ └─────────────┘ │
                    │                 │
                    │ ┌─────────────┐ │
                    │ │ Asistencia  │ │
                    │ └─────────────┘ │
                    └─────────────────┘
```

## Modelo de Datos

```
┌──────────────────┐
│    LIDERES       │
├──────────────────┤
│ id (PK)          │
│ usuario (UNIQUE) │
│ email            │
│ nombre           │
│ contrasena (hash)│
│ fecha_registro   │
│ activo           │
└─────────┬────────┘
          │ 1:N
          │
          │  (FK: lider_id)
          │
┌─────────▼────────────┐
│    DISCIPULOS        │
├──────────────────────┤
│ id (PK)              │
│ lider_id (FK)        │
│ nombre               │
│ celular              │
│ fecha_registro       │
│ activo               │
└─────────┬────────────┘
          │ 1:N
          │
          │  (FK: discipulo_id)
          │
┌─────────▼────────────┐
│    ASISTENCIA        │
├──────────────────────┤
│ id (PK)              │
│ discipulo_id (FK)    │
│ lider_id (FK)        │
│ fecha (datetime)     │
│ presente (bit)       │
│ celular              │
│ observacion          │
└──────────────────────┘
```

## Flujo de Autenticación

```
1. Usuario ingresa credenciales
   ↓
2. Cliente POST /api/login
   ↓
3. Servidor verifica en BD (tabla Lideres)
   ↓
4. Compara contraseña con hash bcrypt
   ↓
5. Si es válido:
   ├─ Obtiene discípulos del líder
   ├─ Devuelve datos en sessionStorage
   └─ Redirige a /app.html
   
6. Si es inválido:
   └─ Devuelve error 401
```

## Flujo de Asistencia

```
1. Líder marca presencia/ausencia de discípulos
   ↓
2. Usuario hace clic en "Guardar"
   ↓
3. Cliente POST /api/asistencia con:
   - lider_id
   - fecha
   - registros (discípulo_id, presente, celular, observación)
   ↓
4. Servidor:
   ├─ Borra registros previos del mismo día
   └─ Inserta nuevos registros
   ↓
5. Datos persistentes en BD
```

## Componentes del Proyecto

```
asistencia-grupo/
├── 📄 server.js              ← Backend principal
├── 📄 package.json           ← Dependencias
├── 📄 .env                   ← Configuración
├── 📄 setup-database.sql     ← Script BD
├── 📄 seed.js                ← Datos de prueba
├── 📄 generate-hash.js       ← Utilidad contraseñas
├── 📁 public/                ← Interfaz web
│   ├── 📄 index.html         ← Login
│   └── 📄 app.html           ← Aplicación
├── 📄 README.md              ← Documentación
├── 📄 QUICKSTART.md          ← Guía rápida
└── 📄 .gitignore
```

## Stack Tecnológico

```
Frontend:
├─ HTML5
├─ CSS3
├─ Vanilla JavaScript
└─ html2pdf (para PDF)

Backend:
├─ Node.js
├─ Express.js
├─ mssql (driver SQL Server)
└─ bcryptjs (contraseñas)

Base de Datos:
├─ SQL Server 2019+
├─ 3 tablas normalizadas
└─ Índices para rendimiento
```

## Seguridad

```
🔐 Autenticación:
   └─ bcryptjs (10 rounds)

🔒 Base de Datos:
   ├─ Requiere usuario/contraseña
   ├─ CORS configurado
   └─ Input validation en servidor

⚠️  Variables sensibles:
   └─ Almacenadas en .env (no en Git)
```
