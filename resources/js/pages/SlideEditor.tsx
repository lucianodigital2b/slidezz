import { Head, router, usePage } from '@inertiajs/react';
import CarouselGenerationController from '@/actions/App/Http/Controllers/CarouselGenerationController';
import SlideProjectController from '@/actions/App/Http/Controllers/SlideProjectController';
import Konva from 'konva';
import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    Bold,
    ChevronDown,
    ChevronRight,
    Circle,
    Download,
    Image as ImageIcon,
    Italic,
    Loader2,
    MousePointer,
    Plus,
    Save,
    Search,
    Sparkles,
    Square,
    Strikethrough,
    Trash2,
    Type,
    Underline,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GOOGLE_FONTS, loadGoogleFont } from '@/utils/google-fonts';
import {
    Circle as KonvaCircle,
    Group,
    Image as KonvaImage,
    Layer,
    Rect,
    Stage,
    Text,
    Transformer,
} from 'react-konva';

// ─── Constants ───────────────────────────────────────────────────────────────

const SLIDE_W = 1080;
const PANEL_LEFT = 160;
const PANEL_RIGHT = 300;

const FORMATS = {
    post:    { w: 1080, h: 1080, ratio: '1:1' },
    stories: { w: 1080, h: 1920, ratio: '9:16' },
} as const;

type Format = keyof typeof FORMATS;

// ─── Types ───────────────────────────────────────────────────────────────────

type Tool = 'select' | 'text' | 'rect' | 'circle' | 'image';
type Align = 'left' | 'center' | 'right' | 'justify';
type VAlign = 'top' | 'middle' | 'bottom';
type Wrap = 'word' | 'char' | 'none';
type BorderStyle = 'solid' | 'dashed' | 'dotted';
type AccentSide = 'left' | 'right' | 'top' | 'bottom';
type GradientDirection = 'bottom' | 'top' | 'left' | 'right';

interface ShadowProps {
    shadowEnabled: boolean;
    shadowColor: string;
    shadowBlur: number;
    shadowOffsetX: number;
    shadowOffsetY: number;
    shadowOpacity: number;
}

interface BaseEl extends ShadowProps {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
}

interface TextEl extends BaseEl {
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

interface ShapeEl extends BaseEl {
    type: 'rect' | 'circle';
    fill: string;
    stroke: string;
    strokeWidth: number;
    cornerRadius: number;
    borderStyle: BorderStyle;
    dashEnabled: boolean;
}

type BgSize = 'cover' | 'contain' | 'fill';

interface ImageEl extends BaseEl {
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

interface GradientEl extends BaseEl {
    type: 'gradient';
    color: string;
    direction: GradientDirection;
}

type SlideEl = TextEl | ShapeEl | ImageEl | GradientEl;

interface Slide {
    id: string;
    background: string;
    elements: SlideEl[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10); }
function makeSlide(background = '#ffffff'): Slide { return { id: uid(), background, elements: [] }; }

const SHADOW_DEFAULTS: ShadowProps = {
    shadowEnabled: false,
    shadowColor: '#000000',
    shadowBlur: 10,
    shadowOffsetX: 4,
    shadowOffsetY: 4,
    shadowOpacity: 0.5,
};

function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function gradientLinearProps(el: GradientEl) {
    const solid = hexToRgba(el.color, 1);
    const clear = hexToRgba(el.color, 0);
    switch (el.direction) {
        case 'bottom': return { start: { x: 0, y: 0 },       end: { x: 0, y: el.height }, stops: [0, clear, 1, solid] };
        case 'top':    return { start: { x: 0, y: 0 },       end: { x: 0, y: el.height }, stops: [0, solid, 1, clear] };
        case 'left':   return { start: { x: 0, y: 0 },       end: { x: el.width, y: 0 },  stops: [0, solid, 1, clear] };
        case 'right':  return { start: { x: el.width, y: 0 }, end: { x: 0, y: 0 },         stops: [0, solid, 1, clear] };
    }
}

function borderStyleToDash(style: BorderStyle, width: number): number[] {
    if (style === 'dashed') return [width * 4, width * 2];
    if (style === 'dotted') return [width, width];
    return [];
}

// ─── useLoadImage ─────────────────────────────────────────────────────────────

function useLoadImage(src: string): HTMLImageElement | null {
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    useEffect(() => {
        if (!src) return;
        const image = new window.Image();
        image.crossOrigin = 'Anonymous';
        image.src = src;
        image.onload = () => setImg(image);
    }, [src]);
    return img;
}

// ─── KonvaTextEl ──────────────────────────────────────────────────────────────

interface KonvaTextElProps {
    el: TextEl;
    hidden: boolean;
    draggable: boolean;
    onSelect: () => void;
    onDblClick: () => void;
    onChange: (patch: Partial<TextEl>) => void;
}

function KonvaTextEl({ el, hidden, draggable, onSelect, onDblClick, onChange }: KonvaTextElProps) {
    const textRef = useRef<Konva.Text>(null);
    const [textH, setTextH] = useState(80);

    // Read the live text height after every render so the accent bar tracks wrapping
    useEffect(() => {
        if (textRef.current) {
            const h = textRef.current.height();
            if (h !== textH) setTextH(h);
        }
    });

    const { t, gap } = { t: el.accentThickness, gap: el.accentGap };
    const accentProps = el.accentEnabled ? (() => {
        switch (el.accentSide) {
            case 'left':   return { x: -(t + gap), y: 0,             width: t,        height: textH };
            case 'right':  return { x: el.width + gap, y: 0,         width: t,        height: textH };
            case 'top':    return { x: 0, y: -(t + gap),             width: el.width, height: t     };
            case 'bottom': return { x: 0, y: textH + gap,            width: el.width, height: t     };
        }
    })() : null;

    return (
        <Group
            id={el.id}
            x={el.x} y={el.y} rotation={el.rotation} opacity={el.opacity}
            draggable={draggable}
            onClick={onSelect} onTap={onSelect}
            onDblClick={onDblClick}
            shadowEnabled={el.shadowEnabled} shadowColor={el.shadowColor}
            shadowBlur={el.shadowBlur} shadowOffsetX={el.shadowOffsetX}
            shadowOffsetY={el.shadowOffsetY} shadowOpacity={el.shadowOpacity}
            onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => onChange({ x: e.target.x(), y: e.target.y() })}
            onTransformEnd={(e: Konva.KonvaEventObject<Event>) => {
                const node = e.target;
                onChange({
                    x: node.x(), y: node.y(),
                    width: Math.max(20, el.width * node.scaleX()),
                    rotation: node.rotation(),
                });
                node.scaleX(1); node.scaleY(1);
            }}
        >
            {accentProps && (
                <Rect {...accentProps} fill={el.accentColor} listening={false} />
            )}
            <Text
                ref={textRef}
                x={0} y={0}
                width={el.width}
                text={hidden ? '' : el.text}
                fontSize={el.fontSize} fontFamily={el.fontFamily} fill={el.fill}
                fontStyle={el.fontStyle} align={el.align} verticalAlign={el.verticalAlign}
                lineHeight={el.lineHeight} letterSpacing={el.letterSpacing}
                textDecoration={el.textDecoration}
                stroke={el.strokeWidth > 0 ? el.stroke : undefined}
                strokeWidth={el.strokeWidth}
                padding={el.padding} wrap={el.wrap}
            />
        </Group>
    );
}

// ─── KonvaImageEl ─────────────────────────────────────────────────────────────

/** Compute Konva crop props to emulate CSS background-size: cover */
function coverCrop(
    imgW: number, imgH: number,
    canvasW: number, canvasH: number,
    posX: number, posY: number,
): { cropX: number; cropY: number; cropWidth: number; cropHeight: number } {
    const imgAspect = imgW / imgH;
    const canvasAspect = canvasW / canvasH;
    if (imgAspect > canvasAspect) {
        const cropH = imgH;
        const cropW = imgH * canvasAspect;
        return { cropX: (imgW - cropW) * (posX / 100), cropY: 0, cropWidth: cropW, cropHeight: cropH };
    }
    const cropW = imgW;
    const cropH = imgW / canvasAspect;
    return { cropX: 0, cropY: (imgH - cropH) * (posY / 100), cropWidth: cropW, cropHeight: cropH };
}

/** Compute Konva crop props to emulate CSS background-size: contain */
function containCrop(
    imgW: number, imgH: number,
    canvasW: number, canvasH: number,
): { cropX: number; cropY: number; cropWidth: number; cropHeight: number } {
    return { cropX: 0, cropY: 0, cropWidth: imgW, cropHeight: imgH };
}

interface KonvaImageElProps {
    el: ImageEl;
    slideW: number;
    slideH: number;
    draggable: boolean;
    onSelect: () => void;
    onChange: (patch: Partial<ImageEl>) => void;
}

function KonvaImageEl({ el, slideW, slideH, draggable, onSelect, onChange }: KonvaImageElProps) {
    const img = useLoadImage(el.src);
    const imgRef = useRef<Konva.Image>(null);

    // Dimensions for background mode
    const dispW = el.isBackground ? slideW : el.width;
    const dispH = el.isBackground ? slideH : el.height;
    const dispX = el.isBackground ? 0 : el.x;
    const dispY = el.isBackground ? 0 : el.y;

    // Crop for background-size modes
    const crop = img && el.isBackground
        ? el.bgSize === 'cover'
            ? coverCrop(img.naturalWidth, img.naturalHeight, slideW, slideH, el.bgPositionX, el.bgPositionY)
            : el.bgSize === 'contain'
                ? containCrop(img.naturalWidth, img.naturalHeight, slideW, slideH)
                : undefined
        : undefined;

    useEffect(() => {
        if (!imgRef.current || !img) return;
        const node = imgRef.current;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const n = node as any;
        const filters: unknown[] = [];
        if (el.brightness !== 0) filters.push(Konva.Filters.Brighten);
        if (el.contrast !== 0) filters.push(Konva.Filters.Contrast);
        if (el.blurRadius > 0) filters.push(Konva.Filters.Blur);
        if (el.grayscale) filters.push(Konva.Filters.Grayscale);
        if (el.sepia) filters.push(Konva.Filters.Sepia);
        if (el.hue !== 0 || el.saturation !== 0 || el.luminance !== 0) filters.push(Konva.Filters.HSL);
        if (el.pixelSize > 1) filters.push(Konva.Filters.Pixelate);
        if (el.noise > 0) filters.push(Konva.Filters.Noise);
        if (el.enhance !== 0) filters.push(Konva.Filters.Enhance);
        if (el.red !== 255 || el.green !== 255 || el.blue !== 255) filters.push(Konva.Filters.RGB);
        n.filters(filters);
        n.brightness(el.brightness);
        n.contrast(el.contrast);
        n.blurRadius(el.blurRadius);
        n.hue(el.hue);
        n.saturation(el.saturation);
        n.luminance(el.luminance);
        n.pixelSize(Math.max(1, el.pixelSize));
        n.noise(el.noise);
        n.enhance(el.enhance);
        n.red(el.red);
        n.green(el.green);
        n.blue(el.blue);
        if (filters.length > 0) {
            node.cache();
        } else {
            node.clearCache();
        }
    }, [
        img, el.brightness, el.contrast, el.blurRadius, el.grayscale, el.sepia,
        el.hue, el.saturation, el.luminance, el.pixelSize, el.noise, el.enhance,
        el.red, el.green, el.blue,
        el.isBackground, el.width, el.height,
    ]);

    if (!img) return null;

    return (
        <Group
            id={el.id}
            x={dispX} y={dispY}
            rotation={el.isBackground ? 0 : el.rotation}
            opacity={el.opacity}
            draggable={draggable && !el.isBackground}
            onClick={onSelect} onTap={onSelect}
            shadowEnabled={el.shadowEnabled} shadowColor={el.shadowColor}
            shadowBlur={el.shadowBlur} shadowOffsetX={el.shadowOffsetX}
            shadowOffsetY={el.shadowOffsetY} shadowOpacity={el.shadowOpacity}
            onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => onChange({ x: e.target.x(), y: e.target.y() })}
            onTransformEnd={(e: Konva.KonvaEventObject<Event>) => {
                const node = e.target;
                const newW = Math.max(20, dispW * node.scaleX());
                const newH = Math.max(20, dispH * node.scaleY());
                if (imgRef.current) {
                    imgRef.current.width(newW);
                    imgRef.current.height(newH);
                }
                node.scaleX(1); node.scaleY(1);
                onChange({ x: node.x(), y: node.y(), width: newW, height: newH, rotation: node.rotation() });
            }}
        >
            <KonvaImage
                ref={imgRef}
                image={img}
                width={dispW} height={dispH}
                {...(crop ? { cropX: crop.cropX, cropY: crop.cropY, cropWidth: crop.cropWidth, cropHeight: crop.cropHeight } : {})}
            />
            {el.overlayEnabled && (
                <Rect
                    x={0} y={0} width={dispW} height={dispH}
                    fill={el.overlayColor}
                    opacity={el.overlayOpacity}
                    listening={false}
                />
            )}
        </Group>
    );
}

