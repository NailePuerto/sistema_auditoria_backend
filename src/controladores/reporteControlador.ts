// src/controladores/reporteControlador.ts
import { Request, Response } from 'express';
import pool from '../config/baseDeDatos';

const PRINCIPIOS_ORDEN = ['Perceptible', 'Operable', 'Comprensible', 'Robusto'];

const ORDEN_SEVERIDAD: Record<string, number> = {
    critica: 0,
    alta: 1,
    advertencia: 2,
    media: 2,
    baja: 3,
    cumple: 4,
};

function hallazgoCumple(juicio: string): boolean {
    return juicio === 'aceptable';
}

function normalizarSeveridad(severidad: string | null, cumple: boolean): string {
    if (cumple) return 'cumple';
    const s = (severidad || 'media').toLowerCase();
    if (s === 'critica' || s === 'crítica' || s === 'alta') return 'critica';
    if (s === 'advertencia' || s === 'media') return 'advertencia';
    if (s === 'baja') return 'advertencia';
    return 'advertencia';
}

function severidadManual(juicio: string): string {
    if (juicio === 'aceptable') return 'cumple';
    if (juicio === 'faltante') return 'critica';
    if (juicio === 'no_descriptivo') return 'advertencia';
    return 'advertencia';
}

function formatValorDetectado(valor: unknown): string {
    if (!valor) return 'Sin detalle adicional.';
    if (typeof valor === 'string') return valor;

    const obj = valor as Record<string, unknown>;
    if (obj.error) return String(obj.error);

    if (obj.sinAlt !== undefined) {
        const total = obj.total ?? 0;
        return `Se detectaron ${total} imágenes: ${obj.sinAlt} sin alt, ${obj.altVacio} con alt vacío, ${obj.altCorrecto} correctas.`;
    }

    if (obj.ratioMinimo !== undefined) {
        return `Contraste mínimo detectado: ${obj.ratioMinimo}. Umbral requerido: ${obj.umbral ?? '4.5:1'}.`;
    }

    if (obj.elementosNoAccesibles !== undefined) {
        return `Elementos no accesibles por teclado: ${obj.elementosNoAccesibles}. Total evaluados: ${obj.total ?? 'N/A'}.`;
    }

    const entries = Object.entries(obj).filter(([k]) => k !== 'error');
    if (entries.length === 0) return 'Sin detalle adicional.';
    return entries.map(([k, v]) => `${k}: ${v}`).join('. ');
}

function etiquetaNivel(porcentaje: number): string {
    let nivel = 'A';
    if (porcentaje >= 90) nivel = 'AAA';
    else if (porcentaje >= 70) nivel = 'AA';
    const sufijo = porcentaje < 100 ? ' Parcial' : '';
    return `Nivel ${nivel}${sufijo}`;
}

const ORDEN_SEVERIDAD_TECNICO: Record<string, number> = {
    critica: 0,
    alta: 1,
    media: 2,
    baja: 3,
    cumple: 4,
    ninguna: 5,
};

function severidadTecnica(severidad: string | null): { etiqueta: string; clase: string } {
    const s = (severidad || 'media').toLowerCase();
    if (s === 'critica' || s === 'crítica') return { etiqueta: 'Crítica', clase: 'critica' };
    if (s === 'alta') return { etiqueta: 'Alta', clase: 'alta' };
    if (s === 'advertencia' || s === 'media') return { etiqueta: 'Media', clase: 'media' };
    if (s === 'baja') return { etiqueta: 'Baja', clase: 'baja' };
    return { etiqueta: 'Media', clase: 'media' };
}

function extractUbicacionAuto(valor: unknown, codigo: string): string {
    if (!valor || typeof valor !== 'object') {
        return `Evaluación automática — criterio ${codigo}`;
    }

    const obj = valor as Record<string, unknown>;
    if (obj.error) return String(obj.error);

    if (obj.elementosConOnClick !== undefined) {
        return `${obj.elementosConOnClick} elemento(s) con onclick, ${obj.elementosSinTabIndex ?? 0} con tabindex=-1`;
    }
    if (obj.sinAlt !== undefined) {
        return `${obj.sinAlt} img sin alt, ${obj.altVacio} con alt vacío (total: ${obj.total ?? 0})`;
    }
    if (obj.elementosAnalizados !== undefined) {
        return `${obj.elementosAnalizados} elementos analizados, ${obj.elementosConBajoContraste ?? 0} con bajo contraste`;
    }
    if (obj.h1Count !== undefined) {
        return `Encabezados h1–h4: ${obj.h1Count}/${obj.h2Count}/${obj.h3Count}/${obj.h4Count}`;
    }
    if (obj.totalVideos !== undefined) {
        return `${obj.sinTrack ?? 0} video(s) sin subtítulos de ${obj.totalVideos}`;
    }

    const entries = Object.entries(obj).slice(0, 3);
    return entries.map(([k, v]) => `${k}: ${v}`).join(', ') || `Criterio ${codigo}`;
}

