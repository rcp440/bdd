// Utilidad para generar hash bcrypt de contraseñas
// Ejecutar: node generate-hash.js

const bcrypt = require('bcryptjs');

const password = process.argv[2] || 'demo123';

async function generateHash() {
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    console.log('\n✅ Hash generado exitosamente:\n');
    console.log(`Contraseña: ${password}`);
    console.log(`Hash: ${hash}`);
    console.log('\nUsa este hash en SQL Server:\n');
    console.log(`INSERT INTO Lideres (usuario, email, nombre, contrasena)`);
    console.log(`VALUES ('demo', 'demo@example.com', 'Demo Líder', '${hash}');\n`);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

generateHash();
