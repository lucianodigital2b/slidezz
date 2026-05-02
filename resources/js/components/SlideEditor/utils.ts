import { Slide, ShadowProps, GradientEl, BorderStyle } from './types';

export function uid() { return Math.random().toString(36).slice(2, 10); }

export function makeSlide(background = '#ffffff'): Slide { return { id: uid(), background, elements: [] }; }

export const SHADOW_DEFAULTS: ShadowProps = {
    shadowEnabled: false,
    shadowColor: '#000000',
    shadowBlur: 10,
    shadowOffsetX: 4,
    shadowOffsetY: 4,
    shadowOpacity: 0.5,
};

export function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

export function gradientLinearProps(el: GradientEl) {
    const solid = hexToRgba(el.color, 1);
    const clear = hexToRgba(el.color, 0);
    switch (el.direction) {
        case 'bottom': return { start: { x: 0, y: 0 },       end: { x: 0, y: el.height }, stops: [0, clear, 1, solid] };
        case 'top':    return { start: { x: 0, y: 0 },       end: { x: 0, y: el.height }, stops: [0, solid, 1, clear] };
        case 'left':   return { start: { x: 0, y: 0 },       end: { x: el.width, y: 0 },  stops: [0, solid, 1, clear] };
        case 'right':  return { start: { x: el.width, y: 0 }, end: { x: 0, y: 0 },         stops: [0, solid, 1, clear] };
    }
}

export function borderStyleToDash(style: BorderStyle, width: number): number[] {
    if (style === 'dashed') return [width * 4, width * 2];
    if (style === 'dotted') return [width, width];
    return [];
}