// ─── Primitive controls ───────────────────────────────────────────────────────

/** Elementor-style: slider + inline editable number input */
function SliderField({
    value, onChange, min, max, step = 1, unit = '',
}: {
    value: number; onChange: (v: number) => void;
    min: number; max: number; step?: number; unit?: string;
}) {
    return (
        <div className="flex items-center gap-2">
            <input
                type="range" value={value} min={min} max={max} step={step}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="flex-1 h-1 rounded-full appearance-none cursor-pointer accent-[#E8440A] bg-gray-200"
            />
            <div className="flex items-center gap-0.5 shrink-0">
                <input
                    type="number" value={value} min={min} max={max} step={step}
                    onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
                    }}
                    className="w-12 text-center text-[11px] border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#E8440A]"
                />
                {unit && <span className="text-[10px] text-gray-400">{unit}</span>}
            </div>
        </div>
    );
}

/** Color swatch + hex input */
function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex items-center gap-2">
            <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
                className="w-7 h-7 cursor-pointer rounded border border-gray-200 shrink-0 p-0.5" />
            <input
                type="text" value={value}
                onChange={(e) => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) onChange(e.target.value); }}
                className="flex-1 text-[11px] border border-gray-200 rounded px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-[#E8440A]"
                maxLength={7}
            />
        </div>
    );
}

/** Toggle switch */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors ${checked ? 'bg-[#E8440A]' : 'bg-gray-300'}`}
        >
            <span className={`inline-block h-3 w-3 mt-0.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
        </button>
    );
}

/** Collapsible section */
function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
            >
                {title}
                {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
            {open && <div className="flex flex-col gap-3 pb-3">{children}</div>}
        </div>
    );
}

/** Label row */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</label>
            {children}
        </div>
    );
}

/** Label + toggle on same row */
function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</span>
            <Toggle checked={checked} onChange={onChange} />
        </div>
    );
}

// ─── FontPicker ───────────────────────────────────────────────────────────────

const VISIBLE_LIMIT = 80;

function FontPicker({ value, onChange }: { value: string; onChange: (family: string) => void }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const filtered = query.trim()
        ? GOOGLE_FONTS.filter((f) => f.toLowerCase().includes(query.toLowerCase()))
        : GOOGLE_FONTS;
    const visible = filtered.slice(0, VISIBLE_LIMIT);

    useEffect(() => {
        if (!open) return;
        visible.forEach((family) => {
            if (!loadedFonts.has(family)) {
                loadGoogleFont(family).then(() => setLoadedFonts((prev) => new Set(prev).add(family)));
            }
        });
    }, [open, query]);

    useEffect(() => { loadGoogleFont(value); }, [value]);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    useEffect(() => { if (open) setTimeout(() => searchRef.current?.focus(), 50); }, [open]);

    function select(family: string) {
        loadGoogleFont(family).then(() => onChange(family));
        setOpen(false);
        setQuery('');
    }

    return (
        <div ref={containerRef} className="relative w-full">
            <button
                type="button" onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between rounded border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#E8440A] hover:border-gray-300 bg-white"
                style={{ fontFamily: value }}
            >
                <span className="truncate">{value}</span>
                <ChevronDown className="w-3 h-3 text-gray-400 shrink-0 ml-1" />
            </button>

            {open && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden flex flex-col" style={{ maxHeight: 260 }}>
                    <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-gray-100">
                        <Search className="w-3 h-3 text-gray-400 shrink-0" />
                        <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)}
                            placeholder={t('slideEditor.searchFont')} className="flex-1 text-xs focus:outline-none" />
                        {query && <button onClick={() => setQuery('')} className="text-gray-400 hover:text-gray-600"><X className="w-3 h-3" /></button>}
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {visible.map((family) => (
                            <button key={family} type="button" onClick={() => select(family)}
                                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors ${family === value ? 'bg-[#E8440A]/5 text-[#E8440A]' : 'text-gray-700'}`}
                                style={{ fontFamily: loadedFonts.has(family) ? family : 'inherit' }}>
                                {family}
                            </button>
                        ))}
                        {filtered.length > VISIBLE_LIMIT && (
                            <p className="px-3 py-2 text-[10px] text-gray-400 text-center border-t border-gray-100">
                                {t('slideEditor.moreFonts', { count: filtered.length - VISIBLE_LIMIT })}
                            </p>
                        )}
                        {filtered.length === 0 && <p className="px-3 py-4 text-xs text-gray-400 text-center">{t('slideEditor.noFonts')}</p>}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── PositionGrid (Elementor 3×3 focal-point picker) ─────────────────────────

const POSITIONS = [
    { x: 0,   y: 0,   label: '↖' }, { x: 50,  y: 0,   label: '↑' }, { x: 100, y: 0,   label: '↗' },
    { x: 0,   y: 50,  label: '←' }, { x: 50,  y: 50,  label: '●' }, { x: 100, y: 50,  label: '→' },
    { x: 0,   y: 100, label: '↙' }, { x: 50,  y: 100, label: '↓' }, { x: 100, y: 100, label: '↘' },
];

function PositionGrid({ x, y, onChange }: { x: number; y: number; onChange: (x: number, y: number) => void }) {
    return (
        <div className="grid grid-cols-3 gap-1">
            {POSITIONS.map((p) => {
                const active = p.x === x && p.y === y;
                return (
                    <button key={`${p.x}-${p.y}`} type="button" onClick={() => onChange(p.x, p.y)}
                        className={`h-8 rounded border text-sm font-medium transition-colors ${active ? 'bg-[#E8440A] text-white border-[#E8440A]' : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'}`}>
                        {p.label}
                    </button>
                );
            })}
        </div>
    );
}

