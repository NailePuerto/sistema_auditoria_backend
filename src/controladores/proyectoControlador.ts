// src/controladores/proyectoControlador.ts
import { Request, Response } from 'express';
import pool from '../config/baseDeDatos';

export const listarProyectos = async (req: Request, res: Response) => {
    const usuarioId = req.usuario?.id;
    
    try {
        const result = await pool.query(
            `SELECT id_proyecto, nombre, descripcion, tipo_plataforma, identificador, 
                    nivel_conformidad_objetivo, fecha_creacion
             FROM proyecto 
             WHERE id_usuario_creador = $1 
             ORDER BY fecha_creacion DESC`,
            [usuarioId]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al listar proyectos' });
    }
};

export const obtenerProyecto = async (req: Request, res: Response) => {
    const { id } = req.params;
    const usuarioId = req.usuario?.id;
    
    try {
        const result = await pool.query(
            `SELECT id_proyecto, nombre, descripcion, tipo_plataforma, identificador, 
                    nivel_conformidad_objetivo, fecha_creacion
             FROM proyecto 
             WHERE id_proyecto = $1 AND id_usuario_creador = $2`,
            [id, usuarioId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener proyecto' });
    }
};

export const crearProyecto = async (req: Request, res: Response) => {
    const { nombre, descripcion, tipo_plataforma, identificador, nivel_conformidad_objetivo } = req.body;
    const usuarioId = req.usuario?.id;
    
    try {
        const result = await pool.query(
            `INSERT INTO proyecto (nombre, descripcion, tipo_plataforma, identificador, 
                                   nivel_conformidad_objetivo, id_usuario_creador)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id_proyecto, nombre, descripcion, tipo_plataforma, identificador, 
                       nivel_conformidad_objetivo, fecha_creacion`,
            [nombre, descripcion, tipo_plataforma, identificador, nivel_conformidad_objetivo || 'AA', usuarioId]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear proyecto' });
    }
};

export const actualizarProyecto = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { nombre, descripcion, tipo_plataforma, identificador, nivel_conformidad_objetivo } = req.body;
    const usuarioId = req.usuario?.id;
    
    try {
        const result = await pool.query(
            `UPDATE proyecto 
             SET nombre = $1, descripcion = $2, tipo_plataforma = $3, 
                 identificador = $4, nivel_conformidad_objetivo = $5
             WHERE id_proyecto = $6 AND id_usuario_creador = $7
             RETURNING id_proyecto, nombre, descripcion, tipo_plataforma, identificador, 
                       nivel_conformidad_objetivo, fecha_creacion`,
            [nombre, descripcion, tipo_plataforma, identificador, nivel_conformidad_objetivo, id, usuarioId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar proyecto' });
    }
};

export const eliminarProyecto = async (req: Request, res: Response) => {
    const { id } = req.params;
    const usuarioId = req.usuario?.id;
    
    try {
        const result = await pool.query(
            'DELETE FROM proyecto WHERE id_proyecto = $1 AND id_usuario_creador = $2 RETURNING id_proyecto',
            [id, usuarioId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Proyecto no encontrado' });
        }
        
        res.json({ mensaje: 'Proyecto eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar proyecto' });
    }
};