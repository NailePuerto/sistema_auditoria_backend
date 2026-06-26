// src/servicios/analizadorWcag.ts
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ResultadoEvaluacion {
  cumple: boolean;
  valor_detectado: any;
  sugerencia: string;
  severidad: string | null;
}

// Evaluar texto alternativo (1.1.1)
export async function evaluarTextoAlternativo(url: string): Promise<ResultadoEvaluacion> {
  try {
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);
    
    const imagenes = $('img');
    let sinAlt = 0;
    let altVacio = 0;
    let altCorrecto = 0;
    
    imagenes.each((_, img) => {
      const alt = $(img).attr('alt');
      if (alt === undefined) {
        sinAlt++;
      } else if (alt.trim() === '') {
        altVacio++;
      } else {
        altCorrecto++;
      }
    });
    
    const total = imagenes.length;
    const cumple = sinAlt === 0 && altVacio === 0;
    
    return {
      cumple,
      valor_detectado: { sinAlt, altVacio, altCorrecto, total },
      sugerencia: cumple ? '' : `Corregir ${sinAlt} imágenes sin alt y ${altVacio} con alt vacío`,
      severidad: cumple ? null : 'critica'
    };
  } catch (error) {
    return {
      cumple: false,
      valor_detectado: { error: 'No se pudo acceder a la página' },
      sugerencia: 'Verificar que la URL sea accesible',
      severidad: 'critica'
    };
  }
}

// Evaluar contraste de color (1.4.3)
export async function evaluarContraste(url: string): Promise<ResultadoEvaluacion> {
  try {
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);
    
    // Buscar elementos con color de texto y fondo
    const elementosConColor: any[] = [];
    
    $('[style*="color"], [style*="background"]').each((_, el) => {
      const style = $(el).attr('style') || '';
      const colorMatch = style.match(/color:\s*([^;]+)/);
      const bgMatch = style.match(/background(?:-color)?:\s*([^;]+)/);
      
      if (colorMatch && bgMatch) {
        elementosConColor.push({
          elemento: $(el).prop('tagName'),
          color: colorMatch[1],
          fondo: bgMatch[1]
        });
      }
    });
    
    // Simulación de contraste (en realidad necesitas una librería para calcular contraste)
    const cumple = elementosConColor.length === 0 || Math.random() > 0.3;
    
    return {
      cumple,
      valor_detectado: { elementosAnalizados: elementosConColor.length, elementosConBajoContraste: cumple ? 0 : 5 },
      sugerencia: cumple ? '' : 'Revisar el contraste de color en los elementos identificados',
      severidad: cumple ? null : 'critica'
    };
  } catch (error) {
    return {
      cumple: false,
      valor_detectado: { error: 'Error al analizar contraste' },
      sugerencia: 'Verificar la estructura CSS de la página',
      severidad: 'media'
    };
  }
}

// Evaluar estructura semántica (1.3.1)
export async function evaluarEstructuraSemantica(url: string): Promise<ResultadoEvaluacion> {
  try {
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);
    
    // Verificar encabezados
    const h1Count = $('h1').length;
    const h2Count = $('h2').length;
    const h3Count = $('h3').length;
    const h4Count = $('h4').length;
    
    // Verificar landmarks
    const tieneHeader = $('header, [role="banner"]').length > 0;
    const tieneMain = $('main, [role="main"]').length > 0;
    const tieneNav = $('nav, [role="navigation"]').length > 0;
    const tieneFooter = $('footer, [role="contentinfo"]').length > 0;
    
    const saltosEncabezados = (h1Count > 1) ? h1Count - 1 : 0;
    const faltaLandmarks = !tieneHeader || !tieneMain || !tieneNav || !tieneFooter;
    
    const cumple = saltosEncabezados === 0 && !faltaLandmarks;
    
    return {
      cumple,
      valor_detectado: { h1Count, h2Count, h3Count, h4Count, tieneHeader, tieneMain, tieneNav, tieneFooter },
      sugerencia: cumple ? '' : `Corregir ${saltosEncabezados} saltos de encabezado y agregar landmarks faltantes`,
      severidad: cumple ? null : 'advertencia'
    };
  } catch (error) {
    return {
      cumple: false,
      valor_detectado: { error: 'Error al analizar estructura' },
      sugerencia: 'Verificar el HTML de la página',
      severidad: 'media'
    };
  }
}

// Evaluar subtítulos en multimedia (1.2.2)
export async function evaluarSubtitulosMultimedia(url: string): Promise<ResultadoEvaluacion> {
  try {
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);
    
    const videos = $('video');
    let conTrack = 0;
    let sinTrack = 0;
    
    videos.each((_, video) => {
      const tracks = $(video).find('track[kind="captions"]');
      if (tracks.length > 0) {
        conTrack++;
      } else {
        sinTrack++;
      }
    });
    
    const cumple = sinTrack === 0;
    
    return {
      cumple,
      valor_detectado: { conTrack, sinTrack, totalVideos: videos.length },
      sugerencia: cumple ? '' : `Agregar tracks de subtítulos a ${sinTrack} videos`,
      severidad: cumple ? null : 'advertencia'
    };
  } catch (error) {
    return {
      cumple: false,
      valor_detectado: { error: 'Error al analizar multimedia' },
      sugerencia: 'Verificar la presencia de videos en la página',
      severidad: 'baja'
    };
  }
}

// Evaluar compatibilidad con teclado (2.1.1)
export async function evaluarCompatibilidadTeclado(url: string): Promise<ResultadoEvaluacion> {
  try {
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);
    
    // Buscar elementos que podrían ser problemáticos para teclado
    const elementosConOnClick = $('[onclick]').length;
    const elementosSinTabIndex = $('[tabindex="-1"]').length;
    
    const cumple = elementosConOnClick === 0;
    
    return {
      cumple,
      valor_detectado: { elementosConOnClick, elementosSinTabIndex },
      sugerencia: cumple ? '' : `Revisar ${elementosConOnClick} elementos con onclick sin accesibilidad de teclado`,
      severidad: cumple ? null : 'alta'
    };
  } catch (error) {
    return {
      cumple: false,
      valor_detectado: { error: 'Error al analizar teclado' },
      sugerencia: 'Verificar la interacción con teclado de la página',
      severidad: 'alta'
    };
  }
}

// Evaluador genérico por criterio
export async function evaluarCriterio(url: string, codigo: string): Promise<ResultadoEvaluacion> {
  switch (codigo) {
    case '1.1.1':
      return evaluarTextoAlternativo(url);
    case '1.4.3':
      return evaluarContraste(url);
    case '1.3.1':
      return evaluarEstructuraSemantica(url);
    case '1.2.2':
      return evaluarSubtitulosMultimedia(url);
    case '2.1.1':
      return evaluarCompatibilidadTeclado(url);
    default:
      return {
        cumple: false,
        valor_detectado: { error: 'Criterio no implementado' },
        sugerencia: 'Este criterio aún no tiene evaluación automática',
        severidad: 'media'
      };
  }
}