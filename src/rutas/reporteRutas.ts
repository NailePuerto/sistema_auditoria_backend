// src/rutas/reporteRutas.ts
import express from 'express';
import { generarReporteEjecutivo, generarReporteTecnico, listarTodosReportes } from '../controladores/reporteControlador';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

router.use(authMiddleware);

router.get('/todos', listarTodosReportes);
router.get('/auditoria/:id/ejecutivo', generarReporteEjecutivo);
router.get('/auditoria/:id/tecnico', generarReporteTecnico);

export default router;