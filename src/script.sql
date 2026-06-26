-- ============================================
-- TABLA: usuario
-- ============================================
CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) DEFAULT 'evaluador',
    avatar_url TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);

-- ============================================
-- TABLA: proyecto
-- ============================================
CREATE TABLE proyecto (
    id_proyecto SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    tipo_plataforma VARCHAR(10) NOT NULL,
    identificador TEXT NOT NULL,
    nivel_conformidad_objetivo VARCHAR(5) DEFAULT 'AA',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_usuario_creador INTEGER REFERENCES usuario(id_usuario)
);

-- ============================================
-- TABLA: auditoria
-- ============================================
CREATE TABLE auditoria (
    id_auditoria SERIAL PRIMARY KEY,
    nombre VARCHAR(200),
    fecha_auditoria TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(15) DEFAULT 'en_curso',
    id_proyecto INTEGER REFERENCES proyecto(id_proyecto),
    id_usuario_evaluador INTEGER REFERENCES usuario(id_usuario)
);

-- ============================================
-- TABLA: criterio_wcag
-- ============================================
CREATE TABLE criterio_wcag (
    id_criterio SERIAL PRIMARY KEY,
    codigo VARCHAR(10) NOT NULL,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    principio VARCHAR(20),
    nivel CHAR(1),
    aplica_web BOOLEAN DEFAULT TRUE,
    aplica_apk BOOLEAN DEFAULT FALSE,
    aplica_tv BOOLEAN DEFAULT FALSE
);

-- ============================================
-- TABLA: resultado_automatico
-- ============================================
CREATE TABLE resultado_automatico (
    id_resultado SERIAL PRIMARY KEY,
    cumple BOOLEAN,
    valor_detectado JSONB,
    sugerencia TEXT,
    severidad VARCHAR(15),
    fecha_evaluacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_auditoria INTEGER REFERENCES auditoria(id_auditoria),
    id_criterio INTEGER REFERENCES criterio_wcag(id_criterio)
);

-- ============================================
-- TABLA: hallazgo_manual
-- ============================================
CREATE TABLE hallazgo_manual (
    id_hallazgo SERIAL PRIMARY KEY,
    juicio VARCHAR(30),
    comentario TEXT,
    captura_pantalla TEXT,
    fecha_evaluacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_auditoria INTEGER REFERENCES auditoria(id_auditoria),
    id_criterio INTEGER REFERENCES criterio_wcag(id_criterio),
    id_usuario_evaluador INTEGER REFERENCES usuario(id_usuario)
);

-- ============================================
-- TABLA: reporte
-- ============================================
CREATE TABLE reporte (
    id_reporte SERIAL PRIMARY KEY,
    formato VARCHAR(10),
    ruta_archivo TEXT,
    fecha_generacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_auditoria INTEGER REFERENCES auditoria(id_auditoria)
);

-- ============================================
-- TABLA: reporte_ejecutivo
-- ============================================
CREATE TABLE reporte_ejecutivo (
    id_reporte INTEGER PRIMARY KEY REFERENCES reporte(id_reporte),
    porcentaje_cumplimiento DECIMAL(5,2),
    nivel_alcanzado VARCHAR(5),
    cumplimiento_por_principio JSONB,
    recomendaciones_priorizadas JSONB
);

-- ============================================
-- TABLA: reporte_tecnico
-- ============================================
CREATE TABLE reporte_tecnico (
    id_reporte INTEGER PRIMARY KEY REFERENCES reporte(id_reporte),
    total_problemas INTEGER,
    problemas_por_severidad JSONB,
    criterios_evaluados JSONB,
    lista_problemas JSONB
);

-- ============================================
-- DATOS INICIALES: CRITERIOS WCAG (Sprint 1)
-- ============================================
-- ============================================
-- DATOS INICIALES: CRITERIOS WCAG (Sprint 1)
-- ============================================
INSERT INTO criterio_wcag (codigo, nombre, descripcion, principio, nivel, aplica_web) VALUES
('1.1.1', 'Texto alternativo', 'Detectar imágenes sin alt o alt vacío', 'Perceptible', 'A', TRUE),
('1.4.3', 'Contraste de color', 'Calcular contraste texto/fondo, reportar incumplimiento AA', 'Perceptible', 'A', TRUE),
('1.3.1', 'Estructura semántica', 'Comprobar encabezados anidados, landmarks, listas', 'Perceptible', 'A', TRUE),
('1.2.2', 'Subtítulos en multimedia', 'Detectar presencia de pistas de subtítulos en videos', 'Perceptible', 'A', TRUE),
('2.1.1', 'Compatibilidad con teclado', 'Simular tabulación, detectar focos visibles y elementos no accesibles', 'Operable', 'A', TRUE);