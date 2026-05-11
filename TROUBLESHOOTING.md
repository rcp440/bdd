# 🔧 Solución de Problemas (Troubleshooting)

## Problemas de Conexión a SQL Server

### ❌ Error: "Cannot connect to SQL Server"

**Causas posibles:**

1. **SQL Server no está corriendo**
   ```bash
   # En Windows, verifica en Servicios:
   # Busca "SQL Server" en Servicios de Windows
   ```
   
2. **Credenciales incorrectas en .env**
   ```env
   # Verifica estos valores:
   SQL_SERVER=localhost      # o tu IP
   SQL_PORT=1433            # Puerto por defecto
   SQL_USER=sa              # o tu usuario
   SQL_PASSWORD=TuPassword  # Tu contraseña real
   ```

3. **El firewall bloquea el puerto 1433**
   ```bash
   # Windows Firewall:
   # Control Panel > Firewall > Allow an app through firewall
   # Agrega: SQL Server (puerto 1433)
   ```

**Solución:**
```bash
# 1. Verifica que SQL Server esté corriendo:
# Abre SQL Server Configuration Manager
# Verifica que el protocolo TCP/IP esté habilitado

# 2. Prueba la conexión:
sqlcmd -S localhost -U sa -P TuPassword123

# 3. Si no funciona, reinicia SQL Server
```

---

### ❌ Error: "Database AsistenciaDB does not exist"

**Solución:**

1. Abre **SQL Server Management Studio**
2. Copia todo el contenido de `setup-database.sql`
3. Pégalo en una nueva Query
4. Presiona F5 para ejecutar

O usa la terminal:
```bash
sqlcmd -S localhost -U sa -P TuPassword123 -i setup-database.sql
```

---

### ❌ Error: "Invalid username or password"

**Solución:**

1. Verifica la contraseña de SQL Server
2. Abre SQL Server Management Studio con esa contraseña
3. Si entras, la contraseña es correcta
4. Actualiza el archivo `.env` con la contraseña correcta

```env
SQL_USER=sa
SQL_PASSWORD=TuContraseñaReal
```

---

## Problemas de Node.js y npm

### ❌ Error: "npm: command not found"

**Solución:**
1. Instala Node.js desde https://nodejs.org/
2. Reinicia la terminal
3. Verifica la instalación:
```bash
node --version
npm --version
```

---

### ❌ Error: "Cannot find module 'mssql'"

**Solución:**
```bash
# Instala las dependencias:
npm install

# Si no funciona, limpia e instala de nuevo:
rm -r node_modules
npm install
```

---

### ❌ Error: "Port 3000 already in use"

**Solución:**

1. Busca qué proceso usa el puerto 3000:
```bash
# Windows:
netstat -ano | findstr :3000

# Linux/Mac:
lsof -i :3000
```

2. Mata el proceso:
```bash
# Windows:
taskkill /PID <process_id> /F

# Linux/Mac:
kill -9 <process_id>
```

3. O usa otro puerto:
```env
PORT=3001
```

---

## Problemas en el Navegador

### ❌ Error: "Cannot GET /"

**Solución:**

1. Asegúrate de que el servidor está corriendo:
```bash
npm start
```

2. Abre la URL correcta:
```
http://localhost:3000
```

3. Verifica la consola del servidor para errores

---

### ❌ Error: "ERR_CONNECTION_REFUSED"

**Solución:**

1. Inicia el servidor:
```bash
npm start
```

2. Espera a que veas:
```
✅ Conectado a SQL Server
🚀 Servidor corriendo en http://localhost:3000
```

3. Luego abre la URL

---

### ❌ Error: "Usuario o contraseña incorrectos" (al usar demo)

**Solución:**

1. Primero, inicializa la BD con datos:
```bash
npm run seed
```

2. Esto crea el usuario `demo` automáticamente

3. Usa estas credenciales:
```
Usuario: demo
Contraseña: demo123
```

---

## Problemas de Base de Datos

### ❌ "No hay discípulos agregados"

**Verificar:**

1. Asegúrate de tener discípulos en la BD:
```sql
USE AsistenciaDB;
SELECT * FROM Discipulos WHERE lider_id = 1;
```

2. Si está vacío, agrega algunos:
```bash
npm run seed
```

---

### ❌ "Asistencia no se guarda"

**Verificar:**

1. Abre SQL Server Management Studio
2. Ejecuta:
```sql
USE AsistenciaDB;
SELECT * FROM Asistencia WHERE lider_id = 1;
```

3. Si está vacío, verifica la consola del servidor para errores

4. Intenta guardar de nuevo

---

## Problemas de Sesión

### ❌ "Se desconecta al recargar la página"

**Comportamiento esperado:**
- Los datos de la sesión se guardan en `sessionStorage`
- Si recargas, se mantiene la sesión
- Si cierras la pestaña, se pierde

**Para persistencia más larga:**
- Los datos se guardan en SQL Server cuando haces clic en "Guardar"
- Usa `localStorage` en lugar de `sessionStorage` para datos más permanentes

---

### ❌ "No puedo ingresar después de registrarme"

**Solución:**

1. Espera unos segundos después de registrar
2. Luego intenta ingresar con las credenciales que creaste
3. Verifica la consola del navegador (F12) para errores

---

## Problemas de Email de Registro

### ❌ "Email inválido"

**Solución:**
- Usa un email válido con formato: `usuario@dominio.com`
- Ejemplo válido: `juan@gmail.com`

---

## Problemas de Contraseña

### ❌ "Contraseña muy corta"

**Solución:**
- Las contraseñas deben tener mínimo 6 caracteres
- Ejemplo: `micontraseña123`

---

### ❌ "Olvidé mi contraseña"

**Por ahora:**
- No hay función de "Recuperar contraseña"
- Registra una nueva cuenta
- O contacta al administrador para borrar tu cuenta

**Borrar cuenta (para administrador):**
```sql
DELETE FROM Lideres WHERE usuario = 'tu_usuario';
```

---

## Limpiar y Reiniciar

### Borrar toda la BD y empezar de nuevo

```bash
# 1. Abre SQL Server Management Studio
# 2. Conecta a tu servidor
# 3. Abre una nueva Query y ejecuta:
```

```sql
DROP DATABASE IF EXISTS AsistenciaDB;
```

```bash
# 4. Crea nuevamente:
sqlcmd -S localhost -U sa -P TuPassword123 -i setup-database.sql

# 5. Agrega datos de prueba:
npm run seed
```

---

## Reportar un Problema

Si encuentras un error no listado aquí:

1. **Revisa la consola del navegador** (F12)
2. **Revisa la consola del servidor** (donde corre `npm start`)
3. **Anota el mensaje de error exacto**
4. **Abre un issue** en el repositorio con:
   - El error exacto
   - Los pasos para reproducirlo
   - Tu configuración (.env, versión de SQL Server, etc.)

---

## Contacto y Soporte

- 📧 Email: soporte@example.com
- 💬 Discord: [Link a servidor]
- 📖 Documentación: Ver `README.md`

---

**Última actualización:** Mayo 2024
