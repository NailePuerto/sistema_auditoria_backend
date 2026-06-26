// src/controladores/hallazgoControlador.ts
import { Request, Response } from 'express';
import pool from '../config/baseDeDatos';

export const guardarHallazgo = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { id_criterio, juicio, comentario, captura_pantalla, imagen_url, alt_original, selector } = req.body;
    const usuarioId = req.usuario?.id;
    
    try {
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
        
        // Verificar si ya existe un hallazgo para esta imagen
        const existe = await pool.query(
            `SELECT id_hallazgo FROM hallazgo_manual 
             WHERE id_auditoria = $1 AND id_criterio = $2 AND imagen_url = $3`,
            [id, id_criterio, imagen_url]
        );
        
        let result;
        if (existe.rows.length > 0) {
            // Actualizar existente
            result = await pool.query(
                `UPDATE hallazgo_manual 
                 SET juicio = $1, comentario = $2, captura_pantalla = $3, 
                     imagen_url = $4, alt_original = $5, selector = $6,
                     fecha_evaluacion = CURRENT_TIMESTAMP
                 WHERE id_hallazgo = $7
                 RETURNING id_hallazgo, juicio`,
                [juicio, comentario, captura_pantalla, imagen_url, alt_original, selector, existe.rows[0].id_hallazgo]
            );
        } else {
            // Insertar nuevo
            result = await pool.query(
                `INSERT INTO hallazgo_manual 
                 (juicio, comentario, captura_pantalla, id_auditoria, id_criterio, id_usuario_evaluador, imagen_url, alt_original, selector)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 RETURNING id_hallazgo, juicio`,
                [juicio, comentario, captura_pantalla, id, id_criterio, usuarioId, imagen_url, alt_original, selector]
            );
        }
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar hallazgo' });
    }
};

export const obtenerHallazgos = async (req: Request, res: Response) => {
    const { id } = req.params;
    const usuarioId = req.usuario?.id;
    
    try {
        const result = await pool.query(
            `SELECT h.id_hallazgo, h.juicio, h.comentario, h.captura_pantalla,
                    h.fecha_evaluacion, c.codigo, c.nombre as criterio_nombre,
                    h.imagen_url, h.alt_original, h.selector
             FROM hallazgo_manual h
             JOIN criterio_wcag c ON h.id_criterio = c.id_criterio
             JOIN auditoria a ON h.id_auditoria = a.id_auditoria
             JOIN proyecto p ON a.id_proyecto = p.id_proyecto
             WHERE h.id_auditoria = $1 AND p.id_usuario_creador = $2
             ORDER BY h.fecha_evaluacion ASC`,
            [id, usuarioId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener hallazgos' });
    }
};

export const obtenerTodosHallazgos = async (req: Request, res: Response) => {
    const usuarioId = req.usuario?.id;
    
    try {
        const result = await pool.query(
            `SELECT 
                h.id_hallazgo, 
                h.juicio, 
                h.comentario, 
                h.fecha_evaluacion,
                h.captura_pantalla,
                h.imagen_url,
                h.alt_original,
                h.selector,
                c.codigo, 
                c.nombre as criterio_nombre,
                p.nombre as proyecto_nombre, 
                p.id_proyecto,
                a.id_auditoria
             FROM hallazgo_manual h
             JOIN criterio_wcag c ON h.id_criterio = c.id_criterio
             JOIN auditoria a ON h.id_auditoria = a.id_auditoria
             JOIN proyecto p ON a.id_proyecto = p.id_proyecto
             WHERE p.id_usuario_creador = $1
             ORDER BY h.fecha_evaluacion DESC`,
            [usuarioId]
        );
        
        console.log("Hallazgos encontrados:", result.rows.length);
        console.log("Primer hallazgo:", result.rows[0]); // Para depurar
        
        res.json(result.rows);
    } catch (error) {
        console.error("Error en obtenerTodosHallazgos:", error);
        res.status(500).json({ error: 'Error al obtener hallazgos' });
    }
};