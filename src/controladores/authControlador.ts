// src/controladores/authControlador.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/baseDeDatos';

function formatearUsuario(row: Record<string, unknown>) {
    return {
        id: row.id_usuario,
        nombre: row.nombre,
        email: row.email,
        rol: row.rol,
        avatar_url: row.avatar_url || null,
    };
}

export const registrar = async (req: Request, res: Response) => {
    const { nombre, email, password, rol } = req.body;
        
    try {
        const usuarioExistente = await pool.query(
            'SELECT id_usuario FROM usuario WHERE email = $1',
            [email]
        );
        
        if (usuarioExistente.rows.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }
        
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        const result = await pool.query(
            `INSERT INTO usuario (nombre, email, password_hash, rol) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id_usuario, nombre, email, rol, fecha_registro`,
            [nombre, email, passwordHash, rol || 'evaluador']
        );
        
        const usuario = result.rows[0];
        
        const token = jwt.sign(
            { id: usuario.id_usuario, email: usuario.email, rol: usuario.rol },
            process.env.JWT_SECRET || 'secreto',
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            token,
            usuario: formatearUsuario(usuario),
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al registrar usuario' });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    
    try {
        const result = await pool.query(
            'SELECT id_usuario, nombre, email, password_hash, rol FROM usuario WHERE email = $1 AND activo = true',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos' });
        }
        
        const usuario = result.rows[0];
        const passwordValido = await bcrypt.compare(password, usuario.password_hash);
        
        if (!passwordValido) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos' });
        }
        
        const token = jwt.sign(
            { id: usuario.id_usuario, email: usuario.email, rol: usuario.rol },
            process.env.JWT_SECRET || 'secreto',
            { expiresIn: '7d' }
        );
        
        res.json({
            token,
            usuario: formatearUsuario(usuario),
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
};

export const verificar = async (req: Request, res: Response) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto') as any;
        
        const result = await pool.query(
            'SELECT id_usuario, nombre, email, rol, avatar_url FROM usuario WHERE id_usuario = $1 AND activo = true',
            [decoded.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }
        
        res.json({ usuario: formatearUsuario(result.rows[0]) });
        
    } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};

export const actualizarPerfil = async (req: Request, res: Response) => {
    const userId = req.usuario!.id;
    const { nombre, email, avatar_url } = req.body;

    if (!nombre?.trim() || !email?.trim()) {
        return res.status(400).json({ error: 'Nombre y email son obligatorios' });
    }

    try {
        const emailExistente = await pool.query(
            'SELECT id_usuario FROM usuario WHERE email = $1 AND id_usuario != $2',
            [email.trim(), userId]
        );

        if (emailExistente.rows.length > 0) {
            return res.status(400).json({ error: 'El email ya está en uso por otro usuario' });
        }

        const result = await pool.query(
            `UPDATE usuario
             SET nombre = $1, email = $2, avatar_url = COALESCE($3, avatar_url)
             WHERE id_usuario = $4 AND activo = true
             RETURNING id_usuario, nombre, email, rol, avatar_url`,
            [nombre.trim(), email.trim(), avatar_url ?? null, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ usuario: formatearUsuario(result.rows[0]) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al actualizar el perfil' });
    }
};

export const cambiarPassword = async (req: Request, res: Response) => {
    const userId = req.usuario!.id;
    const { passwordActual, passwordNueva } = req.body;

    if (!passwordActual || !passwordNueva) {
        return res.status(400).json({ error: 'Debe indicar la contraseña actual y la nueva' });
    }

    if (passwordNueva.length < 8) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    try {
        const result = await pool.query(
            'SELECT password_hash FROM usuario WHERE id_usuario = $1 AND activo = true',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const passwordValido = await bcrypt.compare(passwordActual, result.rows[0].password_hash);

        if (!passwordValido) {
            return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(passwordNueva, salt);

        await pool.query(
            'UPDATE usuario SET password_hash = $1 WHERE id_usuario = $2',
            [passwordHash, userId]
        );

        res.json({ mensaje: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al cambiar la contraseña' });
    }
};