// src/controladores/auditoriaControlador.ts
import { Request, Response } from 'express';
import pool from '../config/baseDeDatos';

export const listarAuditoriasPorProyecto = async (req: Request, res: Response) => {
    const { id } = req.params;
    const usuarioId = req.usuario?.id;
    
    try {
        const proyecto = await pool.query(
            'SELECT id_proyecto FROM proyecto WHERE id_proyecto = $1 AND id_usuario_creador = $2',
            [id, usuarioId]
        );
        
        if (proyecto.rows.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }
        
        const result = await pool.query(
            `SELECT a.id_auditoria, a.nombre, a.fecha_auditoria, a.estado,
                    CASE
                        WHEN (
                            (SELECT COUNT(*) FROM resultado_automatico WHERE id_auditoria = a.id_auditoria) +
                            (SELECT COUNT(*) FROM hallazgo_manual WHERE id_auditoria = a.id_auditoria)
                        ) = 0 THEN 0
                        ELSE ROUND(
                            (
                                (SELECT COUNT(*) FROM resultado_automatico WHERE id_auditoria = a.id_auditoria AND cumple = true) +
                                (SELECT COUNT(*) FROM hallazgo_manual WHERE id_auditoria = a.id_auditoria AND juicio = 'aceptable')
                            )::numeric /
                            (
                                (SELECT COUNT(*) FROM resultado_automatico WHERE id_auditoria = a.id_auditoria) +
                                (SELECT COUNT(*) FROM hallazgo_manual WHERE id_auditoria = a.id_auditoria)
                            ) * 100
                        )
                    END as cumplimiento
             FROM auditoria a
             WHERE a.id_proyecto = $1 
             ORDER BY a.fecha_auditoria DESC`,
            [id]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al listar auditorías' });
    }
};

export const listarTodasAuditorias = async (req: Request, res: Response) => {
    const usuarioId = req.usuario?.id;
    
    try {
        const result = await pool.query(
            `SELECT a.id_auditoria, a.nombre, a.fecha_auditoria, a.estado,
                    p.id_proyecto, p.nombre as proyecto_nombre,
                    CASE
                        WHEN (
                            (SELECT COUNT(*) FROM resultado_automatico WHERE id_auditoria = a.id_auditoria) +
                            (SELECT COUNT(*) FROM hallazgo_manual WHERE id_auditoria = a.id_auditoria)
                        ) = 0 THEN 0
                        ELSE ROUND(
                            (
                                (SELECT COUNT(*) FROM resultado_automatico WHERE id_auditoria = a.id_auditoria AND cumple = true) +
                                (SELECT COUNT(*) FROM hallazgo_manual WHERE id_auditoria = a.id_auditoria AND juicio = 'aceptable')
                            )::numeric /
                            (
                                (SELECT COUNT(*) FROM resultado_automatico WHERE id_auditoria = a.id_auditoria) +
                                (SELECT COUNT(*) FROM hallazgo_manual WHERE id_auditoria = a.id_auditoria)
                            ) * 100
                        )
                    END as cumplimiento
             FROM auditoria a
             JOIN proyecto p ON a.id_proyecto = p.id_proyecto
             WHERE p.id_usuario_creador = $1
             ORDER BY a.fecha_auditoria DESC`,
            [usuarioId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al listar auditorías' });
    }
};

export const obtenerAuditoria = async (req: Request, res: Response) => {
    const { id } = req.params;
    const usuarioId = req.usuario?.id;
    
    try {
        const result = await pool.query(
            `SELECT a.id_auditoria, a.nombre, a.fecha_auditoria, a.estado, a.id_proyecto,
                    p.nombre as proyecto_nombre
             FROM auditoria a
             JOIN proyecto p ON a.id_proyecto = p.id_proyecto
             WHERE a.id_auditoria = $1 AND p.id_usuario_creador = $2`,
            [id, usuarioId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Auditoría no encontrada' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener auditoría' });
    }
};

export const crearAuditoria = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nombre, fecha } = req.body;
    const usuarioId = req.usuario?.id;
    
    try {
        const proyecto = await pool.query(
            'SELECT id_proyecto FROM proyecto WHERE id_proyecto = $1 AND id_usuario_creador = $2',
            [id, usuarioId]
        );
        
        if (proyecto.rows.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }
        
        const nombreAuditoria = nombre || `Auditoría ${new Date().toLocaleDateString()}`;
        
        const result = await pool.query(
            `INSERT INTO auditoria (nombre, fecha_auditoria, estado, id_proyecto, id_usuario_evaluador)
             VALUES ($1, $2, 'en_curso', $3, $4)
             RETURNING id_auditoria, nombre, fecha_auditoria, estado`,
            [nombreAuditoria, fecha || new Date(), id, usuarioId]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear auditoría' });
    }
};

export const actualizarEstadoAuditoria = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { estado } = req.body;
    const usuarioId = req.usuario?.id;
    
    try {
        const result = await pool.query(
            `UPDATE auditoria 
             SET estado = $1
             FROM proyecto p
             WHERE auditoria.id_auditoria = $2 
               AND auditoria.id_proyecto = p.id_proyecto
               AND p.id_usuario_creador = $3
             RETURNING auditoria.id_auditoria, auditoria.estado`,
            [estado, id, usuarioId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Auditoría no encontrada' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar estado' });
    }
};