// src/rutas/authRutas.ts
import express from 'express';
import { registrar, login, verificar, actualizarPerfil, cambiarPassword } from '../controladores/authControlador';
import authMiddleware from '../middleware/authMiddleware';

const router = express.Router();

router.post('/registro', registrar);
router.post('/login', login);
router.get('/verificar', authMiddleware, verificar);
router.put('/perfil', authMiddleware, actualizarPerfil);
router.put('/password', authMiddleware, cambiarPassword);

export default router;