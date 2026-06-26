// src/rutas/criterioRutas.ts
import express from 'express';
import { listarCriterios } from '../controladores/criterioControlador';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

router.use(authMiddleware);
router.get('/', listarCriterios);

export default router;