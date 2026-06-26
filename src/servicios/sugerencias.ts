/** Mapeo criterio / tipo → sugerencia para reporte técnico (RF7.1) */

export function sugerenciaPorTipo(
  tipo: string,
  criterio: string
): string {
  const key = `${tipo}|${criterio}`;
  const map: Record<string, string> = {
    'alt|1.1.1':
      'Añada un atributo alt descriptivo a la imagen o marque como decorativa con alt="" si no aporta información.',
    'structure|1.3.1':
      'Corrija la jerarquía de encabezados (sin saltos de nivel), añada un h1 único y use landmarks semánticos (main, nav, etc.).',
    'contrast|1.4.3':
      'Ajuste colores de texto y fondo para alcanzar la relación de contraste mínima WCAG del nivel objetivo.',
    'subtitles|1.2.2':
      'Incorpore pistas de subtítulos (p. ej. <track kind="captions">) o un reproductor con subtítulos activables.',
    'keyboard|2.1.1':
      'Asegure que todos los controles sean alcanzables con Tab, evite trampas de teclado y mantenga foco visible.',
  };
  return map[key] ?? 'Revise el criterio WCAG indicado y la documentación asociada.';
}
