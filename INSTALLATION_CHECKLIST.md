# 📋 Checklist de Instalación

Usa este checklist para asegurarte de completar todos los pasos correctamente.

## Pre-requisitos

- [ ] SQL Server 2019+ instalado
- [ ] SQL Server Management Studio instalado
- [ ] Node.js 14+ instalado
- [ ] npm instalado (viene con Node.js)
- [ ] Git instalado (opcional, para clonar el repositorio)

### Verificar Instalaciones
```bash
# Verificar Node.js
node --version

# Verificar npm
npm --version

# Verificar SQL Server (debería estar en Servicios)
# Windows: busca "Services" > "SQL Server"
```

---

## Paso 1: Descarga o Clona el Proyecto

- [ ] Descargar el proyecto desde GitHub
  ```bash
  git clone https://github.com/tu-usuario/asistencia-grupo.git
  cd asistencia-grupo
  ```
  
  **O** descargarlo como ZIP y extraerlo

- [ ] Navega a la carpeta del proyecto
  ```bash
  cd "c:\Datos\VSCode\Asistencia\Sql Server"
  ```

---

## Paso 2: Instalar Dependencias

- [ ] Instala los paquetes necesarios
  ```bash
  npm install
  ```

- [ ] Espera a que termine (puede tomar 1-2 minutos)

- [ ] Verifica que se creó la carpeta `node_modules`

---

## Paso 3: Crear Base de Datos SQL Server

### Opción A: Usando SQL Server Management Studio (Recomendado)

- [ ] Abre **SQL Server Management Studio**
- [ ] Conéctate a tu servidor SQL Server
- [ ] Abre el archivo `setup-database.sql`
  - Menú: File > Open > File
  - Busca: `setup-database.sql`
- [ ] Lee el script completo
- [ ] Presiona **F5** para ejecutar
- [ ] Verifica que el script ejecutó sin errores
- [ ] Cierra el archivo

### Opción B: Desde Terminal

- [ ] Abre PowerShell o CMD
- [ ] Ejecuta:
  ```bash
  sqlcmd -S localhost -U sa -P TuPassword123 -i setup-database.sql
  ```
  *(Cambia la contraseña por la tuya)*
- [ ] Verifica que se ejecutó correctamente

---

## Paso 4: Configurar Variables de Entorno

- [ ] Abre el archivo `.env`
  ```
  .env (en la raíz del proyecto)
  ```

- [ ] Edita estos valores según tu SQL Server:
  ```env
  SQL_SERVER=localhost           # o tu IP
  SQL_PORT=1433                  # puerto por defecto
  SQL_DATABASE=AsistenciaDB      # nombre de la BD
  SQL_USER=sa                    # usuario SQL Server
  SQL_PASSWORD=TuPassword123     # contraseña real
  SQL_ENCRYPT=false              # false por defecto
  PORT=3000                      # puerto de la app
  ```

- [ ] Guarda el archivo (Ctrl+S)

### Verificar la Conexión a SQL Server

- [ ] Abre SQL Server Management Studio
- [ ] Intenta conectarte con tus credenciales
- [ ] Si conectas, tus credenciales son correctas
- [ ] Usa exactamente esos valores en `.env`

---

## Paso 5: Inicializar Base de Datos (Opcional pero Recomendado)

- [ ] Ejecuta el script de inicialización:
  ```bash
  npm run seed
  ```

- [ ] Deberías ver:
  ```
  ✅ Conectado a SQL Server
  ✅ Líder demo insertado
  ✅ 6 discípulos insertados
  🎉 Base de datos inicializada exitosamente!
  ```

- [ ] Esto crea el usuario de prueba:
  - **Usuario:** `demo`
  - **Contraseña:** `demo123`

---

## Paso 6: Iniciar el Servidor

- [ ] Abre una terminal/PowerShell en la carpeta del proyecto
- [ ] Ejecuta:
  ```bash
  npm start
  ```

- [ ] Deberías ver:
  ```
  ✅ Conectado a SQL Server
  🚀 Servidor corriendo en http://localhost:3000
  ```

- [ ] Si hay errores, revisa `TROUBLESHOOTING.md`

---

## Paso 7: Acceder a la Aplicación

- [ ] Abre tu navegador (Chrome, Firefox, Edge, etc.)
- [ ] Navega a: **http://localhost:3000**
- [ ] Deberías ver la página de Login

---

## Paso 8: Probar la Aplicación