// ─── ShadowSection ────────────────────────────────────────────────────────────

function ShadowSection({ el, onChange }: { el: BaseEl; onChange: (p: Partial<BaseEl>) => void }) {
    const { t } = useTranslation();
    return (
        <Section title={t('slideEditor.sections.shadow')} defaultOpen={false}>
            <ToggleField label={t('slideEditor.fields.enableShadow')} checked={el.shadowEnabled} onChange={(v) => onChange({ shadowEnabled: v })} />
            {el.shadowEnabled && (
                <>
                    <Field label={t('slideEditor.fields.color')}><ColorField value={el.shadowColor} onChange={(v) => onChange({ shadowColor: v })} /></Field>
                    <Field label={t('slideEditor.fields.shadowBlur')}><SliderField value={el.shadowBlur} onChange={(v) => onChange({ shadowBlur: v })} min={0} max={100} /></Field>
                    <Field label={t('slideEditor.fields.shadowOffsetX')}><SliderField value={el.shadowOffsetX} onChange={(v) => onChange({ shadowOffsetX: v })} min={-100} max={100} /></Field>
                    <Field label={t('slideEditor.fields.shadowOffsetY')}><SliderField value={el.shadowOffsetY} onChange={(v) => onChange({ shadowOffsetY: v })} min={-100} max={100} /></Field>
                    <Field label={t('slideEditor.fields.opacity')}><SliderField value={el.shadowOpacity} onChange={(v) => onChange({ shadowOpacity: v })} min={0} max={1} step={0.01} /></Field>
                </>
            )}
        </Section>
    );
}

// ─── PropertiesPanel ──────────────────────────────────────────────────────────

interface PropertiesPanelProps {
    el: SlideEl | null;
    onChange: (patch: Partial<SlideEl>) => void;
    onDelete: () => void;
}

