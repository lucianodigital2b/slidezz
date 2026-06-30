import Konva from 'konva';
import { MousePointer, Type, RectangleHorizontal, Square, Circle as CircleIcon, Shapes } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    Circle as KonvaCircle,
    Group,
    Layer,
    Path as KonvaPath,
    Rect,
    Stage,
    Text as KonvaText,
    Transformer,
} from 'react-konva';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    SLIDE_W, Tool, Slide, SlideEl, TextEl, ShapeEl, GradientEl, PathEl, TextReadabilityStyle,
} from './types';
import { borderStyleToDash, contrastRatio, gradientLinearProps, normalizeHexColor } from './utils';
import { KonvaTextEl, KonvaImageEl, KonvaButtonEl, KonvaBadgeEl } from './KonvaElements';
import { loadGoogleFont } from '@/utils/google-fonts';
import { ShapeDef, SHAPE_CATEGORIES } from './shapes';

/** Horizontal gap between slides in the overview row, in world (pre-scale) units. */
export const SLIDE_GAP = 120;

/** World-space x offset of slide `idx` within the overview row. */
export function slideOffsetX(idx: number): number {
    return idx * (SLIDE_W + SLIDE_GAP);
}

interface CanvasAreaProps {
    slides: Slide[];
    currentIdx: number;
    slideH: number;
    scale: number;
    containerRef: React.RefObject<HTMLDivElement>;
    stageRef: React.RefObject<Konva.Stage>;
    trRef: React.RefObject<Konva.Transformer>;
    tool: Tool;
    onToolChange: (tool: Tool) => void;
    selectedId: string | null;
    onSelectElement: (slideIdx: number, id: string) => void;
    editingId: string | null;
    showSafeAreaGuide: boolean;
    safeAreaBounds: { x: number; y: number; width: number; height: number };
    safeAreaPadding: { top: number; right: number; bottom: number; left: number };
    elementsOpen: boolean;
    onElementsOpenChange: (open: boolean) => void;
    onStageClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
    onStageDragStart: (e: Konva.KonvaEventObject<DragEvent>) => void;
    onStageDragEnd: () => void;
    onAddPath: (shape: ShapeDef) => void;
    onStartEditing: (el: TextEl) => void;
    onElementChange: (id: string, patch: Partial<SlideEl>) => void;
    onBadgeMove?: (slideIdx: number, x: number, y: number) => void;
}

const CORNER_PAD = 50;
const CORNER_FS = 28;
const DRAG_GUIDE_THRESHOLD = 18;
const DRAG_GUIDE_STROKE = '#0D99FF';
const DRAG_GUIDE_DASH = [3, 9];
const READABLE_TEXT_DARK = '#111111';
const READABLE_TEXT_LIGHT = '#F5F7FA';
const MIN_TEXT_CONTRAST = 4.5;
const BUSY_BACKDROP_VARIANCE = 900;
// Auto-contrast assist for title/body text (colour swap + support outline/shadow).
// Disabled for now — render the author's chosen colours verbatim.
const READABILITY_ENABLED = false;
const ICON_CHAR: Record<string, string> = {
    none: '',
    bookmark: '🔖',
    arrow: '→',
    heart: '♥',
};

interface DragGuideState {
    slideIdx: number;
    showVertical: boolean;
    showHorizontal: boolean;
}

