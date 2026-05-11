# 📡 Referencia de API REST

## URL Base
```
http://localhost:3000/api
```

## Endpoints de Autenticación

### 1. Login
**Autentica un líder y obtiene sus discípulos**

```http
POST /api/login
Content-Type: application/json

{
  "usuario": "demo",
  "contrasena": "demo123"
}
```

**Respuesta exitosa (200):**
```json
{
  "ok": true,
  "lider": {
    "id": 1,
    "usuario": "demo",
    "nombre": "Demo Líder",
    "email": "demo@example.com"
  },
  "discipulos": [
    {
      "id": 1,
      "nombre": "Juan García",
      "celular": "2996205606"
    },
    {
      "id": 2,
      "nombre": "María López",
      "celular": "2996205607"
    }
  ]
}
```

**Respuesta error (401):**
```json
{
  "error": "Usuario o contraseña incorrectos"
}
```

---

### 2. Registrar nuevo líder
**Crea una nueva cuenta de líder**

```http
POST /api/registro
Content-Type: application/json

{
  "usuario": "juan_lider",
  "email": "juan@example.com",
  "nombre": "Juan García",
  "contrasena": "micontraseña123"
}
```

**Respuesta exitosa (200):**
```json
{
  "ok": true,
  "mensaje": "Líder registrado exitosamente"
}
```

**Respuesta error (400):**
```json
{
  "error": "El usuario ya existe"
}
```

---

## Endpoints de Discípulos

### 3. Obtener discípulos de un líder
**Trae la lista de discípulos de un líder específico**

```http
GET /api/discipulos/1
```

**Respuesta (200):**
```json
{
  "discipulos": [
    {
      "id": 1,
      "nombre": "Juan García",
      "celular": "2996205606"
    },
    {
      "id": 2,
      "nombre": "María López",
      "celular": "2996205607"
    }
  ]
}
```

---

### 4. Agregar nuevo discípulo
**Agrega un nuevo discípulo a un líder**

```http
POST /api/discipulos
Content-Type: application/json

{
  "lider_id": 1,
  "nombre": "Carlos Rodríguez",
  "celular": "2996205608"
}
```

**Respuesta (200):**
```json
{
  "ok": true,
  "mensaje": "Discípulo agregado"
}
```

---

## Endpoints de Asistencia

### 5. Guardar asistencia
**Guarda los registros de asistencia para un día específico**

```http
POST /api/asistencia
Content-Type: application/json

{
  "lider_id": 1,
  "fecha": "2024-05-11",
  "registros": [
    {
      "discipulo_id": 1,
      "presente": true,
      "celular": "2996205606",
      "observacion": ""
    },
    {
      "discipulo_id": 2,
      "presente": false,
      "celular": "2996205607",
      "observacion": "Enfermo"
    },
    {
      "discipulo_id": 3,
      "presente": true,
      "celular": "2996205608",
      "observacion": "Llegó tarde"
    }
  ]
}
```

**Respuesta (200):**
```json
{
  "ok": true,
  "mensaje": "Asistencia guardada"
}
```

---

### 6. Obtener asistencia de un día
**Trae los registros de asistencia de un líder para una fecha específica**

```http
GET /api/asistencia/1/2024-05-11
```

**Respuesta (200):**
```json
{
  "registros": [
    {
      "discipulo_id": 1,
      "nombre": "Juan García",
      "presente": true,
      "celular": "2996205606",
      "observacion": ""
    },
    {
      "discipulo_id": 2,
      "nombre": "María López",
      "presente": false,
      "celular": "2996205607",
      "observacion": "Enfermo"
    }
  ]
}
```

---

## Códigos de Estado HTTP

| Código | Significado | Ejemplo |
|--------|-------------|---------|
| `200` | OK - Solicitud exitosa | Login correcto |
| `201` | Created - Recurso creado | Nuevos datos insertados |
| `400` | Bad Request - Solicitud inválida | Falta un parámetro |
| `401` | Unauthorized - No autenticado | Credenciales incorrectas |
| `404` | Not Found - Recurso no encontrado | Usuario no existe |
| `500` | Server Error - Error del servidor | Error en BD |

---

## Ejemplos con cURL

### Login
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"demo","contrasena":"demo123"}'
```

### Obtener discípulos
```bash
curl http://localhost:3000/api/discipulos/1
```

### Guardar asistencia
```bash
curl -X POST http://localhost:3000/api/asistencia \
  -H "Content-Type: application/json" \
  -d '{
    "lider_id": 1,
    "fecha": "2024-05-11",
    "registros": [
      {"discipulo_id": 1, "presente": true, "celular": "299...", "observacion": ""}
    ]
  }'
```

---

## Ejemplos con JavaScript Fetch

### Login
```javascript
const response = await fetch('http://localhost:3000/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    usuario: 'demo',
    contrasena: 'demo123'
  })
});

const data = await response.json();
console.log(data.lider);
console.log(data.discipulos);
```

### Guardar asistencia
```javascript
const response = await fetch('http://localhost:3000/api/asistencia', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    lider_id: 1,
    fecha: '2024-05-11',
    registros: [
      {
        discipulo_id: 1,
        presente: true,
        celular: '2996205606',
        observacion: ''
      }
    ]
  })
});

const data = await response.json();
if (data.ok) {
  console.log('Asistencia guardada');
}
```

---

## Validaciones del Servidor

### Login
- ✓ Usuario y contraseña requeridos
- ✓ Usuario debe existir en BD
- ✓ Contraseña se valida con bcrypt

### Registrar líder
- ✓ Todos los campos requeridos
- ✓ Usuario debe ser único
- ✓ Email debe ser válido
- ✓ Contraseña mínimo 6 caracteres (validar en cliente)

### Asistencia
- ✓ lider_id requerido
- ✓ fecha requerida (formato: YYYY-MM-DD)
- ✓ registros requerido (array no vacío)
- ✓ discipulo_id debe pertenecer al líder

---

## CORS

Por defecto, el servidor permite solicitudes desde:
- `http://localhost:3000`
- `http://localhost:*`

Para permitir otros orígenes, modifica en `server.js`:
```javascript
app.use(cors({
  origin: ['http://localhost:3000', 'https://tudominio.com']
}));
```
