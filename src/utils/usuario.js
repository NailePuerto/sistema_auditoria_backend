// src/utils/usuario.js

// ✅ Importar la imagen local (avatar.png)
import avatarDefault from '../assets/images/avatar.png';

/**
 * Obtiene la URL del avatar de un usuario
 */
export const avatarUrl = (usuario) => {
  // Si el usuario tiene avatar guardado en la base de datos, usarlo
  if (usuario?.avatar_url) {
    return usuario.avatar_url;
  }
  
  // ✅ Si no tiene avatar, usar la imagen por defecto
  return avatarDefault;
};

/**
 * Formatea el rol del usuario para mostrarlo bonito
 */
export const formatearRol = (rol) => {
  if (!rol) return 'Usuario';
  
  const roles = {
    'administrador': 'Administrador',
    'evaluador': 'Evaluador',
    'consultor': 'Consultor',
  };
  
  return roles[rol.toLowerCase()] || rol;
};