// servidor/src/servidor.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRutas = require('./rutas/authRutas');
const proyectoRutas = require('./rutas/proyectoRutas');
const auditoriaRutas = require('./rutas/auditoriaRutas');
const resultadoRutas = require('./rutas/resultadoRutas');
const hallazgoRutas = require('./rutas/hallazgoRutas');
const reporteRutas = require('./rutas/reporteRutas');
const criterioRutas = require('./rutas/criterioRutas');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ruta de salud
app.get('/api/salud', (req, res) => {
    res.json({ estado: 'OK', mensaje: 'Servidor funcionando' });
});

// Rutas
app.use('/api/auth', authRutas);
app.use('/api/proyectos', proyectoRutas);
app.use('/api/auditorias', auditoriaRutas);
app.use('/api/resultados', resultadoRutas);
app.use('/api/hallazgos', hallazgoRutas);
app.use('/api/reportes', reporteRutas);
app.use('/api/criterios', criterioRutas);

const PUERTO = process.env.PUERTO || 3001;
app.listen(PUERTO, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PUERTO}`);
});