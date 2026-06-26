// src/rutas/resultadoRutas.ts
import express from 'express';
import { guardarResultado, obtenerResultados, evaluarYGuardarResultado } from '../controladores/resultadoControlador';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

router.use(authMiddleware);

// Usar los nombres correctos que ya existen en tu controlador
router.post('/auditoria/:id', guardarResultado);
router.post('/auditoria/:id/evaluar', evaluarYGuardarResultado);
router.get('/auditoria/:id', obtenerResultados);

export default router;