interface CanvasSampleStats {
    backgroundHex: string;
    variance: number;
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function rgbToHex(r: number, g: number, b: number) {
    return `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function sampleCanvasRegion(
    ctx: CanvasRenderingContext2D,
    rect: { x: number; y: number; width: number; height: number },
): CanvasSampleStats | null {
    const sx = clamp(Math.floor(rect.x), 0, Math.max(0, ctx.canvas.width - 1));
    const sy = clamp(Math.floor(rect.y), 0, Math.max(0, ctx.canvas.height - 1));
    const sw = Math.max(1, Math.min(ctx.canvas.width - sx, Math.ceil(rect.width)));
    const sh = Math.max(1, Math.min(ctx.canvas.height - sy, Math.ceil(rect.height)));
    if (sw <= 0 || sh <= 0) return null;

    const { data } = ctx.getImageData(sx, sy, sw, sh);
    const pixelCount = sw * sh;
    const stride = Math.max(1, Math.floor(Math.sqrt(pixelCount / 3000)));

    let samples = 0;
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let sumRSquared = 0;
    let sumGSquared = 0;
    let sumBSquared = 0;

    for (let y = 0; y < sh; y += stride) {
        for (let x = 0; x < sw; x += stride) {
            const index = (y * sw + x) * 4;
            const alpha = data[index + 3] / 255;
            const red = data[index] * alpha + 255 * (1 - alpha);
            const green = data[index + 1] * alpha + 255 * (1 - alpha);
            const blue = data[index + 2] * alpha + 255 * (1 - alpha);

            sumR += red;
            sumG += green;
            sumB += blue;
            sumRSquared += red * red;
            sumGSquared += green * green;
            sumBSquared += blue * blue;
            samples++;
        }
    }

    if (samples === 0) return null;

    const avgR = sumR / samples;
    const avgG = sumG / samples;
    const avgB = sumB / samples;
    const varianceR = Math.max(0, sumRSquared / samples - avgR * avgR);
    const varianceG = Math.max(0, sumGSquared / samples - avgG * avgG);
    const varianceB = Math.max(0, sumBSquared / samples - avgB * avgB);

    return {
        backgroundHex: rgbToHex(avgR, avgG, avgB),
        variance: (varianceR + varianceG + varianceB) / 3,
    };
}

function resolveTextReadability(fill: string, sample: CanvasSampleStats): TextReadabilityStyle {
    const preferredFill = normalizeHexColor(fill);
    const backdropIsBusy = sample.variance >= BUSY_BACKDROP_VARIANCE;

    // On flat (solid/gradient) backdrops, honour the author's chosen colour exactly.
    // The auto-contrast assist (colour swap + support outline/shadow) only exists to
    // keep text legible over busy photo backdrops. Running it on a flat background
    // overrides deliberate accent colours — e.g. the template's brand orange dipping
    // a touch below the AA ratio gets repainted black with an unwanted grey ring.
    if (!backdropIsBusy && preferredFill) {
        return {
            fill: preferredFill,
            stroke: undefined,
            strokeWidth: 0,
            shadowColor: undefined,
            shadowBlur: 0,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowOpacity: 0,
        };
    }

    const preferredContrast = preferredFill ? contrastRatio(preferredFill, sample.backgroundHex) : 0;
    const darkContrast = contrastRatio(READABLE_TEXT_DARK, sample.backgroundHex);
    const lightContrast = contrastRatio(READABLE_TEXT_LIGHT, sample.backgroundHex);
    const autoFill = darkContrast >= lightContrast ? READABLE_TEXT_DARK : READABLE_TEXT_LIGHT;
    const resolvedFill = preferredContrast >= MIN_TEXT_CONTRAST ? preferredFill! : autoFill;
    const resolvedContrast = contrastRatio(resolvedFill, sample.backgroundHex);
    const lowContrast = resolvedContrast < MIN_TEXT_CONTRAST;
    const useOutline = sample.variance >= BUSY_BACKDROP_VARIANCE || lowContrast;
    const useShadow = sample.variance >= 320 || lowContrast;
    const supportStroke = resolvedFill === READABLE_TEXT_DARK ? 'rgba(245, 247, 250, 0.7)' : 'rgba(17, 17, 17, 0.55)';
    const supportShadow = resolvedFill === READABLE_TEXT_DARK ? '#F5F7FA' : '#111111';

    return {
        fill: resolvedFill,
        stroke: useOutline ? supportStroke : undefined,
        strokeWidth: useOutline ? 1.25 : 0,
        shadowColor: useShadow ? supportShadow : undefined,
        shadowBlur: useShadow ? (useOutline ? 6 : 4) : 0,
        shadowOffsetX: 0,
        shadowOffsetY: useShadow ? 1 : 0,
        shadowOpacity: useShadow ? (useOutline ? 0.22 : 0.16) : 0,
    };
}

export function CanvasArea({
    slides, currentIdx, slideH, scale,
    containerRef, stageRef, trRef,
    tool, onToolChange,
    selectedId, onSelectElement,
    editingId,
    showSafeAreaGuide, safeAreaBounds, safeAreaPadding,
    elementsOpen, onElementsOpenChange,
    onStageClick, onStageDragStart, onStageDragEnd,
    onAddPath, onStartEditing, onElementChange,
    onBadgeMove,
}: CanvasAreaProps) {
    const { t } = useTranslation();
    const [dragGuides, setDragGuides] = useState<DragGuideState>({
        slideIdx: -1,
        showVertical: false,
        showHorizontal: false,
    });
    const [textReadabilityMap, setTextReadabilityMap] = useState<Record<string, TextReadabilityStyle>>({});
    const [cornerFontRevision, setCornerFontRevision] = useState(0);
    const sampleFrameRef = useRef<number | null>(null);
    const isSamplingTextReadabilityRef = useRef(false);
    const readabilitySignatureRef = useRef('');

    // Horizontal scroller for the slide row, plus the last focused slide so we can
    // nudge it when an adjacent slide is selected.
    const scrollerRef = useRef<HTMLDivElement>(null);
    const prevIdxRef = useRef(currentIdx);

    const slidesCount = slides.length;

    // Flat list of every text element across all slides, tagged with its slide
    // index and whether that slide has a photo backdrop (only then does the
    // readability assist run — see resolveTextReadability).
    const textEntries = useMemo(() => {
        const out: { el: TextEl; slideIdx: number; slideHasImage: boolean }[] = [];
        slides.forEach((s, idx) => {
            const slideHasImage = s.elements.some((e) => e.type === 'image');
            for (const e of s.elements) {
                if (e.type === 'text') out.push({ el: e, slideIdx: idx, slideHasImage });
            }
        });
        return out;
    }, [slides]);

    const stageW = (SLIDE_W * Math.max(1, slidesCount) + SLIDE_GAP * Math.max(0, slidesCount - 1)) * scale;
    const stageH = slideH * scale;

    // Keep the selected slide in view: whenever the current slide changes (a
    // neighbour step, or a jump from the thumbnail strip), scroll the row just
    // enough to reveal it. If it's already fully visible the row stays put.
    useEffect(() => {
        prevIdxRef.current = currentIdx;

        const scroller = scrollerRef.current;
        if (!scroller) return;

        const margin = SLIDE_GAP * scale;
        const slideLeft = slideOffsetX(currentIdx) * scale;
        const slideRight = slideLeft + SLIDE_W * scale;
        const viewLeft = scroller.scrollLeft;
        const viewRight = viewLeft + scroller.clientWidth;

        if (slideLeft < viewLeft + margin) {
            scroller.scrollTo({ left: Math.max(0, slideLeft - margin), behavior: 'smooth' });
        } else if (slideRight > viewRight - margin) {
            scroller.scrollTo({ left: slideRight - scroller.clientWidth + margin, behavior: 'smooth' });
        }
    }, [currentIdx, scale]);

    // Top/bottom band hidden by the Instagram profile-grid 1:1 centre crop.
    const gridCropInset = Math.max(0, Math.round((slideH - SLIDE_W) / 2));

    // Load every corner font used across slides and re-render when ready.
    useEffect(() => {
        const fonts = new Set<string>();
        for (const s of slides) {
            if (!s.corners?.show) continue;
            for (const key of ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const) {
                const f = s.corners[key].fontFamily;
                if (f) fonts.add(f);
            }
        }
        if (fonts.size === 0) fonts.add('Poppins');
        Promise.all([...fonts].map((f) => loadGoogleFont(f))).then(() => {
            setCornerFontRevision((r) => r + 1);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slides]);

    const clearDragGuides = useCallback(() => {
        setDragGuides({ slideIdx: -1, showVertical: false, showHorizontal: false });
    }, []);

    const updateDragGuides = useCallback((el: SlideEl, node: Konva.Node, slideIdx: number) => {
        const frame = el.type === 'circle'
            ? { x: node.x() - el.width / 2, y: node.y() - el.height / 2, width: el.width, height: el.height }
            : { x: node.x(), y: node.y(), width: el.width, height: el.height };

        const centerX = frame.x + frame.width / 2;
        const centerY = frame.y + frame.height / 2;

        setDragGuides({
            slideIdx,
            showVertical: Math.abs(centerX - SLIDE_W / 2) <= DRAG_GUIDE_THRESHOLD,
            showHorizontal: Math.abs(centerY - slideH / 2) <= DRAG_GUIDE_THRESHOLD,
        });
    }, [slideH]);

    const handleStageDragEnd = useCallback(() => {
        clearDragGuides();
        onStageDragEnd();
    }, [clearDragGuides, onStageDragEnd]);

    const sampleTextReadability = useCallback(() => {
        const stage = stageRef.current;
        const targets = READABILITY_ENABLED ? textEntries.filter((entry) => entry.slideHasImage) : [];
        if (!stage || targets.length === 0) {
            if (readabilitySignatureRef.current !== '') {
                readabilitySignatureRef.current = '';
                setTextReadabilityMap({});
            }
            return;
        }

        isSamplingTextReadabilityRef.current = true;
        const nextReadabilityMap: Record<string, TextReadabilityStyle> = {};

        try {
            for (const { el } of targets) {
                const node = stage.findOne(`#${el.id}`) as Konva.Node | null;
                if (!node) continue;

                const rect = node.getClientRect({ relativeTo: stage, skipShadow: true });
                if (rect.width < 1 || rect.height < 1) continue;

                const wasVisible = node.visible();
                node.visible(false);
                stage.batchDraw();

                const canvas = stage.toCanvas();
                const ctx = canvas.getContext('2d');

                node.visible(wasVisible);
                stage.batchDraw();

                if (!ctx) continue;

                const sample = sampleCanvasRegion(ctx, rect);
                if (!sample) continue;

                nextReadabilityMap[el.id] = resolveTextReadability(el.fill, sample);
            }
        } finally {
            isSamplingTextReadabilityRef.current = false;
        }

        const nextSignature = JSON.stringify(nextReadabilityMap);
        if (nextSignature !== readabilitySignatureRef.current) {
            readabilitySignatureRef.current = nextSignature;
            setTextReadabilityMap(nextReadabilityMap);
        }
    }, [stageRef, textEntries]);

    const scheduleTextReadabilitySampling = useCallback(() => {
        if (sampleFrameRef.current !== null || isSamplingTextReadabilityRef.current) return;
        sampleFrameRef.current = window.requestAnimationFrame(() => {
            sampleFrameRef.current = null;
            sampleTextReadability();
        });
    }, [sampleTextReadability]);

    useEffect(() => {
        scheduleTextReadabilitySampling();
        return () => {
            if (sampleFrameRef.current !== null) {
                window.cancelAnimationFrame(sampleFrameRef.current);
                sampleFrameRef.current = null;
            }
        };
    }, [scheduleTextReadabilitySampling, slides, scale]);

    useEffect(() => {
        const stage = stageRef.current;
        if (!stage) return;

        const handleLayerDraw = () => scheduleTextReadabilitySampling();
        const layers = stage.getLayers();
        layers.forEach((layer) => layer.on('draw.text-readability', handleLayerDraw));

        return () => {
            layers.forEach((layer) => layer.off('draw.text-readability'));
        };
    }, [stageRef, scheduleTextReadabilitySampling]);

    const renderElement = useCallback((el: SlideEl, idx: number) => {
        const select = () => { if (tool === 'select') onSelectElement(idx, el.id); };
        const common = {
            key: el.id,
            id: el.id,
            draggable: tool === 'select',
            onClick: select,
            onTap: select,
            onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => updateDragGuides(el, e.target, idx),
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
                    onSelect={select}
                    onDblClick={() => onStartEditing(el)}
                    onDragMove={(e) => updateDragGuides(el, e.target, idx)}
                    readability={READABILITY_ENABLED ? textReadabilityMap[el.id] : undefined}
                    onChange={(patch) => onElementChange(el.id, patch as Partial<SlideEl>)}
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
                    onDragEnd={(e) => onElementChange(el.id, { x: e.target.x(), y: e.target.y() } as Partial<ShapeEl>)}
                    onTransformEnd={(e) => {
                        const node = e.target;
                        onElementChange(el.id, { x: node.x(), y: node.y(), width: Math.max(10, node.width() * node.scaleX()), height: Math.max(10, node.height() * node.scaleY()), rotation: node.rotation() } as Partial<ShapeEl>);
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
                    onDragEnd={(e) => onElementChange(el.id, { x: e.target.x() - el.width / 2, y: e.target.y() - el.height / 2 } as Partial<ShapeEl>)}
                    onTransformEnd={(e) => {
                        const node = e.target;
                        const nw = Math.max(10, el.width * node.scaleX());
                        const nh = Math.max(10, el.height * node.scaleY());
                        onElementChange(el.id, { x: node.x() - nw / 2, y: node.y() - nh / 2, width: nw, height: nh, rotation: node.rotation() } as Partial<ShapeEl>);
                        node.scaleX(1); node.scaleY(1);
                    }}
                />
            );
        }

        if (el.type === 'image') {
            return (
                <KonvaImageEl
                    key={el.id}
                    el={el}
                    slideW={SLIDE_W}
                    slideH={slideH}
                    draggable={tool === 'select'}
                    onSelect={select}
                    onDragMove={(e) => updateDragGuides(el, e.target, idx)}
                    onChange={(patch) => onElementChange(el.id, patch as Partial<SlideEl>)}
                />
            );
        }

        if (el.type === 'button') {
            return (
                <KonvaButtonEl
                    key={el.id}
                    el={el}
                    draggable={tool === 'select'}
                    onSelect={select}
                    onDblClick={() => {
                        const textInput = prompt('Edit button text:', el.text);
                        if (textInput !== null) onElementChange(el.id, { text: textInput } as Partial<SlideEl>);
                    }}
                    onDragMove={(e) => updateDragGuides(el, e.target, idx)}
                    onChange={(patch) => onElementChange(el.id, patch as Partial<SlideEl>)}
                />
            );
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
                    onDragEnd={(e) => onElementChange(el.id, { x: e.target.x(), y: e.target.y() } as Partial<GradientEl>)}
                    onTransformEnd={(e) => {
                        const node = e.target;
                        onElementChange(el.id, { x: node.x(), y: node.y(), width: Math.max(10, node.width() * node.scaleX()), height: Math.max(10, node.height() * node.scaleY()), rotation: node.rotation() } as Partial<GradientEl>);
                        node.scaleX(1); node.scaleY(1);
                    }}
                />
            );
        }

        if (el.type === 'path') {
            return (
                <Group
                    key={el.id}
                    id={el.id}
                    x={el.x} y={el.y}
                    rotation={el.rotation} opacity={el.opacity}
                    draggable={tool === 'select'}
                    onClick={select}
                    onTap={select}
                    shadowEnabled={el.shadowEnabled} shadowColor={el.shadowColor}
                    shadowBlur={el.shadowBlur} shadowOffsetX={el.shadowOffsetX}
                    shadowOffsetY={el.shadowOffsetY} shadowOpacity={el.shadowOpacity}
                    onDragMove={(e) => updateDragGuides(el, e.target, idx)}
                    onDragEnd={(e) => onElementChange(el.id, { x: e.target.x(), y: e.target.y() } as Partial<PathEl>)}
                    onTransformEnd={(e) => {
                        const node = e.target;
                        onElementChange(el.id, {
                            x: node.x(), y: node.y(),
                            width: Math.max(4, el.width * node.scaleX()),
                            height: Math.max(4, el.height * node.scaleY()),
                            rotation: node.rotation(),
                        } as Partial<PathEl>);
                        node.scaleX(1); node.scaleY(1);
                    }}
                >
                    <KonvaPath
                        data={el.data}
                        scaleX={el.width / el.dataW}
                        scaleY={el.height / el.dataH}
                        fill={el.fill === 'none' ? undefined : el.fill}
                        stroke={el.strokeWidth > 0 ? el.stroke : undefined}
                        strokeWidth={el.strokeWidth}
                        strokeScaleEnabled={false}
                    />
                </Group>
            );
        }

        return null;
    }, [tool, editingId, slideH, textReadabilityMap, onSelectElement, onStartEditing, onElementChange, updateDragGuides]);

    const renderCorners = (slide: Slide, idx: number) => {
        const corners = slide.corners;
        if (!corners?.show) return null;
        return (
            <>
                {corners.topLeft.enabled && corners.topLeft.text && (
                    <KonvaText
                        key={`corner-${idx}-topLeft-${cornerFontRevision}`}
                        id={`corner-${idx}-topLeft`}
                        x={CORNER_PAD} y={CORNER_PAD + (corners.topLeft.offsetY ?? 0)}
                        text={corners.topLeft.text}
                        fontSize={corners.topLeft.fontSize ?? CORNER_FS}
                        fontFamily={corners.topLeft.fontFamily ?? 'Poppins'}
                        fontStyle={corners.topLeft.fontStyle ?? ''}
                        letterSpacing={corners.topLeft.letterSpacing ?? 0}
                        fill={corners.topLeft.color}
                        listening={false}
                    />
                )}
                {corners.topRight.enabled && corners.topRight.text && (
                    <KonvaText
                        key={`corner-${idx}-topRight-${cornerFontRevision}`}
                        id={`corner-${idx}-topRight`}
                        x={CORNER_PAD} y={CORNER_PAD + (corners.topRight.offsetY ?? 0)}
                        width={SLIDE_W - CORNER_PAD * 2}
                        align="right"
                        text={corners.topRight.text}
                        fontSize={corners.topRight.fontSize ?? CORNER_FS}
                        fontFamily={corners.topRight.fontFamily ?? 'Poppins'}
                        fontStyle={corners.topRight.fontStyle ?? ''}
                        letterSpacing={corners.topRight.letterSpacing ?? 0}
                        fill={corners.topRight.color}
                        listening={false}
                    />
                )}
                {corners.bottomLeft.enabled && corners.bottomLeft.text && (
                    <KonvaText
                        key={`corner-${idx}-bottomLeft-${cornerFontRevision}`}
                        id={`corner-${idx}-bottomLeft`}
                        x={CORNER_PAD} y={slideH - CORNER_PAD - (corners.bottomLeft.fontSize ?? CORNER_FS) - (corners.bottomLeft.offsetY ?? 0)}
                        text={corners.bottomLeft.text}
                        fontSize={corners.bottomLeft.fontSize ?? CORNER_FS}
                        fontFamily={corners.bottomLeft.fontFamily ?? 'Poppins'}
                        fontStyle={corners.bottomLeft.fontStyle ?? ''}
                        letterSpacing={corners.bottomLeft.letterSpacing ?? 0}
                        fill={corners.bottomLeft.color}
                        listening={false}
                    />
                )}
                {corners.bottomRight.enabled && corners.bottomRight.text && (
                    <KonvaText
                        key={`corner-${idx}-bottomRight-${cornerFontRevision}`}
                        id={`corner-${idx}-bottomRight`}
                        x={CORNER_PAD} y={slideH - CORNER_PAD - (corners.bottomRight.fontSize ?? CORNER_FS) - (corners.bottomRight.offsetY ?? 0)}
                        width={SLIDE_W - CORNER_PAD * 2}
                        align="right"
                        text={corners.bottomRight.text}
                        fontSize={corners.bottomRight.fontSize ?? CORNER_FS}
                        fontFamily={corners.bottomRight.fontFamily ?? 'Poppins'}
                        fontStyle={corners.bottomRight.fontStyle ?? ''}
                        letterSpacing={corners.bottomRight.letterSpacing ?? 0}
                        fill={corners.bottomRight.color}
                        listening={false}
                    />
                )}
                {corners.bottomRightIcon !== 'none' && (
                    <KonvaText
                        x={CORNER_PAD} y={slideH - CORNER_PAD - CORNER_FS - 48}
                        width={SLIDE_W - CORNER_PAD * 2}
                        align="right"
                        text={ICON_CHAR[corners.bottomRightIcon]}
                        fontSize={36} fontFamily="sans-serif"
                        listening={false}
                    />
                )}
                {corners.showDots && slidesCount > 1 && (
                    Array.from({ length: slidesCount }, (_, i) => {
                        const dotR = 8;
                        const gap = 20;
                        const totalW = slidesCount * dotR * 2 + (slidesCount - 1) * (gap - dotR * 2);
                        const startX = (SLIDE_W - totalW) / 2;
                        const cx = startX + i * gap + dotR;
                        const cy = slideH - CORNER_PAD + 8;
                        return (
                            <KonvaCircle
                                key={`dot-${idx}-${i}`}
                                x={cx} y={cy}
                                radius={dotR}
                                fill={i === idx ? '#E8440A' : 'rgba(0,0,0,0.25)'}
                                listening={false}
                            />
                        );
                    })
                )}
            </>
        );
    };

    const toolBtn = (tool_: Tool, icon: React.ReactNode, label: string) => (
        <button
            title={label}
            onClick={() => onToolChange(tool_)}
            className={`border p-2.5 rounded-xl transition-all ${tool === tool_ ? 'border-gray-200 bg-[#f2f2f2] text-gray-700 shadow-sm' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}
        >
            {icon}
        </button>
    );

    return (
        <div ref={containerRef} className="relative flex flex-1 overflow-hidden bg-gray-100">

            {/* Elements library popup */}
            {elementsOpen && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-72 max-h-[65vh] overflow-y-auto">
                    {SHAPE_CATEGORIES.map(({ labelKey, shapes }) => (
                        <div key={labelKey} className="mb-4 last:mb-0">
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">{t(labelKey)}</p>
                            <div className="grid grid-cols-4 gap-1.5">
                                {shapes.map((shape) => {
                                    const isDotted = shape.id === 'line_dotted';
                                    const isDashed = shape.id === 'line_dashed';
                                    const isCurve = shape.id === 'arrow_ret';
                                    return (
                                        <button
                                            key={shape.id}
                                            onClick={() => onAddPath(shape)}
                                            className="aspect-square rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center p-2.5 transition-colors"
                                        >
                                            <svg viewBox={`0 0 ${shape.dataW} ${Math.max(shape.dataH, 1)}`} className="w-full h-full text-gray-700" fill="none">
                                                <path
                                                    d={shape.data}
                                                    fill={shape.preview === 'fill' ? 'currentColor' : 'none'}
                                                    stroke={shape.preview === 'stroke' ? 'currentColor' : 'none'}
                                                    strokeWidth={isDotted || isDashed ? 6 : isCurve ? 6 : 5}
                                                    strokeDasharray={isDotted ? '6 10' : isDashed ? '18 8' : undefined}
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Floating tool palette */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
                <div className="flex items-center gap-0.5 bg-white rounded-2xl shadow-xl border border-gray-200/80 px-1.5 py-1.5">
                    {toolBtn('select', <MousePointer className="w-4 h-4" />, t('slideEditor.toolbar.select'))}
                    {toolBtn('text', <Type className="w-4 h-4" />, t('slideEditor.toolbar.text'))}
                    {toolBtn('button', <RectangleHorizontal className="w-4 h-4" />, t('slideEditor.toolbar.button'))}
                    {toolBtn('rect', <Square className="w-4 h-4" />, t('slideEditor.toolbar.rect'))}
                    {toolBtn('circle', <CircleIcon className="w-4 h-4" />, t('slideEditor.toolbar.circle'))}
                    <div className="w-px h-4 bg-gray-200 mx-0.5" />
                    <button
                        title={t('slideEditor.actions.elements')}
                        onClick={() => onElementsOpenChange(!elementsOpen)}
                        className={`border p-2.5 rounded-xl transition-all ${elementsOpen ? 'border-gray-200 bg-[#f2f2f2] text-gray-700 shadow-sm' : 'border-transparent text-gray-500 hover:bg-gray-100'}`}
                    >
                        <Shapes className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Konva Stage — all slides in a row (scrolls horizontally; the tool
                palette above stays fixed because it lives outside this scroller). */}
            <div ref={scrollerRef} className="flex flex-1 overflow-auto">
              <div className="m-auto p-8" style={{ width: stageW + 64, height: stageH + 64 }}>
                <Stage
                    ref={stageRef}
                    width={stageW}
                    height={stageH}
                    scaleX={scale}
                    scaleY={scale}
                    onClick={onStageClick}
                    onDragStart={onStageDragStart}
                    onDragEnd={handleStageDragEnd}
                    style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
                >
                    <Layer>
                        {slides.map((slide, idx) => {
                            const ox = slideOffsetX(idx);
                            const isCurrent = idx === currentIdx;
                            // Inner slides (2nd onward) use a third of the lateral safe inset,
                            // matching computeSafeArea() — mirror that here so the guide lines up.
                            const guideLateral = idx === 0 ? safeAreaPadding.left : Math.round(safeAreaPadding.left / 3);
                            const sorted = [...slide.elements].sort((a, b) => {
                                const aIsBg = a.type === 'image' && a.isBackground ? -1 : 0;
                                const bIsBg = b.type === 'image' && b.isBackground ? -1 : 0;
                                return aIsBg - bIsBg;
                            });
                            return (
                                <Group
                                    key={slide.id ?? idx}
                                    id={`slidegroup-${idx}`}
                                    x={ox} y={0}
                                    clipX={0} clipY={0} clipWidth={SLIDE_W} clipHeight={slideH}
                                >
                                    <Rect id={`bg-${idx}`} x={0} y={0} width={SLIDE_W} height={slideH} fill={slide.background} listening={true} />

                                    {sorted.map((el) => renderElement(el, idx))}

                                    {renderCorners(slide, idx)}

                                    {slide.profileBadge && (
                                        <KonvaBadgeEl
                                            badge={slide.profileBadge}
                                            slideW={SLIDE_W}
                                            slideH={slideH}
                                            onBadgeMove={(x, y) => onBadgeMove?.(idx, x, y)}
                                        />
                                    )}

                                    {/* Safe area guide (current slide only) */}
                                    {isCurrent && showSafeAreaGuide && (
                                        <>
                                            {safeAreaPadding.top > 0 && (
                                                <Rect x={0} y={0} width={SLIDE_W} height={safeAreaPadding.top} fill="rgba(163,230,53,0.14)" listening={false} />
                                            )}
                                            {safeAreaPadding.bottom > 0 && (
                                                <Rect x={0} y={slideH - safeAreaPadding.bottom} width={SLIDE_W} height={safeAreaPadding.bottom} fill="rgba(163,230,53,0.14)" listening={false} />
                                            )}
                                            {guideLateral > 0 && (
                                                <Rect x={0} y={0} width={guideLateral} height={slideH} fill="rgba(163,230,53,0.14)" listening={false} />
                                            )}
                                            {guideLateral > 0 && (
                                                <Rect x={SLIDE_W - guideLateral} y={0} width={guideLateral} height={slideH} fill="rgba(163,230,53,0.14)" listening={false} />
                                            )}
                                            <Rect
                                                x={guideLateral} y={safeAreaBounds.y}
                                                width={SLIDE_W - guideLateral * 2} height={safeAreaBounds.height}
                                                stroke="#84cc16" strokeWidth={3} dash={[24, 14]} listening={false}
                                            />
                                        </>
                                    )}

                                    {/* Center drag guides for the slide being dragged */}
                                    {dragGuides.slideIdx === idx && dragGuides.showVertical && (
                                        <Rect x={SLIDE_W / 2 - 1} y={0} width={2} height={slideH}
                                            stroke={DRAG_GUIDE_STROKE} strokeWidth={2} dash={DRAG_GUIDE_DASH} listening={false} />
                                    )}
                                    {dragGuides.slideIdx === idx && dragGuides.showHorizontal && (
                                        <Rect x={0} y={slideH / 2 - 1} width={SLIDE_W} height={2}
                                            stroke={DRAG_GUIDE_STROKE} strokeWidth={2} dash={DRAG_GUIDE_DASH} listening={false} />
                                    )}

                                    {/* Instagram profile-grid crop guide: the grid shows only the
                                        centred 1:1 square, so the top/bottom bands are cut off there.
                                        Faintly shade them + dash the visible square. Hidden on export. */}
                                    {gridCropInset > 0 && showSafeAreaGuide && (
                                        <>
                                            <Rect name="slide-frame" x={0} y={0} width={SLIDE_W} height={gridCropInset} fill="rgba(15,23,42,0.16)" listening={false} />
                                            <Rect name="slide-frame" x={0} y={slideH - gridCropInset} width={SLIDE_W} height={gridCropInset} fill="rgba(15,23,42,0.16)" listening={false} />
                                            <Rect
                                                name="slide-frame"
                                                x={0} y={gridCropInset}
                                                width={SLIDE_W} height={slideH - gridCropInset * 2}
                                                stroke="rgba(13,153,255,0.55)" strokeWidth={2} dash={[18, 12]}
                                                listening={false}
                                            />
                                        </>
                                    )}

                                    {/* Slide frame — highlight the current slide (hidden during export) */}
                                    <Rect
                                        name="slide-frame"
                                        x={0} y={0} width={SLIDE_W} height={slideH}
                                        stroke={isCurrent ? '#E8440A' : 'rgba(0,0,0,0.10)'}
                                        strokeWidth={isCurrent ? 4 : 2}
                                        listening={false}
                                    />
                                </Group>
                            );
                        })}

                        <Transformer
                            ref={trRef}
                            rotateEnabled={true}
                            enabledAnchors={['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right']}
                            boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 2 || Math.abs(newBox.height) < 2 ? oldBox : newBox)}
                            borderStroke="#E8440A" anchorStroke="#E8440A" anchorFill="#ffffff" anchorSize={8}
                        />
                    </Layer>
                </Stage>
              </div>
            </div>
        </div>
    );
}