function extractUbicacionManual(h: {
    selector?: string;
    imagen_url?: string;
    alt_original?: string;
}): string {
    if (h.selector) return h.selector;
    if (h.imagen_url) {
        return h.imagen_url.length > 80 ? `${h.imagen_url.slice(0, 80)}…` : h.imagen_url;
    }
    if (h.alt_original) return `alt="${h.alt_original}"`;
    return 'Imagen evaluada manualmente';
}

function sugerenciaManual(juicio: string): string {
    if (juicio === 'faltante') {
        return 'Agregar un atributo alt descriptivo o marcar la imagen como decorativa con alt="".';
    }
    if (juicio === 'no_descriptivo') {
        return 'Mejorar el texto alternativo para que describa con precisión el contenido o función de la imagen.';
    }
    return 'Revisar manualmente la imagen evaluada.';
}

function descripcionCumplimiento(porcentaje: number): string {
    if (porcentaje >= 90) {
        return 'El sistema cumple en gran medida con los estándares de accesibilidad requeridos por la normativa vigente.';
    }
    if (porcentaje >= 70) {
        return 'El sistema cumple parcialmente con los estándares de accesibilidad requeridos por la normativa vigente.';
    }
    if (porcentaje >= 50) {
        return 'El sistema presenta cumplimiento limitado. Se recomienda atender las observaciones críticas identificadas.';
    }
    return 'El sistema no alcanza el nivel mínimo de accesibilidad. Se requiere intervención prioritaria.';
}

