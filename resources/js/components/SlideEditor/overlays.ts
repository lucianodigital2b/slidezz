export type OverlayPreset =
    | 'none'
    | 'gradient'
    | 'gradient_strong'
    | 'vignette'
    | 'vignette_strong'
    | 'dark'
    | 'dark_strong'
    | 'base'
    | 'base_strong'
    | 'base_intense'
    | 'top'
    | 'top_strong'
    | 'top_intense'
    | 'frame'
    | 'frame_strong'
    | 'left'
    | 'right'
    | 'diag_bl'
    | 'diag_br'
    | 'diag_tl'
    | 'diag_tr';

export interface OverlayPresetOption {
    key: OverlayPreset;
    label: string;
}

export const OVERLAY_PRESETS: OverlayPresetOption[] = [
    { key: 'none',            label: 'Nenhum' },
    { key: 'gradient',        label: 'Gradiente' },
    { key: 'gradient_strong', label: 'Grad. forte' },
    { key: 'vignette',        label: 'Vinheta' },
    { key: 'vignette_strong', label: 'Vin. forte' },
    { key: 'dark',            label: 'Escuro' },
    { key: 'dark_strong',     label: 'Escuro forte' },
    { key: 'base',            label: 'Base' },
    { key: 'base_strong',     label: 'Base forte' },
    { key: 'base_intense',    label: 'Base intensa' },
    { key: 'top',             label: 'Topo' },
    { key: 'top_strong',      label: 'Topo forte' },
    { key: 'top_intense',     label: 'Topo intenso' },
    { key: 'frame',           label: 'Moldura' },
    { key: 'frame_strong',    label: 'Mold. forte' },
    { key: 'left',            label: 'Esquerda' },
    { key: 'right',           label: 'Direita' },
    { key: 'diag_bl',         label: 'Diag. inf.esq' },
    { key: 'diag_br',         label: 'Diag. inf.dir' },
    { key: 'diag_tl',         label: 'Diag. sup.esq' },
    { key: 'diag_tr',         label: 'Diag. sup.dir' },
];

export function getOverlayLabel(preset: OverlayPreset | undefined): string {
    return OVERLAY_PRESETS.find(p => p.key === (preset ?? 'none'))?.label ?? 'Nenhum';
}