### Con Usuario Demo

- [ ] Usuario: `demo`
- [ ] Contraseña: `demo123`
- [ ] Haz clic en **"Ingresar"**
- [ ] Deberías ver 6 discípulos cargados
- [ ] Prueba marcar presencia
- [ ] Haz clic en **"Guardar"**
- [ ] Recarga la página
- [ ] Verifica que los datos se guardaron

### Crear tu propia Cuenta

- [ ] Vuelve al login (clic en "Salir")
- [ ] Haz clic en **"Registrarse"**
- [ ] Completa el formulario:
  - Nombre: Tu nombre
  - Usuario: Un nombre único
  - Email: Tu email
  - Contraseña: Mínimo 6 caracteres
- [ ] Haz clic en **"Crear Cuenta"**
- [ ] Verifica el mensaje de éxito
- [ ] Ingresa con tus nuevas credenciales

---

## Paso 9: Agregar Discípulos (Opcional)

- [ ] En la aplicación, ingresa un nombre en el campo inferior
- [ ] Ingresa un celular (opcional)
- [ ] Haz clic en **"+ Agregar discípulo"**
- [ ] El discípulo aparece en la lista
- [ ] Haz clic en **"Guardar"** para persistir en BD

---

## Paso 10: Exportar Reportes (Opcional)

- [ ] Marca presencia/ausencia de discípulos
- [ ] Haz clic en **"⬇ CSV"** para descargar como Excel
- [ ] O haz clic en **"⬇ PDF"** para descargar como PDF
- [ ] Los archivos se guardan en tu carpeta de descargas

---

## Verificación Final

- [ ] Servidor está corriendo (`npm start`)
- [ ] Base de datos está creada (setup-database.sql ejecutado)
- [ ] `.env` está configurado correctamente
- [ ] Puedes ingresar con usuario demo
- [ ] Ves los discípulos cargados
- [ ] Puedes marcar asistencia
- [ ] Puedes guardar datos
- [ ] Puedes descargar reportes

---

## Modo Desarrollo (Optional)

Si quieres auto-reload al editar archivos:

- [ ] Instala nodemon:
  ```bash
  npm install -g nodemon
  ```

- [ ] Inicia con:
  ```bash
  npm run dev
  ```

- [ ] Edita archivos en `server.js` y verás que se recarga automáticamente

---

## Troubleshooting Rápido

| Problema | Solución |
|----------|----------|
| "Cannot connect to SQL Server" | Verifica `.env` y que SQL Server está corriendo |
| "Database does not exist" | Ejecuta `setup-database.sql` en SSMS |
| "Port 3000 already in use" | Cambia PORT en `.env` o mata el proceso |
| "Cannot find module 'mssql'" | Ejecuta `npm install` |
| "No discípulos" | Ejecuta `npm run seed` |
| "Usuario/contraseña incorrectos" | Verifica credenciales en login |

---

## ¿Necesitas Ayuda?

1. Lee `TROUBLESHOOTING.md` para problemas comunes
2. Revisa `README.md` para documentación completa
3. Consulta `API_REFERENCE.md` para los endpoints
4. Ve `ARCHITECTURE.md` para entender la estructura

---

## Próximos Pasos

Una vez que la aplicación esté funcionando:

- [ ] Explora la interfaz
- [ ] Crea varios usuarios (líderes)
- [ ] Agrega discípulos a cada uno
- [ ] Prueba la asistencia diaria
- [ ] Descarga reportes en CSV y PDF
- [ ] Lee el código y modifica según necesites

---

## Comandos Rápidos

```bash
# Instalar dependencias
npm install

# Iniciar servidor
npm start

# Iniciar en modo desarrollo
npm run dev

# Crear datos de prueba
npm run seed

# Generar hash de contraseña
npm run hash -- "mi_password"

# Ver logs de Node
npm start 2>&1 | tee app.log
```

---

## Archivos Importantes

```
.env                    ← Tu configuración (NO SUBIR A GIT)
setup-database.sql     ← Script para crear BD
seed.js                ← Script para datos de prueba
server.js              ← Backend principal
public/index.html      ← Página de Login
public/app.html        ← Aplicación principal
```

---

**¡Listo! 🎉**

Si completaste todos los pasos, tu aplicación debería estar funcionando correctamente en:
```
http://localhost:3000
```

Credenciales de prueba:
- **Usuario:** demo
- **Contraseña:** demo123

---

Última actualización: Mayo 2024
