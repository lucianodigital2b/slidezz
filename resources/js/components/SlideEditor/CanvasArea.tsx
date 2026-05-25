import Konva from 'konva';
import { MousePointer, Type, RectangleHorizontal, Square, Circle as CircleIcon, Shapes, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { useCallback, useState } from 'react';
import {
    SLIDE_W, Tool, Slide, SlideEl, TextEl, ShapeEl, GradientEl, PathEl, SlideCorners,
} from './types';
import { borderStyleToDash, gradientLinearProps } from './utils';
import { KonvaTextEl, KonvaImageEl, KonvaButtonEl } from './KonvaElements';
import { ShapeDef, SHAPE_CATEGORIES } from './shapes';

interface CanvasAreaProps {
    slide: Slide;
    slideH: number;
    scale: number;
    displayW: number;
    displayH: number;
    containerRef: React.RefObject<HTMLDivElement>;
    stageRef: React.RefObject<Konva.Stage>;
    trRef: React.RefObject<Konva.Transformer>;
    tool: Tool;
    onToolChange: (tool: Tool) => void;
    selectedId: string | null;
    onSelectElement: (id: string) => void;
    editingId: string | null;
    safeIdx: number;
    slidesCount: number;
    showSafeAreaGuide: boolean;
    safeAreaBounds: { x: number; y: number; width: number; height: number };
    safeAreaPadding: { top: number; bottom: number };
    elementsOpen: boolean;
    onElementsOpenChange: (open: boolean) => void;
    onStageClick: (e: Konva.KonvaEventObject<MouseEvent>) => void;
    onStageDragStart: (e: Konva.KonvaEventObject<DragEvent>) => void;
    onStageDragEnd: () => void;
    onAddPath: (shape: ShapeDef) => void;
    onStartEditing: (el: TextEl) => void;
    onElementChange: (id: string, patch: Partial<SlideEl>) => void;
    onPrevSlide: () => void;
    onNextSlide: () => void;
    corners?: SlideCorners;
}

const CORNER_PAD = 50;
const CORNER_FS = 28;
const DRAG_GUIDE_THRESHOLD = 18;
const DRAG_GUIDE_STROKE = '#0D99FF';
const DRAG_GUIDE_DASH = [3, 9];
const ICON_CHAR: Record<string, string> = {
    none: '',
    bookmark: '🔖',
    arrow: '→',
    heart: '♥',
};

interface DragGuideState {
    showVertical: boolean;
    showHorizontal: boolean;
}

export function CanvasArea({
    slide, slideH, scale, displayW, displayH,
    containerRef, stageRef, trRef,
    tool, onToolChange,
    selectedId, onSelectElement,
    editingId, safeIdx, slidesCount,
    showSafeAreaGuide, safeAreaBounds, safeAreaPadding,
    elementsOpen, onElementsOpenChange,
    onStageClick, onStageDragStart, onStageDragEnd,
    onAddPath, onStartEditing, onElementChange,
    onPrevSlide, onNextSlide,
    corners,
}: CanvasAreaProps) {
    const { t } = useTranslation();
    const [dragGuides, setDragGuides] = useState<DragGuideState>({
        showVertical: false,
        showHorizontal: false,
    });

    const clearDragGuides = useCallback(() => {
        setDragGuides({ showVertical: false, showHorizontal: false });
    }, []);

    const updateDragGuides = useCallback((el: SlideEl, node: Konva.Node) => {
        const frame = el.type === 'circle'
            ? { x: node.x() - el.width / 2, y: node.y() - el.height / 2, width: el.width, height: el.height }
            : { x: node.x(), y: node.y(), width: el.width, height: el.height };

        const centerX = frame.x + frame.width / 2;
        const centerY = frame.y + frame.height / 2;

        setDragGuides({
            showVertical: Math.abs(centerX - SLIDE_W / 2) <= DRAG_GUIDE_THRESHOLD,
            showHorizontal: Math.abs(centerY - slideH / 2) <= DRAG_GUIDE_THRESHOLD,
        });
    }, [slideH]);

    const handleStageDragEnd = useCallback(() => {
        clearDragGuides();
        onStageDragEnd();
    }, [clearDragGuides, onStageDragEnd]);

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
        <div ref={containerRef} className="relative flex flex-1 items-center justify-center overflow-hidden bg-gray-100">

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

            {/* Floating navigation + tool palette */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
                <button
                    type="button"
                    title={t('slideEditor.slides.prevSlide')}
                    onClick={onPrevSlide}
                    disabled={safeIdx === 0}
                    className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white shadow-xl border border-gray-200/80 text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-35 disabled:hover:bg-white"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

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

                <button
                    type="button"
                    title={t('slideEditor.slides.nextSlide')}
                    onClick={onNextSlide}
                    disabled={safeIdx >= slidesCount - 1}
                    className="flex items-center justify-center w-11 h-11 rounded-2xl bg-white shadow-xl border border-gray-200/80 text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-35 disabled:hover:bg-white"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Konva Stage */}
            <div className="shadow-2xl rounded-sm overflow-hidden" style={{ width: displayW, height: displayH }}>
                <Stage
                    ref={stageRef}
                    width={displayW}
                    height={displayH}
                    scaleX={scale}
                    scaleY={scale}
                    onClick={onStageClick}
                    onDragStart={onStageDragStart}
                    onDragEnd={handleStageDragEnd}
                    style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
                >
                    <Layer>
                        <Rect id="bg" x={0} y={0} width={SLIDE_W} height={slideH} fill={slide.background} listening={true} />

                        {[...slide.elements].sort((a, b) => {
                            const aIsBg = a.type === 'image' && a.isBackground ? -1 : 0;
                            const bIsBg = b.type === 'image' && b.isBackground ? -1 : 0;
                            return aIsBg - bIsBg;
                        }).map((el) => {
                            const common = {
                                key: el.id,
                                id: el.id,
                                draggable: tool === 'select',
                                onClick: () => { if (tool === 'select') onSelectElement(el.id); },
                                onTap: () => { if (tool === 'select') onSelectElement(el.id); },
                                onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => updateDragGuides(el, e.target),
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
                                        onSelect={() => { if (tool === 'select') onSelectElement(el.id); }}
                                        onDblClick={() => onStartEditing(el)}
                                        onDragMove={(e) => updateDragGuides(el, e.target)}
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
                                        onSelect={() => { if (tool === 'select') onSelectElement(el.id); }}
                                        onDragMove={(e) => updateDragGuides(el, e.target)}
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
                                        onSelect={() => { if (tool === 'select') onSelectElement(el.id); }}
                                        onDblClick={() => {
                                            const textInput = prompt('Edit button text:', el.text);
                                            if (textInput !== null) onElementChange(el.id, { text: textInput } as Partial<SlideEl>);
                                        }}
                                        onDragMove={(e) => updateDragGuides(el, e.target)}
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
                                        onClick={() => { if (tool === 'select') onSelectElement(el.id); }}
                                        onTap={() => { if (tool === 'select') onSelectElement(el.id); }}
                                        shadowEnabled={el.shadowEnabled} shadowColor={el.shadowColor}
                                        shadowBlur={el.shadowBlur} shadowOffsetX={el.shadowOffsetX}
                                        shadowOffsetY={el.shadowOffsetY} shadowOpacity={el.shadowOpacity}
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
                        })}

                        {/* Corner texts */}
                        {corners?.show && (
                            <>
                                {corners.topLeft.enabled && corners.topLeft.text && (
                                    <KonvaText
                                        x={CORNER_PAD} y={CORNER_PAD}
                                        text={corners.topLeft.text}
                                        fontSize={CORNER_FS} fontFamily="sans-serif"
                                        fill={corners.topLeft.color}
                                        listening={false}
                                    />
                                )}
                                {corners.topRight.enabled && corners.topRight.text && (
                                    <KonvaText
                                        x={CORNER_PAD} y={CORNER_PAD}
                                        width={SLIDE_W - CORNER_PAD * 2}
                                        align="right"
                                        text={corners.topRight.text}
                                        fontSize={CORNER_FS} fontFamily="sans-serif"
                                        fill={corners.topRight.color}
                                        listening={false}
                                    />
                                )}
                                {corners.bottomLeft.enabled && corners.bottomLeft.text && (
                                    <KonvaText
                                        x={CORNER_PAD} y={slideH - CORNER_PAD - CORNER_FS}
                                        text={corners.bottomLeft.text}
                                        fontSize={CORNER_FS} fontFamily="sans-serif"
                                        fill={corners.bottomLeft.color}
                                        listening={false}
                                    />
                                )}
                                {corners.bottomRight.enabled && corners.bottomRight.text && (
                                    <KonvaText
                                        x={CORNER_PAD} y={slideH - CORNER_PAD - CORNER_FS}
                                        width={SLIDE_W - CORNER_PAD * 2}
                                        align="right"
                                        text={corners.bottomRight.text}
                                        fontSize={CORNER_FS} fontFamily="sans-serif"
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
                            </>
                        )}

                        {/* Slide position dots */}
                        {corners?.show && corners.showDots && slidesCount > 1 && (
                            <>
                                {Array.from({ length: slidesCount }, (_, i) => {
                                    const dotR = 8;
                                    const gap = 20;
                                    const totalW = slidesCount * dotR * 2 + (slidesCount - 1) * (gap - dotR * 2);
                                    const startX = (SLIDE_W - totalW) / 2;
                                    const cx = startX + i * gap + dotR;
                                    const cy = slideH - CORNER_PAD + 8;
                                    return (
                                        <KonvaCircle
                                            key={i}
                                            x={cx} y={cy}
                                            radius={dotR}
                                            fill={i === safeIdx ? '#E8440A' : 'rgba(0,0,0,0.25)'}
                                            listening={false}
                                        />
                                    );
                                })}
                            </>
                        )}

                        {/* Safe area guide */}
                        {showSafeAreaGuide && (
                            <>
                                {safeAreaPadding.top > 0 && (
                                    <Rect x={0} y={0} width={SLIDE_W} height={safeAreaPadding.top} fill="rgba(163,230,53,0.14)" listening={false} />
                                )}
                                {safeAreaPadding.bottom > 0 && (
                                    <Rect x={0} y={slideH - safeAreaPadding.bottom} width={SLIDE_W} height={safeAreaPadding.bottom} fill="rgba(163,230,53,0.14)" listening={false} />
                                )}
                                <Rect
                                    x={safeAreaBounds.x} y={safeAreaBounds.y}
                                    width={safeAreaBounds.width} height={safeAreaBounds.height}
                                    stroke="#84cc16" strokeWidth={3} dash={[24, 14]} listening={false}
                                />
                            </>
                        )}

                        {(dragGuides.showVertical || dragGuides.showHorizontal) && (
                            <>
                                {dragGuides.showVertical && (
                                    <Rect
                                        x={SLIDE_W / 2 - 1}
                                        y={0}
                                        width={2}
                                        height={slideH}
                                        stroke={DRAG_GUIDE_STROKE}
                                        strokeWidth={2}
                                        dash={DRAG_GUIDE_DASH}
                                        listening={false}
                                    />
                                )}
                                {dragGuides.showHorizontal && (
                                    <Rect
                                        x={0}
                                        y={slideH / 2 - 1}
                                        width={SLIDE_W}
                                        height={2}
                                        stroke={DRAG_GUIDE_STROKE}
                                        strokeWidth={2}
                                        dash={DRAG_GUIDE_DASH}
                                        listening={false}
                                    />
                                )}
                            </>
                        )}

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
    );
}
