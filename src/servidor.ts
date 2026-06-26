// src/servidor.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';


import authRutas from './rutas/authRutas';
import proyectoRutas from './rutas/proyectoRutas';
import auditoriaRutas from './rutas/auditoriaRutas';
import resultadoRutas from './rutas/resultadoRutas';
import hallazgoRutas from './rutas/hallazgoRutas';
import reporteRutas from './rutas/reporteRutas';
import criterioRutas from './rutas/criterioRutas';
dotenv.config();

const app = express();
const PUERTO = process.env.PUERTO || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ruta de salud
app.get('/api/salud', (req, res) => {
    res.json({ estado: 'OK', mensaje: 'Servidor funcionando correctamente' });
});

// Rutas de la API
app.use('/api/auth', authRutas);
app.use('/api/proyectos', proyectoRutas);
app.use('/api/auditorias', auditoriaRutas);
app.use('/api/resultados', resultadoRutas);
app.use('/api/hallazgos', hallazgoRutas);
app.use('/api/reportes', reporteRutas);
app.use('/api/criterios', criterioRutas);

// Iniciar servidor
app.listen(PUERTO, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PUERTO}`);
});