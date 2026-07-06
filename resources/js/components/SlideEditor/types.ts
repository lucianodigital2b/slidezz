export const SLIDE_W = 1080;
export const PANEL_LEFT = 160;
export const PANEL_RIGHT = 300;

export const FORMATS = {
    post:    { w: 1080, h: 1350, ratio: '4:5' },
    stories: { w: 1080, h: 1920, ratio: '9:16' },
} as const;

export type Format = keyof typeof FORMATS;

export type Tool = 'select' | 'text' | 'rect' | 'circle' | 'image' | 'button';
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

export interface RichSpan {
    text: string;
    color?: string;        // undefined = inherit el.fill
    highlight?: string;    // background highlight color
    gradient?: string[];   // 2+ hex stops; renders the glyph fill as a left→right gradient
    bold?: boolean;        // render this span heavier than the element's base weight (min 700)
    weight?: number;       // explicit per-word font weight (300-900); overrides `bold`
}

export interface TextReadabilityStyle {
    fill: string;
    stroke?: string;
    strokeWidth: number;
    shadowColor?: string;
    shadowBlur: number;
    shadowOffsetX: number;
    shadowOffsetY: number;
    shadowOpacity: number;
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
    richText?: RichSpan[];
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
    cornerRadius?: number;
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
    overlayPreset?: string;  // OverlayPreset key — optional for backward compat
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

export type ButtonIconPosition = 'left' | 'right';

export interface ButtonEl extends BaseEl {
    type: 'button';
    text: string;
    // Typography
    fontSize: number;
    fontFamily: string;
    fontStyle: string;
    letterSpacing: number;
    // Text color
    fill: string;
    // Background
    bgColor: string;
    bgEnabled: boolean;
    bgOpacity: number;
    // Border
    stroke: string;
    strokeWidth: number;
    cornerRadius: number;
    borderStyle: BorderStyle;
    dashEnabled: boolean;
    // Padding
    paddingX: number;
    paddingY: number;
    // Alignment
    align: Align;
    // Icon / emoji suffix or prefix
    iconEnabled: boolean;
    icon: string;
    iconPosition: ButtonIconPosition;
}

export interface PathEl extends BaseEl {
    type: 'path';
    data: string;      // SVG path string
    dataW: number;     // natural viewBox width of path data
    dataH: number;     // natural viewBox height of path data
    fill: string;      // 'none' for stroke-only shapes
    stroke: string;
    strokeWidth: number;
    borderStyle: BorderStyle;
    dashEnabled: boolean;
}

export type SlideEl = TextEl | ShapeEl | ImageEl | GradientEl | PathEl | ButtonEl;

export type CornerIcon = 'none' | 'bookmark' | 'arrow' | 'heart';

export type CornerKey = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

export interface CornerConfig {
    text: string;
    enabled: boolean;
    color: string;
    fontFamily?: string;
    fontSize?: number;
    fontStyle?: string;
    letterSpacing?: number;
    /** Extra inset from the edge, pushing top corners down / bottom corners up. */
    offsetY?: number;
}

export interface SlideCorners {
    topLeft: CornerConfig;
    topRight: CornerConfig;
    bottomLeft: CornerConfig;
    bottomRight: CornerConfig;
    show: boolean;
    showDots: boolean;
    bottomRightIcon: CornerIcon;
}

export type BadgeStyle = 'glass' | 'solid' | 'minimal' | 'divider' | 'tweet';

export interface ProfileBadge {
    enabled: boolean;
    style: BadgeStyle;
    handle: string;
    name?: string;
    photoUrl: string;
    size: number;
    verified?: boolean;
    x?: number;
    y?: number;
}

export interface Slide {
    id: string;
    background: string;
    elements: SlideEl[];
    corners?: SlideCorners;
    profileBadge?: ProfileBadge;
}