export const generarReporteEjecutivo = async (req: Request, res: Response) => {
    const { id } = req.params;
    const usuarioId = req.usuario?.id;

    try {
        const meta = await pool.query(
            `SELECT a.id_auditoria, a.nombre as auditoria_nombre, a.fecha_auditoria, a.estado,
                    p.id_proyecto, p.nombre as proyecto_nombre, p.identificador,
                    p.nivel_conformidad_objetivo, p.tipo_plataforma
             FROM auditoria a
             JOIN proyecto p ON a.id_proyecto = p.id_proyecto
             WHERE a.id_auditoria = $1 AND p.id_usuario_creador = $2`,
            [id, usuarioId]
        );

        if (meta.rows.length === 0) {
            return res.status(404).json({ error: 'Auditoría no encontrada' });
        }

        const resultados = await pool.query(
            `SELECT r.cumple, r.severidad, r.valor_detectado, r.sugerencia,
                    c.codigo, c.nombre as criterio_nombre, c.principio, c.nivel
             FROM resultado_automatico r
             JOIN criterio_wcag c ON r.id_criterio = c.id_criterio
             WHERE r.id_auditoria = $1`,
            [id]
        );

        const hallazgos = await pool.query(
            `SELECT h.juicio, h.comentario,
                    c.codigo, c.nombre as criterio_nombre, c.principio, c.nivel
             FROM hallazgo_manual h
             JOIN criterio_wcag c ON h.id_criterio = c.id_criterio
             WHERE h.id_auditoria = $1`,
            [id]
        );

        const totalCriterios = resultados.rows.length + hallazgos.rows.length;
        const cumplenAuto = resultados.rows.filter(r => r.cumple === true).length;
        const cumplenManual = hallazgos.rows.filter(h => hallazgoCumple(h.juicio)).length;
        const cumplen = cumplenAuto + cumplenManual;
        const porcentaje = totalCriterios > 0 ? Math.round((cumplen / totalCriterios) * 100) : 0;

        const principios: Record<string, { total: number; cumplen: number }> = {};
        PRINCIPIOS_ORDEN.forEach(p => {
            principios[p] = { total: 0, cumplen: 0 };
        });

        resultados.rows.forEach(r => {
            if (r.principio && principios[r.principio]) {
                principios[r.principio].total++;
                if (r.cumple) principios[r.principio].cumplen++;
            }
        });

        hallazgos.rows.forEach(h => {
            if (h.principio && principios[h.principio]) {
                principios[h.principio].total++;
                if (hallazgoCumple(h.juicio)) principios[h.principio].cumplen++;
            }
        });

        const cumplimientoPorPrincipio: Record<string, number> = {};
        PRINCIPIOS_ORDEN.forEach(p => {
            cumplimientoPorPrincipio[p] = principios[p].total > 0
                ? Math.round((principios[p].cumplen / principios[p].total) * 100)
                : 0;
        });

        let nivelAlcanzado = 'A';
        if (porcentaje >= 90) nivelAlcanzado = 'AAA';
        else if (porcentaje >= 70) nivelAlcanzado = 'AA';

        const recomendaciones: Array<{
            id: number;
            severidad: string;
            titulo: string;
            descripcion: string;
            sugerencia: string;
            wcag: string;
            tipo: string;
        }> = [];

        let recId = 1;

        resultados.rows.forEach(r => {
            const severidad = normalizarSeveridad(r.severidad, r.cumple === true);
            recomendaciones.push({
                id: recId++,
                severidad,
                titulo: `${r.codigo} ${r.criterio_nombre}`,
                descripcion: r.cumple
                    ? `El criterio ${r.codigo} fue evaluado automáticamente y cumple con los requisitos.`
                    : formatValorDetectado(r.valor_detectado),
                sugerencia: r.sugerencia || '',
                wcag: `WCAG ${r.nivel || 'A'}`,
                tipo: 'Automático',
            });
        });

        hallazgos.rows.forEach(h => {
            const severidad = severidadManual(h.juicio);
            const descripcionManual = h.comentario?.trim()
                || (severidad === 'cumple'
                    ? 'La imagen evaluada manualmente cumple con el criterio de texto alternativo.'
                    : `Hallazgo manual registrado con juicio: ${h.juicio.replace('_', ' ')}.`);

            recomendaciones.push({
                id: recId++,
                severidad,
                titulo: `${h.codigo} ${h.criterio_nombre}`,
                descripcion: descripcionManual,
                sugerencia: severidad === 'cumple'
                    ? ''
                    : 'Revise la imagen evaluada y aplique un texto alternativo descriptivo según su función.',
                wcag: `WCAG ${h.nivel || 'A'}`,
                tipo: 'Manual',
            });
        });

        recomendaciones.sort((a, b) => {
            const ordenA = ORDEN_SEVERIDAD[a.severidad] ?? 99;
            const ordenB = ORDEN_SEVERIDAD[b.severidad] ?? 99;
            if (ordenA !== ordenB) return ordenA - ordenB;
            return a.titulo.localeCompare(b.titulo);
        });

        const info = meta.rows[0];

        res.json({
            porcentaje,
            nivelAlcanzado,
            nivelAlcanzadoEtiqueta: etiquetaNivel(porcentaje),
            descripcionCumplimiento: descripcionCumplimiento(porcentaje),
            cumplimientoPorPrincipio,
            totalCriterios,
            cumplen,
            noCumplen: totalCriterios - cumplen,
            recomendaciones,
            auditoria: {
                id: info.id_auditoria,
                nombre: info.auditoria_nombre,
                fecha: info.fecha_auditoria,
                estado: info.estado,
            },
            proyecto: {
                id: info.id_proyecto,
                nombre: info.proyecto_nombre,
                identificador: info.identificador,
                tipo_plataforma: info.tipo_plataforma,
                nivel_conformidad_objetivo: info.nivel_conformidad_objetivo,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al generar reporte ejecutivo' });
    }
};

export const generarReporteTecnico = async (req: Request, res: Response) => {
    const { id } = req.params;
    const usuarioId = req.usuario?.id;

    try {
        const meta = await pool.query(
            `SELECT a.id_auditoria, a.nombre as auditoria_nombre, a.fecha_auditoria, a.estado,
                    p.id_proyecto, p.nombre as proyecto_nombre, p.identificador,
                    p.nivel_conformidad_objetivo, p.tipo_plataforma
             FROM auditoria a
             JOIN proyecto p ON a.id_proyecto = p.id_proyecto
             WHERE a.id_auditoria = $1 AND p.id_usuario_creador = $2`,
            [id, usuarioId]
        );

        if (meta.rows.length === 0) {
            return res.status(404).json({ error: 'Auditoría no encontrada' });
        }

        const resultadosAuto = await pool.query(
            `SELECT r.id_resultado, r.cumple, r.valor_detectado, r.sugerencia, r.severidad,
                    c.codigo, c.nombre as criterio_nombre
             FROM resultado_automatico r
             JOIN criterio_wcag c ON r.id_criterio = c.id_criterio
             WHERE r.id_auditoria = $1`,
            [id]
        );

        const hallazgosManuales = await pool.query(
            `SELECT h.id_hallazgo, h.juicio, h.comentario, h.selector, h.imagen_url, h.alt_original,
                    c.codigo, c.nombre as criterio_nombre
             FROM hallazgo_manual h
             JOIN criterio_wcag c ON h.id_criterio = c.id_criterio
             WHERE h.id_auditoria = $1`,
            [id]
        );

        const criteriosEvaluados: Array<{
            id: number;
            codigo: string;
            nombre: string;
            tipo: string;
            cumple: boolean;
            severidad: string;
            severidadClase: string;
            descripcion: string;
            ubicacion: string;
            sugerencia: string;
        }> = [];

        resultadosAuto.rows.forEach(p => {
            const cumple = p.cumple === true;

            if (cumple) {
                criteriosEvaluados.push({
                    id: p.id_resultado,
                    codigo: p.codigo,
                    nombre: p.criterio_nombre,
                    tipo: 'Automático',
                    cumple: true,
                    severidad: 'Baja',
                    severidadClase: 'baja',
                    descripcion: `El criterio ${p.codigo} fue evaluado automáticamente y cumple con los requisitos WCAG.`,
                    ubicacion: '—',
                    sugerencia: '—',
                });
            } else {
                const sev = severidadTecnica(p.severidad);
                criteriosEvaluados.push({
                    id: p.id_resultado,
                    codigo: p.codigo,
                    nombre: p.criterio_nombre,
                    tipo: 'Automático',
                    cumple: false,
                    severidad: sev.etiqueta,
                    severidadClase: sev.clase,
                    descripcion: formatValorDetectado(p.valor_detectado),
                    ubicacion: extractUbicacionAuto(p.valor_detectado, p.codigo),
                    sugerencia: p.sugerencia || 'Revise el criterio WCAG indicado.',
                });
            }
        });

        hallazgosManuales.rows.forEach(h => {
            const cumple = hallazgoCumple(h.juicio);

            if (cumple) {
                criteriosEvaluados.push({
                    id: h.id_hallazgo,
                    codigo: h.codigo,
                    nombre: h.criterio_nombre,
                    tipo: 'Manual',
                    cumple: true,
                    severidad: 'Baja',
                    severidadClase: 'baja',
                    descripcion: h.comentario?.trim()
                        || 'Imagen evaluada manualmente: texto alternativo aceptable.',
                    ubicacion: '—',
                    sugerencia: '—',
                });
            } else {
                const sevRaw = h.juicio === 'faltante' ? 'critica' : 'advertencia';
                const sev = severidadTecnica(sevRaw);
                criteriosEvaluados.push({
                    id: h.id_hallazgo,
                    codigo: h.codigo,
                    nombre: h.criterio_nombre,
                    tipo: 'Manual',
                    cumple: false,
                    severidad: sev.etiqueta,
                    severidadClase: sev.clase,
                    descripcion: h.comentario?.trim()
                        || `Hallazgo manual: texto alternativo ${h.juicio.replace('_', ' ')}.`,
                    ubicacion: extractUbicacionManual(h),
                    sugerencia: sugerenciaManual(h.juicio),
                });
            }
        });

        criteriosEvaluados.sort((a, b) => {
            if (a.cumple !== b.cumple) return a.cumple ? 1 : -1;
            const ordenA = ORDEN_SEVERIDAD_TECNICO[a.severidadClase] ?? 99;
            const ordenB = ORDEN_SEVERIDAD_TECNICO[b.severidadClase] ?? 99;
            if (ordenA !== ordenB) return ordenA - ordenB;
            return a.codigo.localeCompare(b.codigo);
        });

        const problemas = criteriosEvaluados.filter(c => !c.cumple);

        const problemasPorSeveridad = {
            critica: problemas.filter(h => h.severidadClase === 'critica').length,
            alta: problemas.filter(h => h.severidadClase === 'alta').length,
            media: problemas.filter(h => h.severidadClase === 'media').length,
            baja: problemas.filter(h => h.severidadClase === 'baja').length,
        };

        const info = meta.rows[0];

        res.json({
            totalProblemas: problemas.length,
            criteriosCumplen: criteriosEvaluados.filter(c => c.cumple).length,
            criteriosEvaluados: criteriosEvaluados.length,
            problemasPorSeveridad,
            criterios: criteriosEvaluados,
            hallazgos: criteriosEvaluados,
            auditoria: {
                id: info.id_auditoria,
                nombre: info.auditoria_nombre,
                fecha: info.fecha_auditoria,
                estado: info.estado,
            },
            proyecto: {
                id: info.id_proyecto,
                nombre: info.proyecto_nombre,
                identificador: info.identificador,
                tipo_plataforma: info.tipo_plataforma,
                nivel_conformidad_objetivo: info.nivel_conformidad_objetivo,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al generar reporte técnico' });
    }
};

export const listarTodosReportes = async (req: Request, res: Response) => {
    const usuarioId = req.usuario?.id;

    try {
        const result = await pool.query(
            `SELECT a.id_auditoria, a.nombre as auditoria_nombre, a.fecha_auditoria, a.estado,
                    p.id_proyecto, p.nombre as proyecto_nombre,
                    (
                        (SELECT COUNT(*) FROM resultado_automatico WHERE id_auditoria = a.id_auditoria) +
                        (SELECT COUNT(*) FROM hallazgo_manual WHERE id_auditoria = a.id_auditoria)
                    ) as total_criterios,
                    (
                        (SELECT COUNT(*) FROM resultado_automatico WHERE id_auditoria = a.id_auditoria AND cumple = true) +
                        (SELECT COUNT(*) FROM hallazgo_manual WHERE id_auditoria = a.id_auditoria AND juicio = 'aceptable')
                    ) as cumplen,
                    (
                        (SELECT COUNT(*) FROM resultado_automatico WHERE id_auditoria = a.id_auditoria AND cumple = false) +
                        (SELECT COUNT(*) FROM hallazgo_manual WHERE id_auditoria = a.id_auditoria AND juicio != 'aceptable')
                    ) as total_problemas
             FROM auditoria a
             JOIN proyecto p ON a.id_proyecto = p.id_proyecto
             WHERE p.id_usuario_creador = $1
               AND (
                    EXISTS (SELECT 1 FROM resultado_automatico WHERE id_auditoria = a.id_auditoria)
                    OR EXISTS (SELECT 1 FROM hallazgo_manual WHERE id_auditoria = a.id_auditoria)
               )
             ORDER BY a.fecha_auditoria DESC`,
            [usuarioId]
        );

        const reportes: Array<{
            id: string;
            proyectoId: number;
            proyectoNombre: string;
            auditoriaId: number;
            auditoriaNombre: string;
            tipo: string;
            fecha: string;
            porcentaje?: number;
            totalProblemas?: number;
            criteriosEvaluados?: number;
        }> = [];

        result.rows.forEach(row => {
            const totalCriterios = Number(row.total_criterios);
            const cumplen = Number(row.cumplen);
            const totalProblemas = Number(row.total_problemas);
            const porcentaje = totalCriterios > 0
                ? Math.round((cumplen / totalCriterios) * 100)
                : 0;

            reportes.push({
                id: `${row.id_auditoria}-ejecutivo`,
                proyectoId: row.id_proyecto,
                proyectoNombre: row.proyecto_nombre,
                auditoriaId: row.id_auditoria,
                auditoriaNombre: row.auditoria_nombre,
                tipo: 'ejecutivo',
                fecha: row.fecha_auditoria,
                porcentaje,
            });

            reportes.push({
                id: `${row.id_auditoria}-tecnico`,
                proyectoId: row.id_proyecto,
                proyectoNombre: row.proyecto_nombre,
                auditoriaId: row.id_auditoria,
                auditoriaNombre: row.auditoria_nombre,
                tipo: 'tecnico',
                fecha: row.fecha_auditoria,
                totalProblemas,
                criteriosEvaluados: totalCriterios,
            });
        });

        res.json(reportes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al listar reportes' });
    }
};