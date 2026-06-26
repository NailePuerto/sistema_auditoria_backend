// src/controladores/resultadoControlador.ts
import { Request, Response } from 'express';
import pool from '../config/baseDeDatos';
import { evaluarCriterio } from '../servicios/analizadorWcag';

// ========== GUARDAR RESULTADO (manual desde frontend) ==========
export const guardarResultado = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { id_criterio, cumple, valor_detectado, sugerencia, severidad } = req.body;
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
    
    // Verificar si ya existe un resultado para este criterio
    const existe = await pool.query(
      `SELECT id_resultado FROM resultado_automatico 
       WHERE id_auditoria = $1 AND id_criterio = $2`,
      [id, id_criterio]
    );
    
    let result;
    if (existe.rows.length > 0) {
      // Actualizar existente
      result = await pool.query(
        `UPDATE resultado_automatico 
         SET cumple = $1, valor_detectado = $2, sugerencia = $3, severidad = $4, fecha_evaluacion = CURRENT_TIMESTAMP
         WHERE id_resultado = $5
         RETURNING id_resultado, cumple`,
        [cumple, valor_detectado, sugerencia, severidad, existe.rows[0].id_resultado]
      );
    } else {
      // Insertar nuevo
      result = await pool.query(
        `INSERT INTO resultado_automatico 
         (cumple, valor_detectado, sugerencia, severidad, id_auditoria, id_criterio)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id_resultado, cumple`,
        [cumple, valor_detectado, sugerencia, severidad, id, id_criterio]
      );
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error en guardarResultado:', error);
    res.status(500).json({ error: 'Error al guardar resultado' });
  }
};

// ========== OBTENER RESULTADOS de una auditoría ==========
export const obtenerResultados = async (req: Request, res: Response) => {
  const { id } = req.params;
  const usuarioId = req.usuario?.id;
  
  try {
    const result = await pool.query(
      `SELECT r.id_resultado, r.cumple, r.valor_detectado, r.sugerencia, r.severidad,
              r.fecha_evaluacion, r.id_criterio, c.codigo, c.nombre as criterio_nombre
       FROM resultado_automatico r
       JOIN criterio_wcag c ON r.id_criterio = c.id_criterio
       JOIN auditoria a ON r.id_auditoria = a.id_auditoria
       JOIN proyecto p ON a.id_proyecto = p.id_proyecto
       WHERE r.id_auditoria = $1 AND p.id_usuario_creador = $2
       ORDER BY r.fecha_evaluacion ASC`,
      [id, usuarioId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error en obtenerResultados:', error);
    res.status(500).json({ error: 'Error al obtener resultados' });
  }
};

// ========== EVALUAR Y GUARDAR RESULTADO REAL (evaluación automática) ==========
export const evaluarYGuardarResultado = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { id_criterio, codigo_criterio } = req.body;
  const usuarioId = req.usuario?.id;
  
  try {
    // 1. Obtener la URL del proyecto asociado a la auditoría
    const proyecto = await pool.query(
      `SELECT p.identificador, p.tipo_plataforma
       FROM auditoria a
       JOIN proyecto p ON a.id_proyecto = p.id_proyecto
       WHERE a.id_auditoria = $1 AND p.id_usuario_creador = $2`,
      [id, usuarioId]
    );
    
    if (proyecto.rows.length === 0) {
      return res.status(404).json({ error: 'Auditoría no encontrada' });
    }
    
    const url = proyecto.rows[0].identificador;
    const tipoPlataforma = proyecto.rows[0].tipo_plataforma;
    
    // 2. Evaluar el criterio REALMENTE
    const resultado = await evaluarCriterio(url, codigo_criterio);
    
    // 3. Verificar si ya existe un resultado para este criterio
    const existe = await pool.query(
      `SELECT id_resultado FROM resultado_automatico 
       WHERE id_auditoria = $1 AND id_criterio = $2`,
      [id, id_criterio]
    );
    
    let result;
    if (existe.rows.length > 0) {
      // Actualizar existente
      result = await pool.query(
        `UPDATE resultado_automatico 
         SET cumple = $1, valor_detectado = $2, sugerencia = $3, severidad = $4, fecha_evaluacion = CURRENT_TIMESTAMP
         WHERE id_resultado = $5
         RETURNING id_resultado, cumple, valor_detectado, sugerencia, severidad`,
        [resultado.cumple, resultado.valor_detectado, resultado.sugerencia, resultado.severidad, existe.rows[0].id_resultado]
      );
    } else {
      // Insertar nuevo
      result = await pool.query(
        `INSERT INTO resultado_automatico 
         (cumple, valor_detectado, sugerencia, severidad, id_auditoria, id_criterio)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id_resultado, cumple, valor_detectado, sugerencia, severidad`,
        [resultado.cumple, resultado.valor_detectado, resultado.sugerencia, resultado.severidad, id, id_criterio]
      );
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error en evaluarYGuardarResultado:', error);
    res.status(500).json({ error: 'Error al evaluar criterio: ' + (error as Error).message });
  }
};