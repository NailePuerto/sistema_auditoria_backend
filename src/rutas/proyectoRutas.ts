// src/rutas/proyectoRutas.ts
import express from 'express';
import {
    listarProyectos,
    obtenerProyecto,
    crearProyecto,
    actualizarProyecto,
    eliminarProyecto
} from '../controladores/proyectoControlador';
import authMiddleware from '../middleware/authMiddleware';
import pool from '../config/baseDeDatos';
import { Request, Response } from 'express';

const router = express.Router();

router.use(authMiddleware);

router.get('/', listarProyectos);
router.get('/:id', obtenerProyecto);
router.post('/', crearProyecto);
router.put('/:id', actualizarProyecto);
router.delete('/:id', eliminarProyecto);


// Obtener imágenes de la página del proyecto
router.get('/:id/imagenes', async (req: Request, res: Response) => {
  const { id } = req.params;
  const usuarioId = req.usuario?.id;
  
  try {
    // Obtener la URL del proyecto
    const proyecto = await pool.query(
      'SELECT identificador FROM proyecto WHERE id_proyecto = $1 AND id_usuario_creador = $2',
      [id, usuarioId]
    );
    
    if (proyecto.rows.length === 0) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    
    const url = proyecto.rows[0].identificador;
    
    // Obtener HTML de la página
    const axios = require('axios');
    const cheerio = require('cheerio');
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    
    const imagenes: any[] = [];
    $('img').each((index: number, element: any) => {
      const src = $(element).attr('src');
      const alt = $(element).attr('alt') || '';
      
      // Convertir URLs relativas a absolutas
      let urlCompleta = src;
      if (src && !src.startsWith('http')) {
        try {
          urlCompleta = new URL(src, url).href;
        } catch (e) {
          urlCompleta = src;
        }
      }
      
      imagenes.push({
        id: index + 1,
        url: urlCompleta,
        alt: alt,
        selector: `${element.name}${element.attribs.class ? '.' + element.attribs.class.split(' ').join('.') : ''}`
      });
    });
    
    res.json(imagenes);
  } catch (error) {
    console.error('Error al obtener imágenes:', error);
    res.status(500).json({ error: 'Error al obtener imágenes de la página' });
  }
});

export default router;