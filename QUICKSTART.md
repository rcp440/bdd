# 🚀 Guía Rápida de Instalación

## Paso 1: Instalar dependencias
```bash
npm install
```

## Paso 2: Crear la base de datos
Abre **SQL Server Management Studio** y ejecuta el archivo `setup-database.sql`.

O desde la terminal:
```bash
sqlcmd -S localhost -U sa -P TuPassword123 -i setup-database.sql
```

## Paso 3: Configurar .env
Edita el archivo `.env` con tus credenciales de SQL Server:
```env
SQL_SERVER=localhost
SQL_PORT=1433
SQL_DATABASE=AsistenciaDB
SQL_USER=sa
SQL_PASSWORD=TuPassword123
```

## Paso 4: Inicializar BD con datos de prueba
```bash
npm run seed
```

Esto crea:
- ✅ Usuario: `demo`
- ✅ Contraseña: `demo123`
- ✅ 6 discípulos de ejemplo

## Paso 5: Iniciar el servidor
```bash
npm start
```

Abre: **http://localhost:3000**

## ✨ Listo!

Usa las credenciales de demo para ingresar y ver cómo funciona.

---

### Comandos útiles

```bash
npm start          # Iniciar servidor
npm run dev        # Iniciar en modo desarrollo (auto-reload)
npm run seed       # Llenar BD con datos de prueba
npm run hash       # Generar hash bcrypt de contraseña
```

### Generar hash de contraseña personalizado
```bash
npm run hash -- "mi_contraseña_secreta"
```

---

**Documentación completa**: Ver `README.md`
