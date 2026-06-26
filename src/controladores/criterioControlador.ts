// src/controladores/criterioControlador.ts
import { Request, Response } from 'express';
import pool from '../config/baseDeDatos';

export const listarCriterios = async (req: Request, res: Response) => {
    const { plataforma } = req.query;
    
    try {
        let query = 'SELECT id_criterio, codigo, nombre, descripcion, nivel FROM criterio_wcag';
        let params: any[] = [];
        
        if (plataforma === 'web') {
            query += ' WHERE aplica_web = true';
        } else if (plataforma === 'apk') {
            query += ' WHERE aplica_apk = true';
        } else if (plataforma === 'tv') {
            query += ' WHERE aplica_tv = true';
        }
        
        query += ' ORDER BY codigo ASC';
        
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al listar criterios' });
    }
};