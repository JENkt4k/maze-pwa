export type VisualPaletteId = 'standard' | 'colorblind';

export const VISUAL_PALETTES: Record<VisualPaletteId, { name:string; build:string; solver:string }> = {
  standard: { name:'Standard', build:'#14b8a6', solver:'#2563eb' },
  colorblind: { name:'Color-blind safe', build:'#b35c00', solver:'#0072b2' },
};

export function loadVisualPalette(): VisualPaletteId {
  try { return localStorage.getItem('ui:palette:v1') === 'colorblind' ? 'colorblind' : 'standard'; }
  catch { return 'standard'; }
}
