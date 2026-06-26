import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Verificar si el archivo existe (solo en desarrollo local)
const envPath = path.resolve(__dirname, '../../.env');
console.log('📁 Buscando .env en:', envPath);
console.log('📁 ¿El archivo existe?', fs.existsSync(envPath) ? 'SÍ' : 'NO');

// Leer el archivo manualmente para depurar (solo en desarrollo local)
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    console.log('📁 Contenido del .env:', content);
}

// Cargar .env (solo en desarrollo local)
dotenv.config({ path: envPath });

console.log('🔌 Variables cargadas:');
console.log('   DB_HOST:', process.env.DB_HOST);
console.log('   DB_USUARIO:', process.env.DB_USUARIO);
console.log('   DB_NOMBRE:', process.env.DB_NOMBRE);

// ✅ Configuración del pool: usa DATABASE_URL si existe, sino usa variables individuales
const pool = new Pool({
    // Si DATABASE_URL existe (en producción), úsala
    connectionString: process.env.DATABASE_URL,
    // Si no existe, usa las variables individuales (desarrollo local)
    ...(process.env.DATABASE_URL ? {} : {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PUERTO || '5432'),
        user: process.env.DB_USUARIO,
        password: process.env.DB_CONTRASENA,
        database: process.env.DB_NOMBRE,
    }),
    connectionTimeoutMillis: 5000,
    // En producción, SSL es obligatorio en Supabase/Render
    ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Error al conectar a PostgreSQL:', err.message);
        console.error('   Detalles:', err);
    } else {
        console.log('✅ Conexión a PostgreSQL establecida correctamente');
        release();
    }
});

export default pool;