function PropertiesPanel({ el, onChange, onDelete }: PropertiesPanelProps) {
    const { t } = useTranslation();

    if (!el) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-xs text-gray-400 gap-2 px-4 text-center">
                <MousePointer className="w-5 h-5 text-gray-300" />
                {t('slideEditor.properties.empty')}
            </div>
        );
    }

    const ch = <T,>(patch: Partial<T>) => onChange(patch as Partial<SlideEl>);

    const iconBtn = (active: boolean, onClick: () => void, icon: React.ReactNode, title: string) => (
        <button type="button" title={title} onClick={onClick}
            className={`p-1.5 rounded border transition-colors ${active ? 'bg-[#E8440A] text-white border-[#E8440A]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
            {icon}
        </button>
    );

    return (
        <div className="flex flex-col overflow-y-auto h-full divide-y divide-gray-100">
            <div className="px-4 py-1 flex flex-col">

                {/* ── Transform ─────────────────────────────────────────────── */}
                <Section title={t('slideEditor.sections.transform')}>
                    <div className="grid grid-cols-2 gap-2">
                        {(['x', 'y', 'width', 'height'] as const).map((k) => (
                            <Field key={k} label={t(`slideEditor.fields.${k}`)}>
                                <input type="number" value={Math.round(el[k])}
                                    onChange={(e) => onChange({ [k]: parseFloat(e.target.value) || 0 } as Partial<SlideEl>)}
                                    className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#E8440A]" />
                            </Field>
                        ))}
                    </div>
                    <Field label={t('slideEditor.fields.rotation')}>
                        <SliderField value={Math.round(el.rotation)} onChange={(v) => onChange({ rotation: v } as Partial<SlideEl>)} min={-180} max={180} unit="°" />
                    </Field>
                    <Field label={t('slideEditor.fields.opacity')}>
                        <SliderField value={el.opacity} onChange={(v) => onChange({ opacity: v } as Partial<SlideEl>)} min={0} max={1} step={0.01} unit="%" />
                    </Field>
                </Section>

                {/* ── Text ──────────────────────────────────────────────────── */}
                {el.type === 'text' && (
                    <>
                        <Section title={t('slideEditor.sections.text')}>
                            <Field label={t('slideEditor.fields.content')}>
                                <textarea value={el.text} rows={3}
                                    onChange={(e) => ch<TextEl>({ text: e.target.value })}
                                    className="w-full rounded border border-gray-200 px-2 py-1 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[#E8440A]" />
                            </Field>
                            <Field label={t('slideEditor.fields.textColor')}><ColorField value={el.fill} onChange={(v) => ch<TextEl>({ fill: v })} /></Field>
                        </Section>

                        <Section title={t('slideEditor.sections.typography')}>
                            <Field label={t('slideEditor.fields.font')}><FontPicker value={el.fontFamily} onChange={(v) => ch<TextEl>({ fontFamily: v })} /></Field>
                            <Field label={t('slideEditor.fields.size')}>
                                <SliderField value={el.fontSize} onChange={(v) => ch<TextEl>({ fontSize: v })} min={8} max={300} unit="px" />
                            </Field>
                            <div className="flex gap-1.5 flex-wrap">
                                {iconBtn(el.fontStyle.includes('bold'), () => ch<TextEl>({ fontStyle: el.fontStyle.includes('bold') ? el.fontStyle.replace('bold', '').trim() : `${el.fontStyle} bold`.trim() }), <Bold className="w-3.5 h-3.5" />, t('slideEditor.fields.bold'))}
                                {iconBtn(el.fontStyle.includes('italic'), () => ch<TextEl>({ fontStyle: el.fontStyle.includes('italic') ? el.fontStyle.replace('italic', '').trim() : `${el.fontStyle} italic`.trim() }), <Italic className="w-3.5 h-3.5" />, t('slideEditor.fields.italic'))}
                                {iconBtn(el.textDecoration.includes('underline'), () => ch<TextEl>({ textDecoration: el.textDecoration.includes('underline') ? el.textDecoration.replace('underline', '').trim() : `${el.textDecoration} underline`.trim() }), <Underline className="w-3.5 h-3.5" />, t('slideEditor.fields.underline'))}
                                {iconBtn(el.textDecoration.includes('line-through'), () => ch<TextEl>({ textDecoration: el.textDecoration.includes('line-through') ? el.textDecoration.replace('line-through', '').trim() : `${el.textDecoration} line-through`.trim() }), <Strikethrough className="w-3.5 h-3.5" />, t('slideEditor.fields.strikethrough'))}
                            </div>
                            <Field label={t('slideEditor.fields.alignH')}>
                                <div className="flex gap-1">
                                    {(['left', 'center', 'right', 'justify'] as Align[]).map((a) => {
                                        const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : a === 'right' ? AlignRight : AlignLeft;
                                        return iconBtn(el.align === a, () => ch<TextEl>({ align: a }), <Icon className="w-3.5 h-3.5" />, a);
                                    })}
                                </div>
                            </Field>
                            <Field label={t('slideEditor.fields.alignV')}>
                                <div className="flex gap-1">
                                    {(['top', 'middle', 'bottom'] as VAlign[]).map((v) => iconBtn(el.verticalAlign === v, () => ch<TextEl>({ verticalAlign: v }), <span className="text-[10px] font-bold uppercase">{v[0]}</span>, v))}
                                </div>
                            </Field>
                            <Field label={t('slideEditor.fields.lineHeight')}>
                                <SliderField value={el.lineHeight} onChange={(v) => ch<TextEl>({ lineHeight: v })} min={0.5} max={4} step={0.1} />
                            </Field>
                            <Field label={t('slideEditor.fields.letterSpacing')}>
                                <SliderField value={el.letterSpacing} onChange={(v) => ch<TextEl>({ letterSpacing: v })} min={-10} max={100} step={0.5} unit="px" />
                            </Field>
                            <Field label={t('slideEditor.fields.padding')}>
                                <SliderField value={el.padding} onChange={(v) => ch<TextEl>({ padding: v })} min={0} max={100} />
                            </Field>
                            <Field label={t('slideEditor.fields.lineBreak')}>
                                <select value={el.wrap} onChange={(e) => ch<TextEl>({ wrap: e.target.value as Wrap })}
                                    className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#E8440A]">
                                    <option value="word">{t('slideEditor.fields.lineBreakWord')}</option>
                                    <option value="char">{t('slideEditor.fields.lineBreakChar')}</option>
                                    <option value="none">{t('slideEditor.fields.lineBreakNone')}</option>
                                </select>
                            </Field>
                        </Section>

                        <Section title={t('slideEditor.sections.textStroke')} defaultOpen={false}>
                            <Field label={t('slideEditor.fields.color')}><ColorField value={el.stroke} onChange={(v) => ch<TextEl>({ stroke: v })} /></Field>
                            <Field label={t('slideEditor.fields.thickness')}>
                                <SliderField value={el.strokeWidth} onChange={(v) => ch<TextEl>({ strokeWidth: v })} min={0} max={20} step={0.5} unit="px" />
                            </Field>
                        </Section>

                        <Section title={t('slideEditor.sections.accentBorder')} defaultOpen={false}>
                            <ToggleField label={t('slideEditor.fields.enableBorder')} checked={el.accentEnabled} onChange={(v) => ch<TextEl>({ accentEnabled: v })} />
                            {el.accentEnabled && (
                                <>
                                    <Field label={t('slideEditor.fields.position')}>
                                        <div className="grid grid-cols-4 gap-1">
                                            {(['left', 'right', 'top', 'bottom'] as AccentSide[]).map((side) => (
                                                <button key={side} type="button"
                                                    onClick={() => ch<TextEl>({ accentSide: side })}
                                                    className={`py-1.5 rounded border text-[10px] font-medium transition-colors ${el.accentSide === side ? 'bg-[#E8440A] text-white border-[#E8440A]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                                    {t(`slideEditor.accentSides.${side}`)}
                                                </button>
                                            ))}
                                        </div>
                                    </Field>
                                    <Field label={t('slideEditor.fields.color')}><ColorField value={el.accentColor} onChange={(v) => ch<TextEl>({ accentColor: v })} /></Field>
                                    <Field label={t('slideEditor.fields.thickness')}>
                                        <SliderField value={el.accentThickness} onChange={(v) => ch<TextEl>({ accentThickness: v })} min={1} max={60} unit="px" />
                                    </Field>
                                    <Field label={t('slideEditor.fields.spacing')}>
                                        <SliderField value={el.accentGap} onChange={(v) => ch<TextEl>({ accentGap: v })} min={0} max={60} unit="px" />
                                    </Field>
                                </>
                            )}
                        </Section>
                    </>
                )}

                {/* ── Shape ─────────────────────────────────────────────────── */}
                {(el.type === 'rect' || el.type === 'circle') && (
                    <>
                        <Section title={t('slideEditor.sections.fill')}>
                            <Field label={t('slideEditor.fields.color')}><ColorField value={el.fill} onChange={(v) => ch<ShapeEl>({ fill: v })} /></Field>
                        </Section>

                        <Section title={t('slideEditor.sections.border')}>
                            <Field label={t('slideEditor.fields.color')}><ColorField value={el.stroke} onChange={(v) => ch<ShapeEl>({ stroke: v })} /></Field>
                            <Field label={t('slideEditor.fields.thickness')}>
                                <SliderField value={el.strokeWidth} onChange={(v) => ch<ShapeEl>({ strokeWidth: v })} min={0} max={60} />
                            </Field>
                            <Field label={t('slideEditor.fields.borderStyle')}>
                                <div className="flex gap-1">
                                    {(['solid', 'dashed', 'dotted'] as BorderStyle[]).map((s) =>
                                        iconBtn(el.borderStyle === s, () => ch<ShapeEl>({ borderStyle: s, dashEnabled: s !== 'solid' }),
                                            <span className="text-[9px] font-bold uppercase">{s[0]}</span>, s)
                                    )}
                                </div>
                            </Field>
                            {el.type === 'rect' && (
                                <Field label={t('slideEditor.fields.cornerRadius')}>
                                    <SliderField value={el.cornerRadius} onChange={(v) => ch<ShapeEl>({ cornerRadius: v })} min={0} max={500} />
                                </Field>
                            )}
                        </Section>
                    </>
                )}

                {/* ── Image ─────────────────────────────────────────────────── */}
                {el.type === 'image' && (
                    <>
                        {/* Background */}
                        <Section title={t('slideEditor.sections.slideBackground')}>
                            <ToggleField
                                label={t('slideEditor.fields.useAsBackground')}
                                checked={el.isBackground}
                                onChange={(v) => ch<ImageEl>({ isBackground: v, ...(v ? { x: 0, y: 0 } : {}) })}
                            />
                            {el.isBackground && (
                                <>
                                    <Field label={t('slideEditor.fields.bgSize')}>
                                        <div className="flex gap-1">
                                            {(['cover', 'contain', 'fill'] as BgSize[]).map((s) => (
                                                <button key={s} type="button"
                                                    onClick={() => ch<ImageEl>({ bgSize: s })}
                                                    className={`flex-1 py-1 rounded border text-[10px] font-medium uppercase tracking-wide transition-colors ${el.bgSize === s ? 'bg-[#E8440A] text-white border-[#E8440A]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                                    {t(`slideEditor.fields.bg${s.charAt(0).toUpperCase() + s.slice(1)}` as never)}
                                                </button>
                                            ))}
                                        </div>
                                    </Field>
                                    {el.bgSize !== 'fill' && (
                                        <Field label={t('slideEditor.fields.focalPoint')}>
                                            <PositionGrid
                                                x={el.bgPositionX} y={el.bgPositionY}
                                                onChange={(x, y) => ch<ImageEl>({ bgPositionX: x, bgPositionY: y })}
                                            />
                                        </Field>
                                    )}
                                    {el.bgSize === 'fill' && (
                                        <>
                                            <Field label={t('slideEditor.fields.positionX')}>
                                                <SliderField value={el.bgPositionX} onChange={(v) => ch<ImageEl>({ bgPositionX: v })} min={0} max={100} unit="%" />
                                            </Field>
                                            <Field label={t('slideEditor.fields.positionY')}>
                                                <SliderField value={el.bgPositionY} onChange={(v) => ch<ImageEl>({ bgPositionY: v })} min={0} max={100} unit="%" />
                                            </Field>
                                        </>
                                    )}
                                </>
                            )}
                        </Section>

                        {/* Overlay */}
                        <Section title={t('slideEditor.sections.colorOverlay')}>
                            <ToggleField label={t('slideEditor.fields.enableOverlay')} checked={el.overlayEnabled} onChange={(v) => ch<ImageEl>({ overlayEnabled: v })} />
                            {el.overlayEnabled && (
                                <>
                                    <Field label={t('slideEditor.fields.color')}><ColorField value={el.overlayColor} onChange={(v) => ch<ImageEl>({ overlayColor: v })} /></Field>
                                    <Field label={t('slideEditor.fields.opacity')}>
                                        <SliderField value={el.overlayOpacity} onChange={(v) => ch<ImageEl>({ overlayOpacity: v })} min={0} max={1} step={0.01} />
                                    </Field>
                                </>
                            )}
                        </Section>

                        <Section title={t('slideEditor.sections.toneColor')}>
                            <Field label={t('slideEditor.fields.brightness')}>
                                <SliderField value={el.brightness} onChange={(v) => ch<ImageEl>({ brightness: v })} min={-1} max={1} step={0.01} />
                            </Field>
                            <Field label={t('slideEditor.fields.contrast')}>
                                <SliderField value={el.contrast} onChange={(v) => ch<ImageEl>({ contrast: v })} min={-100} max={100} />
                            </Field>
                            <Field label={t('slideEditor.fields.saturation')}>
                                <SliderField value={el.saturation} onChange={(v) => ch<ImageEl>({ saturation: v })} min={-2} max={2} step={0.01} />
                            </Field>
                            <Field label={t('slideEditor.fields.hue')}>
                                <SliderField value={el.hue} onChange={(v) => ch<ImageEl>({ hue: v })} min={0} max={359} unit="°" />
                            </Field>
                            <Field label={t('slideEditor.fields.luminance')}>
                                <SliderField value={el.luminance} onChange={(v) => ch<ImageEl>({ luminance: v })} min={-1} max={1} step={0.01} />
                            </Field>
                        </Section>

                        <Section title={t('slideEditor.sections.effects')} defaultOpen={false}>
                            <Field label={t('slideEditor.fields.blur')}>
                                <SliderField value={el.blurRadius} onChange={(v) => ch<ImageEl>({ blurRadius: v })} min={0} max={40} />
                            </Field>
                            <Field label={t('slideEditor.fields.enhance')}>
                                <SliderField value={el.enhance} onChange={(v) => ch<ImageEl>({ enhance: v })} min={-1} max={1} step={0.01} />
                            </Field>
                            <Field label={t('slideEditor.fields.noise')}>
                                <SliderField value={el.noise} onChange={(v) => ch<ImageEl>({ noise: v })} min={0} max={1} step={0.01} />
                            </Field>
                            <Field label={t('slideEditor.fields.pixelate')}>
                                <SliderField value={el.pixelSize} onChange={(v) => ch<ImageEl>({ pixelSize: v })} min={1} max={50} />
                            </Field>
                            <ToggleField label={t('slideEditor.fields.grayscale')} checked={el.grayscale} onChange={(v) => ch<ImageEl>({ grayscale: v })} />
                            <ToggleField label={t('slideEditor.fields.sepia')} checked={el.sepia} onChange={(v) => ch<ImageEl>({ sepia: v })} />
                        </Section>

                        <Section title={t('slideEditor.sections.rgbChannels')} defaultOpen={false}>
                            <Field label={t('slideEditor.fields.red')}>
                                <SliderField value={el.red} onChange={(v) => ch<ImageEl>({ red: v })} min={0} max={255} />
                            </Field>
                            <Field label={t('slideEditor.fields.green')}>
                                <SliderField value={el.green} onChange={(v) => ch<ImageEl>({ green: v })} min={0} max={255} />
                            </Field>
                            <Field label={t('slideEditor.fields.blue')}>
                                <SliderField value={el.blue} onChange={(v) => ch<ImageEl>({ blue: v })} min={0} max={255} />
                            </Field>
                        </Section>
                    </>
                )}

                {/* ── Gradient ──────────────────────────────────────────────── */}
                {el.type === 'gradient' && (
                    <Section title={t('slideEditor.sections.gradient')}>
                        <Field label={t('slideEditor.fields.color')}>
                            <ColorField value={el.color} onChange={(v) => ch<GradientEl>({ color: v })} />
                        </Field>
                        <Field label={t('slideEditor.fields.gradientDirection')}>
                            <div className="grid grid-cols-4 gap-1">
                                {(['bottom', 'top', 'left', 'right'] as GradientDirection[]).map((dir) => (
                                    <button key={dir} type="button"
                                        onClick={() => ch<GradientEl>({ direction: dir })}
                                        className={`py-1.5 rounded border text-[10px] font-medium transition-colors ${el.direction === dir ? 'bg-[#E8440A] text-white border-[#E8440A]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                        {t(`slideEditor.gradientDirections.${dir}`)}
                                    </button>
                                ))}
                            </div>
                        </Field>
                    </Section>
                )}

                {/* ── Shadow (all types) ────────────────────────────────────── */}
                <ShadowSection el={el} onChange={(p) => onChange(p as Partial<SlideEl>)} />

            </div>

            {/* ── Delete ────────────────────────────────────────────────────── */}
            <div className="px-4 py-3 shrink-0">
                <button onClick={onDelete}
                    className="flex items-center gap-2 text-red-500 hover:text-red-600 text-xs font-medium transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                    {t('slideEditor.deleteElement')}
                </button>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface SlideProjectProp {
    id: number;
    title: string;
    format: Format;
    slides: Slide[];
}

interface WizardConfig {
    topic: string;
    style: string;
}

const STORAGE_KEY = 'slidezz_editor_v1';

function loadSavedState(): { slides: Slide[]; currentIdx: number; format: Format } | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export default function SlideEditor() {
    const { slideProject, wizardConfig } = usePage<{ slideProject: SlideProjectProp | null; wizardConfig?: WizardConfig | null }>().props;

    const saved = slideProject ?? loadSavedState();
    const [slides, setSlides] = useState<Slide[]>(saved?.slides ?? [makeSlide()]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [tool, setTool] = useState<Tool>('select');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [format, setFormat] = useState<Format>(saved?.format ?? 'post');
    const { t } = useTranslation();
    const [title, setTitle] = useState(slideProject?.title ?? t('slideEditor.toolbar.untitled'));
    const [projectId, setProjectId] = useState<number | null>(slideProject?.id ?? null);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

    // ── AI carousel generation ──────────────────────────────────────────────
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiTopic, setAiTopic] = useState('');
    const [aiStyle, setAiStyle] = useState('');
    const [aiSlideCount, setAiSlideCount] = useState(5);
    const [aiStatus, setAiStatus] = useState<'idle' | 'generating' | 'imaging' | 'done' | 'error'>('idle');
    const [aiProgress, setAiProgress] = useState<string[]>([]);
    const [aiError, setAiError] = useState('');
    const esRef = useRef<EventSource | null>(null);

    const stageRef = useRef<Konva.Stage>(null);
    const trRef = useRef<Konva.Transformer>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [displayW, setDisplayW] = useState(600);
    const [displayH, setDisplayH] = useState(600);

    const slide = slides[currentIdx];
    const slideH = FORMATS[format].h;
    const scale = displayW / SLIDE_W;

    useEffect(() => {
        const recalc = () => {
            if (!containerRef.current) return;
            const { width, height } = containerRef.current.getBoundingClientRect();
            const pad = 64;
            const fmt = FORMATS[format];
            const scaleByW = (width - pad) / fmt.w;
            const scaleByH = (height - pad) / fmt.h;
            const s = Math.min(scaleByW, scaleByH, 720 / Math.max(fmt.w, fmt.h));
            setDisplayW(Math.max(200, Math.round(fmt.w * s)));
            setDisplayH(Math.max(200, Math.round(fmt.h * s)));
        };
        const obs = new ResizeObserver(recalc);
        if (containerRef.current) obs.observe(containerRef.current);
        recalc();
        return () => obs.disconnect();
    }, [format]);

    useEffect(() => {
        if (!trRef.current || !stageRef.current) return;
        if (!selectedId) { trRef.current.nodes([]); trRef.current.getLayer()?.batchDraw(); return; }
        const node = stageRef.current.findOne(`#${selectedId}`);
        if (node) { trRef.current.nodes([node]); trRef.current.getLayer()?.batchDraw(); }
    }, [selectedId, slide.elements]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (editingId) return;
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
                updateSlide({ elements: slide.elements.filter((el) => el.id !== selectedId) });
                setSelectedId(null);
            }
            if (e.key === 'Escape') { setSelectedId(null); setEditingId(null); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [selectedId, editingId, slide]);

    // ─── Save ───────────────────────────────────────────────────────────────

    async function saveProject() {
        setSaveStatus('saving');
        const body = { title, format, slides };
        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
        try {
            if (projectId) {
                await fetch(SlideProjectController.update(projectId).url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                    body: JSON.stringify(body),
                });
            } else {
                const res = await fetch(SlideProjectController.store().url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                    body: JSON.stringify(body),
                });
                const data = await res.json();
                setProjectId(data.id);
                router.visit(SlideProjectController.edit(data.id).url, { replace: true, preserveState: true });
            }
            setSaveStatus('saved');
        } catch {
            setSaveStatus('error');
        }
    }

    // ─── Auto-save ──────────────────────────────────────────────────────────

    useEffect(() => {
        setSaveStatus('saving');
        const timer = setTimeout(() => { saveProject(); }, 1500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slides, format, title]);

    // ─── Auto-open AI modal when coming from wizard ──────────────────────────

    useEffect(() => {
        if (!wizardConfig) return;
        setAiTopic(wizardConfig.topic);
        setAiStyle(wizardConfig.style);
        setAiModalOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── AI Carousel Generation ─────────────────────────────────────────────

    function openAiModal() {
        setAiModalOpen(true);
        setAiStatus('idle');
        setAiProgress([]);
        setAiError('');
    }

    function closeAiModal() {
        esRef.current?.close();
        esRef.current = null;
        setAiModalOpen(false);
        setAiStatus('idle');
    }

    interface SlideData {
        title: string;
        subtitle: string;
        description: string;
        imagePrompt: string;
    }

    function buildSlideFromData(data: SlideData, bgBase64: string | null): Slide {
        const slideH = FORMATS[format].h;
        const titleEl: TextEl = {
            id: uid(), type: 'text', x: 80, y: slideH * 0.3,
            width: SLIDE_W - 160, height: 200, rotation: 0, opacity: 1,
            text: data.title, fontSize: 80, fontFamily: 'Poppins', fill: '#ffffff',
            fontStyle: 'bold', align: 'center', verticalAlign: 'top',
            lineHeight: 1.15, letterSpacing: -1, textDecoration: '', stroke: '#000000',
            strokeWidth: 0, padding: 0, wrap: 'word',
            accentEnabled: false, accentColor: '#E8440A', accentThickness: 6, accentSide: 'left', accentGap: 12,
            ...SHADOW_DEFAULTS, shadowEnabled: true, shadowBlur: 20, shadowOpacity: 0.6,
        };
        const subtitleEl: TextEl = {
            id: uid(), type: 'text', x: 80, y: slideH * 0.3 + 220,
            width: SLIDE_W - 160, height: 120, rotation: 0, opacity: 1,
            text: data.subtitle, fontSize: 44, fontFamily: 'Poppins', fill: '#f0f0f0',
            fontStyle: '', align: 'center', verticalAlign: 'top',
            lineHeight: 1.3, letterSpacing: 0, textDecoration: '', stroke: '#000000',
            strokeWidth: 0, padding: 0, wrap: 'word',
            accentEnabled: false, accentColor: '#E8440A', accentThickness: 6, accentSide: 'left', accentGap: 12,
            ...SHADOW_DEFAULTS, shadowEnabled: true, shadowBlur: 12, shadowOpacity: 0.5,
        };
        const descEl: TextEl = {
            id: uid(), type: 'text', x: 100, y: slideH * 0.3 + 380,
            width: SLIDE_W - 200, height: 180, rotation: 0, opacity: 1,
            text: data.description, fontSize: 32, fontFamily: 'Poppins', fill: '#e0e0e0',
            fontStyle: '', align: 'center', verticalAlign: 'top',
            lineHeight: 1.5, letterSpacing: 0, textDecoration: '', stroke: '#000000',
            strokeWidth: 0, padding: 0, wrap: 'word',
            accentEnabled: false, accentColor: '#E8440A', accentThickness: 6, accentSide: 'left', accentGap: 12,
            ...SHADOW_DEFAULTS,
        };

        const elements: SlideEl[] = [titleEl, subtitleEl, descEl];

        if (bgBase64) {
            const bgEl: ImageEl = {
                id: uid(), type: 'image', src: bgBase64,
                x: 0, y: 0, width: SLIDE_W, height: slideH,
                rotation: 0, opacity: 1,
                brightness: -20, contrast: 10, blurRadius: 0, grayscale: false, sepia: false,
                hue: 0, saturation: 0, luminance: 0, pixelSize: 1, noise: 0, enhance: 0,
                red: 255, green: 255, blue: 255,
                overlayEnabled: true, overlayColor: '#000000', overlayOpacity: 0.45,
                isBackground: true, bgSize: 'cover', bgPositionX: 50, bgPositionY: 50,
                ...SHADOW_DEFAULTS,
            };
            elements.unshift(bgEl);
        }

        return { id: uid(), background: '#1a1a2e', elements };
    }

    async function generateCarousel() {
        if (!aiTopic.trim()) return;
        setAiStatus('generating');
        setAiProgress([]);
        setAiError('');

        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

        // POST to get an SSE stream; we use fetch + ReadableStream to handle POST+SSE
        let response: Response;
        try {
            response = await fetch(CarouselGenerationController.generate().url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken, 'Accept': 'text/event-stream' },
                body: JSON.stringify({ topic: aiTopic, style: aiStyle || undefined, slide_count: aiSlideCount }),
            });
        } catch {
            setAiStatus('error');
            setAiError(t('slideEditor.ai.errorNetwork'));
            return;
        }

        if (!response.ok || !response.body) {
            setAiStatus('error');
            setAiError(t('slideEditor.ai.errorServer'));
            return;
        }

        // Consume SSE stream, collecting all text_delta chunks into one string
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = '';
        let assembled = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            sseBuffer += decoder.decode(value, { stream: true });

            const lines = sseBuffer.split('\n');
            sseBuffer = lines.pop() ?? '';

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                try {
                    const payload = JSON.parse(line.slice(6)) as { text?: string };
                    if (typeof payload.text === 'string') assembled += payload.text;
                } catch { /* ignore malformed SSE lines */ }
            }
        }

        setAiStatus('imaging');

        // Parse assembled NDJSON — one JSON object per line
        const parsedSlides: SlideData[] = [];
        for (const rawLine of assembled.split('\n')) {
            const trimmed = rawLine.trim();
            if (!trimmed.startsWith('{')) continue;
            try {
                const slide = JSON.parse(trimmed) as SlideData;
                if (slide.title && slide.imagePrompt) parsedSlides.push(slide);
            } catch { /* skip malformed lines */ }
        }

        if (parsedSlides.length === 0) {
            setAiStatus('error');
            setAiError(t('slideEditor.ai.errorParsing'));
            return;
        }

        // Generate images in parallel
        const imageResults = await Promise.allSettled(
            parsedSlides.map(async (s) => {
                setAiProgress((prev) => [...prev, s.title]);
                try {
                    const r = await fetch(CarouselGenerationController.generateImage().url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                        body: JSON.stringify({ prompt: s.imagePrompt }),
                    });
                    if (!r.ok) return null;
                    const data = await r.json() as { base64?: string };
                    return data.base64 ?? null;
                } catch {
                    return null;
                }
            }),
        );

        const newSlides = parsedSlides.map((s, i) => {
            const imgResult = imageResults[i];
            const base64 = imgResult.status === 'fulfilled' ? imgResult.value : null;
            return buildSlideFromData(s, base64);
        });

        setSlides((prev) => [...prev, ...newSlides]);
        setCurrentIdx(slides.length);
        loadGoogleFont('Poppins');
        setAiStatus('done');
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    function updateSlide(patch: Partial<Slide>) {
        setSlides((prev) => prev.map((s, i) => (i === currentIdx ? { ...s, ...patch } : s)));
    }

    function addSlide() {
        const next = makeSlide(slide.background);
        setSlides((prev) => [...prev.slice(0, currentIdx + 1), next, ...prev.slice(currentIdx + 1)]);
        setCurrentIdx(currentIdx + 1);
        setSelectedId(null);
    }

    function deleteSlide(idx: number) {
        if (slides.length === 1) return;
        setSlides((prev) => prev.filter((_, i) => i !== idx));
        setCurrentIdx(Math.min(idx, slides.length - 2));
        setSelectedId(null);
    }

    function duplicateSlide(idx: number) {
        const copy: Slide = { ...slides[idx], id: uid(), elements: slides[idx].elements.map((e) => ({ ...e, id: uid() } as unknown as SlideEl)) };
        setSlides((prev) => [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]);
        setCurrentIdx(idx + 1);
    }

    function addElement(el: SlideEl) {
        updateSlide({ elements: [...slide.elements, el] });
        setSelectedId(el.id);
        setTool('select');
    }

    function updateElement(id: string, patch: Partial<SlideEl>) {
        updateSlide({ elements: slide.elements.map((el) => (el.id === id ? ({ ...el, ...patch } as unknown as SlideEl) : el)) });
    }

    function deleteElement(id: string) {
        updateSlide({ elements: slide.elements.filter((el) => el.id !== id) });
        setSelectedId(null);
    }

    // ─── Stage click ─────────────────────────────────────────────────────────

    function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
        const target = e.target;
        const groupId = (target.parent as Konva.Node | null)?.id?.() ?? '';
        const isBackgroundImage = slide.elements.some(
            (el): el is ImageEl => el.type === 'image' && el.isBackground && el.id === groupId,
        );
        const clickedOnEmpty =
            target === target.getStage() ||
            (target.getClassName() === 'Rect' && target.id() === 'bg') ||
            (isBackgroundImage && tool !== 'select');
        if (tool === 'select') { if (clickedOnEmpty) setSelectedId(null); return; }
        if (!clickedOnEmpty) return;

        const pos = stageRef.current!.getPointerPosition()!;
        const x = pos.x / scale, y = pos.y / scale;

        if (tool === 'text') {
            addElement({
                id: uid(), type: 'text', x, y, width: 400, height: 80, rotation: 0, opacity: 1,
                text: 'Texto', fontSize: 48, fontFamily: 'Poppins', fill: '#111111',
                fontStyle: '', align: 'left', verticalAlign: 'top',
                lineHeight: 1.2, letterSpacing: 0, textDecoration: '', stroke: '#000000',
                strokeWidth: 0, padding: 0, wrap: 'word',
                accentEnabled: false, accentColor: '#E8440A', accentThickness: 6, accentSide: 'left', accentGap: 12,
                ...SHADOW_DEFAULTS,
            });
            loadGoogleFont('Poppins');
        } else if (tool === 'rect') {
            addElement({
                id: uid(), type: 'rect', x: x - 100, y: y - 60, width: 200, height: 120,
                rotation: 0, opacity: 1, fill: '#E8440A', stroke: '#000000', strokeWidth: 0,
                cornerRadius: 0, borderStyle: 'solid', dashEnabled: false,
                ...SHADOW_DEFAULTS,
            });
        } else if (tool === 'circle') {
            addElement({
                id: uid(), type: 'circle', x: x - 60, y: y - 60, width: 120, height: 120,
                rotation: 0, opacity: 1, fill: '#E8440A', stroke: '#000000', strokeWidth: 0,
                cornerRadius: 0, borderStyle: 'solid', dashEnabled: false,
                ...SHADOW_DEFAULTS,
            });
        }
    }

    // ─── Add gradient ────────────────────────────────────────────────────────

    function addGradientElement() {
        addElement({
            id: uid(), type: 'gradient',
            x: 0, y: Math.round(slideH / 2),
            width: SLIDE_W, height: Math.round(slideH / 2),
            rotation: 0, opacity: 1,
            color: '#000000',
            direction: 'bottom',
            ...SHADOW_DEFAULTS,
        });
    }

    // ─── Image upload ────────────────────────────────────────────────────────

    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            addElement({
                id: uid(), type: 'image', src: reader.result as string,
                x: SLIDE_W / 2 - 200, y: slideH / 2 - 200, width: 400, height: 400,
                rotation: 0, opacity: 1,
                brightness: 0, contrast: 0, blurRadius: 0, grayscale: false, sepia: false,
                hue: 0, saturation: 0, luminance: 0, pixelSize: 1, noise: 0, enhance: 0,
                red: 255, green: 255, blue: 255,
                overlayEnabled: false, overlayColor: '#000000', overlayOpacity: 0.4,
                isBackground: false, bgSize: 'cover', bgPositionX: 50, bgPositionY: 50,
                ...SHADOW_DEFAULTS,
            });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }

    // ─── Text inline editing ─────────────────────────────────────────────────

    function startEditing(el: TextEl) {
        const stage = stageRef.current!;
        const node = stage.findOne(`#${el.id}`) as Konva.Text;
        if (!node) return;
        setEditingId(el.id);

        const absPos = node.getAbsolutePosition();
        const stageBox = stage.container().getBoundingClientRect();
        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);
        Object.assign(textarea.style, {
            position: 'fixed',
            top: `${stageBox.top + absPos.y}px`,
            left: `${stageBox.left + absPos.x}px`,
            width: `${el.width * scale}px`,
            minHeight: `${el.fontSize * scale}px`,
            fontSize: `${el.fontSize * scale}px`,
            fontFamily: el.fontFamily,
            fontStyle: el.fontStyle,
            textAlign: el.align,
            color: el.fill,
            lineHeight: String(el.lineHeight),
            letterSpacing: `${el.letterSpacing}px`,
            background: 'transparent',
            border: '1px dashed #E8440A',
            outline: 'none',
            resize: 'none',
            padding: '0',
            zIndex: '9999',
            overflow: 'hidden',
        });
        textarea.value = el.text;
        textarea.focus();

        const finish = () => { updateElement(el.id, { text: textarea.value } as Partial<TextEl>); document.body.removeChild(textarea); setEditingId(null); };
        textarea.addEventListener('blur', finish);
        textarea.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { document.body.removeChild(textarea); setEditingId(null); } });
    }

    // ─── Export ──────────────────────────────────────────────────────────────

    function exportPNG() {
        if (!stageRef.current) return;
        setSelectedId(null);
        setTimeout(() => {
            const uri = stageRef.current!.toDataURL({ pixelRatio: SLIDE_W / displayW });
            const link = document.createElement('a');
            link.download = `slide-${currentIdx + 1}.png`;
            link.href = uri;
            link.click();
        }, 50);
    }

    // ─── Render ──────────────────────────────────────────────────────────────

    const selectedEl = slide.elements.find((el) => el.id === selectedId) ?? null;

    const toolBtn = (tool_: Tool, icon: React.ReactNode, label: string) => (
        <button title={label}
            onClick={() => { setTool(tool_); if (tool_ !== 'select') setSelectedId(null); }}
            className={`p-2 rounded-lg transition-colors ${tool === tool_ ? 'bg-[#E8440A] text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
            {icon}
        </button>
    );

    return (
        <>
            <Head title={t('slideEditor.pageTitle')} />
            <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-gray-50">

                {/* ── Toolbar ──────────────────────────────────────────────── */}
                <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-1 mr-2">
                        {toolBtn('select', <MousePointer className="w-4 h-4" />, t('slideEditor.toolbar.select'))}
                        {toolBtn('text', <Type className="w-4 h-4" />, t('slideEditor.toolbar.text'))}
                        {toolBtn('rect', <Square className="w-4 h-4" />, t('slideEditor.toolbar.rect'))}
                        {toolBtn('circle', <Circle className="w-4 h-4" />, t('slideEditor.toolbar.circle'))}
                    </div>
                    <div className="w-px h-6 bg-gray-200 mx-1" />
                    <button title={t('slideEditor.toolbar.image')} onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                        <ImageIcon className="w-4 h-4" /> {t('slideEditor.toolbar.image')}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <button title={t('slideEditor.toolbar.gradient')} onClick={addGradientElement}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0" aria-hidden="true">
                            <defs>
                                <linearGradient id="grad-btn" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0" stopColor="currentColor" stopOpacity="0" />
                                    <stop offset="1" stopColor="currentColor" stopOpacity="1" />
                                </linearGradient>
                            </defs>
                            <rect x="1" y="1" width="14" height="14" rx="2" fill="url(#grad-btn)" />
                        </svg>
                        {t('slideEditor.toolbar.gradient')}
                    </button>
                    <div className="w-px h-6 bg-gray-200 mx-1" />
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">{t('slideEditor.toolbar.background')}</label>
                        <input type="color" value={slide.background}
                            onChange={(e) => updateSlide({ background: e.target.value })}
                            className="w-7 h-7 cursor-pointer rounded border border-gray-200" />
                    </div>
                    {/* Title */}
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-sm font-medium text-gray-700 border-b border-transparent hover:border-gray-300 focus:border-[#E8440A] focus:outline-none bg-transparent px-1 w-44 truncate"
                    />

                    <div className="flex-1" />

                    {/* Save status */}
                    <span className="text-[11px] text-gray-400 select-none">
                        {saveStatus === 'saving' ? t('slideEditor.toolbar.saving') : saveStatus === 'error' ? t('slideEditor.toolbar.saveError') : t('slideEditor.toolbar.saved')}
                    </span>

                    {/* Save button */}
                    <button onClick={saveProject}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                        <Save className="w-4 h-4" /> {t('slideEditor.toolbar.save')}
                    </button>

                    {/* AI Generate button */}
                    <button onClick={openAiModal}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 transition-all shadow-sm">
                        <Sparkles className="w-4 h-4" /> {t('slideEditor.ai.generate')}
                    </button>

                    {/* Format switcher */}
                    <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5">
                        {(Object.entries(FORMATS) as [Format, typeof FORMATS[Format]][]).map(([key, fmt]) => (
                            <button
                                key={key}
                                onClick={() => setFormat(key)}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${format === key ? 'bg-[#E8440A] text-white' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <span className={`inline-flex items-center justify-center border-2 rounded-sm shrink-0 ${format === key ? 'border-white/70' : 'border-gray-400'}`}
                                    style={{ width: key === 'post' ? 12 : 9, height: key === 'post' ? 12 : 14 }} />
                                {t(`slideEditor.formats.${key}`)}
                                <span className={`text-[10px] ${format === key ? 'text-white/70' : 'text-gray-400'}`}>{fmt.ratio}</span>
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-6 bg-gray-200 mx-1" />

                    <button onClick={exportPNG}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-[#E8440A] text-white hover:bg-[#D13D09] transition-colors">
                        <Download className="w-4 h-4" /> {t('slideEditor.toolbar.exportPng')}
                    </button>
                </div>

                {/* ── Body ─────────────────────────────────────────────────── */}
                <div className="flex flex-1 overflow-hidden">

                    {/* Left: Slides */}
                    <div className="flex flex-col bg-white border-r border-gray-100 overflow-y-auto shrink-0" style={{ width: PANEL_LEFT }}>
                        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
                            <span className="text-xs font-semibold text-gray-500">{t('slideEditor.slides.panel')}</span>
                            <button onClick={addSlide} className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-500"><Plus className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="flex flex-col gap-2 p-2">
                            {slides.map((s, idx) => (
                                <div key={s.id} onClick={() => { setCurrentIdx(idx); setSelectedId(null); }}
                                    className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-colors ${idx === currentIdx ? 'border-[#E8440A]' : 'border-transparent hover:border-gray-200'}`}
                                    style={{ aspectRatio: '1 / 1', background: s.background }}>
                                    <span className="absolute top-1 left-1 text-[9px] font-bold text-white bg-black/40 rounded px-1 leading-4">{idx + 1}</span>
                                    <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5">
                                        <button onClick={(e) => { e.stopPropagation(); duplicateSlide(idx); }} className="p-0.5 rounded bg-black/40 text-white hover:bg-black/60" title={t('slideEditor.slides.duplicate')}><Plus className="w-2.5 h-2.5" /></button>
                                        {slides.length > 1 && <button onClick={(e) => { e.stopPropagation(); deleteSlide(idx); }} className="p-0.5 rounded bg-black/40 text-white hover:bg-red-500" title={t('slideEditor.slides.delete')}><X className="w-2.5 h-2.5" /></button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Center: Canvas */}
                    <div ref={containerRef} className="flex flex-1 items-center justify-center overflow-hidden bg-gray-100">
                        <div className="shadow-2xl rounded-sm overflow-hidden" style={{ width: displayW, height: displayH }}>
                            <Stage ref={stageRef} width={displayW} height={displayH} scaleX={scale} scaleY={scale}
                                onClick={handleStageClick} style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}>
                                <Layer>
                                    <Rect id="bg" x={0} y={0} width={SLIDE_W} height={slideH} fill={slide.background} listening={true} />

                                    {[...slide.elements].sort((a, b) => {
                                        const aIsBg = a.type === 'image' && a.isBackground ? -1 : 0;
                                        const bIsBg = b.type === 'image' && b.isBackground ? -1 : 0;
                                        return aIsBg - bIsBg;
                                    }).map((el) => {
                                        const common = {
                                            key: el.id, id: el.id,
                                            draggable: tool === 'select',
                                            onClick: () => { if (tool === 'select') setSelectedId(el.id); },
                                            onTap: () => { if (tool === 'select') setSelectedId(el.id); },
                                            shadowEnabled: el.shadowEnabled,
                                            shadowColor: el.shadowColor,
                                            shadowBlur: el.shadowBlur,
                                            shadowOffsetX: el.shadowOffsetX,
                                            shadowOffsetY: el.shadowOffsetY,
                                            shadowOpacity: el.shadowOpacity,
                                        };

                                        if (el.type === 'text') {
                                            return (
                                                <KonvaTextEl
                                                    key={el.id}
                                                    el={el}
                                                    hidden={editingId === el.id}
                                                    draggable={tool === 'select'}
                                                    onSelect={() => { if (tool === 'select') setSelectedId(el.id); }}
                                                    onDblClick={() => startEditing(el)}
                                                    onChange={(patch) => updateElement(el.id, patch as Partial<SlideEl>)}
                                                />
                                            );
                                        }

                                        if (el.type === 'rect') {
                                            const dash = borderStyleToDash(el.borderStyle, el.strokeWidth);
                                            return (
                                                <Rect {...common}
                                                    x={el.x} y={el.y} width={el.width} height={el.height}
                                                    rotation={el.rotation} opacity={el.opacity}
                                                    fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth}
                                                    cornerRadius={el.cornerRadius}
                                                    dash={dash.length ? dash : undefined}
                                                    dashEnabled={el.dashEnabled}
                                                    onDragEnd={(e) => updateElement(el.id, { x: e.target.x(), y: e.target.y() } as Partial<ShapeEl>)}
                                                    onTransformEnd={(e) => {
                                                        const node = e.target;
                                                        updateElement(el.id, { x: node.x(), y: node.y(), width: Math.max(10, node.width() * node.scaleX()), height: Math.max(10, node.height() * node.scaleY()), rotation: node.rotation() } as Partial<ShapeEl>);
                                                        node.scaleX(1); node.scaleY(1);
                                                    }}
                                                />
                                            );
                                        }

                                        if (el.type === 'circle') {
                                            const dash = borderStyleToDash(el.borderStyle, el.strokeWidth);
                                            return (
                                                <KonvaCircle {...common}
                                                    x={el.x + el.width / 2} y={el.y + el.height / 2}
                                                    radiusX={el.width / 2} radiusY={el.height / 2}
                                                    rotation={el.rotation} opacity={el.opacity}
                                                    fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth}
                                                    dash={dash.length ? dash : undefined}
                                                    dashEnabled={el.dashEnabled}
                                                    onDragEnd={(e) => updateElement(el.id, { x: e.target.x() - el.width / 2, y: e.target.y() - el.height / 2 } as Partial<ShapeEl>)}
                                                    onTransformEnd={(e) => {
                                                        const node = e.target;
                                                        const nw = Math.max(10, el.width * node.scaleX());
                                                        const nh = Math.max(10, el.height * node.scaleY());
                                                        updateElement(el.id, { x: node.x() - nw / 2, y: node.y() - nh / 2, width: nw, height: nh, rotation: node.rotation() } as Partial<ShapeEl>);
                                                        node.scaleX(1); node.scaleY(1);
                                                    }}
                                                />
                                            );
                                        }

                                        if (el.type === 'image') {
                                            return <KonvaImageEl key={el.id} el={el} slideW={SLIDE_W} slideH={slideH} draggable={tool === 'select'} onSelect={() => { if (tool === 'select') setSelectedId(el.id); }} onChange={(patch) => updateElement(el.id, patch as Partial<SlideEl>)} />;
                                        }

                                        if (el.type === 'gradient') {
                                            const gp = gradientLinearProps(el);
                                            return (
                                                <Rect {...common}
                                                    x={el.x} y={el.y} width={el.width} height={el.height}
                                                    rotation={el.rotation} opacity={el.opacity}
                                                    fillLinearGradientStartPoint={gp.start}
                                                    fillLinearGradientEndPoint={gp.end}
                                                    fillLinearGradientColorStops={gp.stops}
                                                    onDragEnd={(e) => updateElement(el.id, { x: e.target.x(), y: e.target.y() } as Partial<GradientEl>)}
                                                    onTransformEnd={(e) => {
                                                        const node = e.target;
                                                        updateElement(el.id, { x: node.x(), y: node.y(), width: Math.max(10, node.width() * node.scaleX()), height: Math.max(10, node.height() * node.scaleY()), rotation: node.rotation() } as Partial<GradientEl>);
                                                        node.scaleX(1); node.scaleY(1);
                                                    }}
                                                />
                                            );
                                        }

                                        return null;
                                    })}

                                    <Transformer ref={trRef} rotateEnabled={true}
                                        enabledAnchors={['top-left','top-center','top-right','middle-right','middle-left','bottom-left','bottom-center','bottom-right']}
                                        boundBoxFunc={(oldBox, newBox) => (newBox.width < 10 || newBox.height < 10 ? oldBox : newBox)}
                                        borderStroke="#E8440A" anchorStroke="#E8440A" anchorFill="#ffffff" anchorSize={8} />
                                </Layer>
                            </Stage>
                        </div>
                    </div>

                    {/* Right: Properties */}
                    <div className="bg-white border-l border-gray-100 shrink-0 overflow-hidden flex flex-col" style={{ width: PANEL_RIGHT }}>
                        <div className="px-4 py-2.5 border-b border-gray-100 shrink-0">
                            <p className="text-xs font-semibold text-gray-500">{t('slideEditor.properties.panel')}</p>
                        </div>
                        <PropertiesPanel
                            el={selectedEl}
                            onChange={(patch) => selectedId && updateElement(selectedId, patch as Partial<SlideEl>)}
                            onDelete={() => selectedId && deleteElement(selectedId)}
                        />
                    </div>
                </div>
            </div>

            {/* ── AI Carousel Modal ─────────────────────────────────────────── */}
            {aiModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-indigo-50">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-violet-600" />
                                <h2 className="text-base font-semibold text-gray-800">{t('slideEditor.ai.modalTitle')}</h2>
                            </div>
                            <button onClick={closeAiModal} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            {aiStatus === 'idle' || aiStatus === 'error' ? (
                                <>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('slideEditor.ai.topicLabel')}</label>
                                        <textarea
                                            value={aiTopic}
                                            onChange={(e) => setAiTopic(e.target.value)}
                                            placeholder={t('slideEditor.ai.topicPlaceholder')}
                                            rows={3}
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('slideEditor.ai.styleLabel')}</label>
                                        <input
                                            value={aiStyle}
                                            onChange={(e) => setAiStyle(e.target.value)}
                                            placeholder={t('slideEditor.ai.stylePlaceholder')}
                                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('slideEditor.ai.slideCountLabel')}</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="range" min={2} max={10} value={aiSlideCount}
                                                onChange={(e) => setAiSlideCount(Number(e.target.value))}
                                                className="flex-1 accent-violet-600"
                                            />
                                            <span className="text-sm font-semibold text-violet-700 w-6 text-center">{aiSlideCount}</span>
                                        </div>
                                    </div>
                                    {aiStatus === 'error' && (
                                        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{aiError}</p>
                                    )}
                                    <button
                                        onClick={generateCarousel}
                                        disabled={!aiTopic.trim()}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                                        <Sparkles className="w-4 h-4" /> {t('slideEditor.ai.generateBtn')}
                                    </button>
                                </>
                            ) : aiStatus === 'generating' ? (
                                <div className="flex flex-col items-center gap-4 py-6">
                                    <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
                                    <p className="text-sm text-gray-600">{t('slideEditor.ai.statusGenerating')}</p>
                                </div>
                            ) : aiStatus === 'imaging' ? (
                                <div className="flex flex-col items-center gap-4 py-4">
                                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                    <p className="text-sm text-gray-600">{t('slideEditor.ai.statusImages')}</p>
                                    {aiProgress.length > 0 && (
                                        <ul className="w-full space-y-1">
                                            {aiProgress.map((title_, i) => (
                                                <li key={i} className="flex items-center gap-2 text-xs text-gray-500">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                                    {title_}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-4 py-6">
                                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                        <Sparkles className="w-6 h-6 text-green-600" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-700">{t('slideEditor.ai.statusDone')}</p>
                                    <button onClick={closeAiModal}
                                        className="px-6 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium hover:from-violet-700 hover:to-indigo-700 transition-all">
                                        {t('slideEditor.ai.doneBtn')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
