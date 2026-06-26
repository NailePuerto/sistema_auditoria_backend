// src/rutas/hallazgoRutas.ts
import express from 'express';
import { guardarHallazgo, obtenerHallazgos, obtenerTodosHallazgos } from '../controladores/hallazgoControlador';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

router.use(authMiddleware);

router.get('/todos', obtenerTodosHallazgos);
router.get('/auditoria/:id', obtenerHallazgos);
router.post('/auditoria/:id', guardarHallazgo);

export default router;