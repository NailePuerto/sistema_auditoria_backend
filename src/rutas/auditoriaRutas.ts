// src/rutas/auditoriaRutas.ts
import express from 'express';
import {
    listarAuditoriasPorProyecto,
    listarTodasAuditorias,
    obtenerAuditoria,
    crearAuditoria,
    actualizarEstadoAuditoria
} from '../controladores/auditoriaControlador';
import authMiddleware from '../middleware/authMiddleware';
import pool from '../config/baseDeDatos';
import { Request, Response } from 'express';

const router = express.Router();

router.use(authMiddleware);

// ========== ENDPOINTS EXISTENTES ==========
router.get('/todas', listarTodasAuditorias);
router.get('/:id', obtenerAuditoria);
router.put('/:id/estado', actualizarEstadoAuditoria);
router.get('/proyecto/:id', listarAuditoriasPorProyecto);
router.post('/proyecto/:id', crearAuditoria);

// ========== ENDPOINTS PARA CRITERIOS DE AUDITORÍA ==========

// POST /api/auditorias/:id/criterios - Guardar criterios seleccionados
router.post('/:id/criterios', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { criterios } = req.body; // Array de IDs de criterios
  const usuarioId = req.usuario?.id;
  
  try {
    // Verificar que la auditoría pertenece al usuario
    const auditoria = await pool.query(
      `SELECT a.id_auditoria 
       FROM auditoria a
       JOIN proyecto p ON a.id_proyecto = p.id_proyecto
       WHERE a.id_auditoria = $1 AND p.id_usuario_creador = $2`,
      [id, usuarioId]
    );
    
    if (auditoria.rows.length === 0) {
      return res.status(404).json({ error: 'Auditoría no encontrada' });
    }
    
    // Eliminar criterios existentes
    await pool.query('DELETE FROM auditoria_criterio WHERE id_auditoria = $1', [id]);
    
    // Insertar nuevos criterios
    for (const idCriterio of criterios) {
      await pool.query(
        'INSERT INTO auditoria_criterio (id_auditoria, id_criterio) VALUES ($1, $2)',
        [id, idCriterio]
      );
    }
    
    res.status(201).json({ mensaje: 'Criterios guardados correctamente' });
  } catch (error) {
    console.error('Error al guardar criterios:', error);
    res.status(500).json({ error: 'Error al guardar criterios' });
  }
});

// GET /api/auditorias/:id/criterios - Obtener criterios seleccionados
router.get('/:id/criterios', async (req: Request, res: Response) => {
  const { id } = req.params;
  const usuarioId = req.usuario?.id;
  
  try {
    const result = await pool.query(
      `SELECT c.id_criterio, c.codigo, c.nombre, c.descripcion, c.principio, c.nivel
       FROM auditoria_criterio ac
       JOIN criterio_wcag c ON ac.id_criterio = c.id_criterio
       JOIN auditoria a ON ac.id_auditoria = a.id_auditoria
       JOIN proyecto p ON a.id_proyecto = p.id_proyecto
       WHERE ac.id_auditoria = $1 AND p.id_usuario_creador = $2`,
      [id, usuarioId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener criterios:', error);
    res.status(500).json({ error: 'Error al obtener criterios' });
  }
});

export default router;