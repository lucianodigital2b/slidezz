export const SLIDE_W = 1080;
export const PANEL_LEFT = 160;
export const PANEL_RIGHT = 300;

export const FORMATS = {
    post:    { w: 1080, h: 1080, ratio: '1:1' },
    stories: { w: 1080, h: 1920, ratio: '9:16' },
} as const;

export type Format = keyof typeof FORMATS;

export type Tool = 'select' | 'text' | 'rect' | 'circle' | 'image';
export type Align = 'left' | 'center' | 'right' | 'justify';
export type VAlign = 'top' | 'middle' | 'bottom';
export type Wrap = 'word' | 'char' | 'none';
export type BorderStyle = 'solid' | 'dashed' | 'dotted';
export type AccentSide = 'left' | 'right' | 'top' | 'bottom';
export type GradientDirection = 'bottom' | 'top' | 'left' | 'right';

export interface ShadowProps {
    shadowEnabled: boolean;
    shadowColor: string;
    shadowBlur: number;
    shadowOffsetX: number;
    shadowOffsetY: number;
    shadowOpacity: number;
}

export interface BaseEl extends ShadowProps {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
}

export interface TextEl extends BaseEl {
    type: 'text';
    text: string;
    fontSize: number;
    fontFamily: string;
    fill: string;
    fontStyle: string;
    align: Align;
    verticalAlign: VAlign;
    lineHeight: number;
    letterSpacing: number;
    textDecoration: string;
    stroke: string;
    strokeWidth: number;
    padding: number;
    wrap: Wrap;
    accentEnabled: boolean;
    accentColor: string;
    accentThickness: number;
    accentSide: AccentSide;
    accentGap: number;
}

export interface ShapeEl extends BaseEl {
    type: 'rect' | 'circle';
    fill: string;
    stroke: string;
    strokeWidth: number;
    cornerRadius: number;
    borderStyle: BorderStyle;
    dashEnabled: boolean;
}

export type BgSize = 'cover' | 'contain' | 'fill';

export interface ImageEl extends BaseEl {
    type: 'image';
    src: string;
    brightness: number;
    contrast: number;
    blurRadius: number;
    grayscale: boolean;
    sepia: boolean;
    hue: number;
    saturation: number;
    luminance: number;
    pixelSize: number;
    noise: number;
    enhance: number;
    red: number;
    green: number;
    blue: number;
    // overlay
    overlayEnabled: boolean;
    overlayColor: string;
    overlayOpacity: number;
    // background
    isBackground: boolean;
    bgSize: BgSize;
    bgPositionX: number; // 0-100
    bgPositionY: number; // 0-100
}

export interface GradientEl extends BaseEl {
    type: 'gradient';
    color: string;
    direction: GradientDirection;
}

export type SlideEl = TextEl | ShapeEl | ImageEl | GradientEl;

export interface Slide {
    id: string;
    background: string;
    elements: SlideEl[];
}
