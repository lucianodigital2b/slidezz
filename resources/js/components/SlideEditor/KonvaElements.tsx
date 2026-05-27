import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Konva from 'konva';
import { Group, Rect, Shape, Text, Image as KonvaImage } from 'react-konva';
import { TextEl, ImageEl, ButtonEl, RichSpan, TextReadabilityStyle, ProfileBadge } from './types';
import { drawTextWithLetterSpacing, strokeTextWithLetterSpacing, getMeasureCtx, measureTextWidthWithLetterSpacing, borderStyleToDash, hexToRgba } from './utils';
import { loadGoogleFont } from '@/utils/google-fonts';
import { OverlayPreset } from './overlays';

// ─── useLoadImage ─────────────────────────────────────────────────────────────

export function useLoadImage(src: string): HTMLImageElement | null {
    const [img, setImg] = useState<HTMLImageElement | null>(null);
    useEffect(() => {
        if (!src) return;
        const image = new window.Image();
        if (!src.startsWith('data:')) {
            image.crossOrigin = 'Anonymous';
        }
        image.src = src;
        image.onload = () => setImg(image);
    }, [src]);
    return img;
}

// ─── Rich Text Layout ─────────────────────────────────────────────────────────

interface LayoutToken {
    text: string;
    color: string;
    highlight?: string;
    x: number;
    width: number;
    advanceWidth: number;
}

interface LayoutLine {
    tokens: LayoutToken[];
    height: number;
}

function layoutRichText(spans: RichSpan[], el: TextEl, defaultColor: string): LayoutLine[] {
    const ctx = getMeasureCtx();
    const fs = el.fontStyle || '';
    ctx.font = `${fs ? fs + ' ' : ''}${el.fontSize}px "${el.fontFamily}"`;
    const lineH = el.fontSize * el.lineHeight;
    const innerWidth = Math.max(10, el.width - el.padding * 2);

    // Tokenize spans into words/spaces/newlines
    const tokens: { text: string; color: string; highlight?: string; isSpace: boolean; isNewline: boolean }[] = [];
    for (const span of spans) {
        const parts = span.text.split(/(\n|\s+)/);
        for (const part of parts) {
            if (!part) continue;
            tokens.push({
                text: part,
                color: span.color ?? defaultColor,
                highlight: span.highlight,
                isNewline: part === '\n',
                isSpace: /^\s+$/.test(part) && part !== '\n',
            });
        }
    }

    const lines: LayoutLine[] = [];
    let lineTokens: typeof tokens = [];
    let lineWidth = 0;

    const flushLine = () => {
        // Trim trailing whitespace
        while (lineTokens.length > 0 && lineTokens[lineTokens.length - 1].isSpace) {
            const last = lineTokens.pop()!;
            lineWidth -= measureTextWidthWithLetterSpacing(ctx, last.text, el.letterSpacing, true);
        }
        if (lineTokens.length > 0) lines.push(buildLine(lineTokens, ctx, el, lineH));
        lineTokens = [];
        lineWidth = 0;
    };

    for (const token of tokens) {
        if (token.isNewline) { flushLine(); continue; }
        const tw = measureTextWidthWithLetterSpacing(ctx, token.text, el.letterSpacing, true);
        if (!token.isSpace && lineWidth + tw > innerWidth && lineTokens.length > 0) flushLine();
        lineTokens.push(token);
        lineWidth += tw;
    }
    flushLine();

    return lines;
}

function buildLine(
    tokens: { text: string; color: string; highlight?: string }[],
    ctx: CanvasRenderingContext2D,
    el: TextEl,
    lineH: number,
): LayoutLine {
    const innerWidth = Math.max(10, el.width - el.padding * 2);
    const tokenMetrics = tokens.map((token, index) => ({
        contentWidth: measureTextWidthWithLetterSpacing(ctx, token.text, el.letterSpacing, false),
        advanceWidth: measureTextWidthWithLetterSpacing(ctx, token.text, el.letterSpacing, index < tokens.length - 1),
    }));
    const lineWidth = tokenMetrics.reduce((sum, token) => sum + token.advanceWidth, 0);
    let startX = el.padding;
    if (el.align === 'center') startX = el.padding + (innerWidth - lineWidth) / 2;
    else if (el.align === 'right') startX = el.padding + innerWidth - lineWidth;

    let x = startX;
    const layoutTokens: LayoutToken[] = [];
    for (const [index, token] of tokens.entries()) {
        const { contentWidth, advanceWidth } = tokenMetrics[index];
        layoutTokens.push({ text: token.text, color: token.color, highlight: token.highlight, x, width: contentWidth, advanceWidth });
        x += advanceWidth;
    }
    return { tokens: layoutTokens, height: lineH };
}

// ─── KonvaTextEl ──────────────────────────────────────────────────────────────

interface KonvaTextElProps {
    el: TextEl;
    hidden: boolean;
    draggable: boolean;
    onSelect: () => void;
    onDblClick: () => void;
    onDragMove?: (e: Konva.KonvaEventObject<DragEvent>) => void;
    readability?: TextReadabilityStyle;
    onChange: (patch: Partial<TextEl>) => void;
}

export function KonvaTextEl({ el, hidden, draggable, onSelect, onDblClick, onDragMove, readability, onChange }: KonvaTextElProps) {
    const groupRef = useRef<Konva.Group>(null);
    const textRef = useRef<Konva.Text>(null);
    const [textH, setTextH] = useState(80);
    const [fontRevision, setFontRevision] = useState(0);

    useEffect(() => {
        let cancelled = false;

        loadGoogleFont(el.fontFamily).then(() => {
            if (cancelled) return;
            setFontRevision((rev) => rev + 1);
            groupRef.current?.getLayer()?.batchDraw();
        });

        return () => {
            cancelled = true;
        };
    }, [el.fontFamily]);

    useEffect(() => {
        if (textRef.current) {
            const h = textRef.current.height();
            if (h !== textH) setTextH(h);
        }
    });

    // Rich text layout (memoized on relevant fields)
    const effectiveFill = readability?.fill ?? el.fill;
    const effectiveStroke = el.strokeWidth > 0 ? el.stroke : readability?.stroke;
    const effectiveStrokeWidth = el.strokeWidth > 0 ? el.strokeWidth : readability?.strokeWidth ?? 0;
    const textShadowColor = readability?.shadowColor;
    const textShadowBlur = readability?.shadowBlur ?? 0;
    const textShadowOffsetX = readability?.shadowOffsetX ?? 0;
    const textShadowOffsetY = readability?.shadowOffsetY ?? 0;
    const textShadowOpacity = readability?.shadowOpacity ?? 0;
    const textShadowEnabled = Boolean(textShadowColor && textShadowOpacity > 0);

    const layout = useMemo(
        () => (el.richText && el.richText.length > 0 ? layoutRichText(el.richText, el, effectiveFill) : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [el.richText, el.width, el.fontSize, el.fontFamily, el.fontStyle, effectiveFill, el.lineHeight, el.letterSpacing, el.align, fontRevision],
    );
    const richTotalH = layout ? layout.reduce((s, l) => s + l.height, 0) : 0;

    const richSceneFunc = useCallback((ctx: Konva.Context) => {
        if (!layout) return;
        // Access native Canvas 2D context for advanced text rendering
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = (ctx as any)._context as CanvasRenderingContext2D;
        const fs = el.fontStyle || '';
        c.font = `${fs ? fs + ' ' : ''}${el.fontSize}px "${el.fontFamily}"`;
        c.lineJoin = 'round';
        c.strokeStyle = effectiveStroke ?? 'transparent';
        c.lineWidth = effectiveStrokeWidth;
        c.shadowColor = textShadowEnabled ? textShadowColor! : 'transparent';
        c.shadowBlur = textShadowEnabled ? textShadowBlur : 0;
        c.shadowOffsetX = textShadowEnabled ? textShadowOffsetX : 0;
        c.shadowOffsetY = textShadowEnabled ? textShadowOffsetY : 0;

        let curY = el.padding;
        for (const line of layout) {
            if (!hidden) {
                for (const token of line.tokens) {
                    if (token.highlight && token.text.trim()) {
                        const pad = Math.round(el.fontSize * 0.08);
                        c.fillStyle = token.highlight;
                        c.fillRect(token.x - pad, curY, token.width + pad * 2, el.fontSize * 1.05);
                    }
                    if (effectiveStroke && effectiveStrokeWidth > 0) {
                        strokeTextWithLetterSpacing(c, token.text, token.x, curY + el.fontSize * 0.82, el.letterSpacing);
                    }
                    c.fillStyle = token.color;
                    drawTextWithLetterSpacing(c, token.text, token.x, curY + el.fontSize * 0.82, el.letterSpacing);
                }
            }
            curY += line.height;
        }
    }, [layout, el, hidden, effectiveStroke, effectiveStrokeWidth, textShadowEnabled, textShadowColor, textShadowBlur, textShadowOffsetX, textShadowOffsetY]);

    const effectiveH = layout ? richTotalH + el.padding * 2 : textH;
    const { t, gap } = { t: el.accentThickness, gap: el.accentGap };
    const accentProps = el.accentEnabled ? (() => {
        switch (el.accentSide) {
            case 'left':   return { x: -(t + gap), y: 0,              width: t,        height: effectiveH };
            case 'right':  return { x: el.width + gap, y: 0,          width: t,        height: effectiveH };
            case 'top':    return { x: 0, y: -(t + gap),              width: el.width, height: t          };
            case 'bottom': return { x: 0, y: effectiveH + gap,        width: el.width, height: t          };
        }
    })() : null;

    const groupProps = {
        id: el.id,
        x: el.x, y: el.y, rotation: el.rotation, opacity: el.opacity,
        draggable,
        onClick: onSelect, onTap: onSelect,
        onDblClick,
        onDragMove,
        shadowEnabled: el.shadowEnabled, shadowColor: el.shadowColor,
        shadowBlur: el.shadowBlur, shadowOffsetX: el.shadowOffsetX,
        shadowOffsetY: el.shadowOffsetY, shadowOpacity: el.shadowOpacity,
        onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => onChange({ x: e.target.x(), y: e.target.y() }),
        onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
            const node = e.target;
            onChange({ x: node.x(), y: node.y(), width: Math.max(20, el.width * node.scaleX()), rotation: node.rotation() });
            node.scaleX(1); node.scaleY(1);
        },
    };

    if (layout) {
        return (
            <Group {...groupProps} ref={groupRef}>
                {accentProps && <Rect {...accentProps} fill={el.accentColor} listening={false} />}
                <Shape
                    sceneFunc={richSceneFunc}
                    width={el.width}
                    height={Math.max(richTotalH + el.padding * 2, el.fontSize + el.padding * 2)}
                    hitFunc={(ctx, shape) => {
                        ctx.beginPath();
                        ctx.rect(0, 0, shape.width(), shape.height());
                        ctx.closePath();
                        ctx.fillStrokeShape(shape);
                    }}
                />
            </Group>
        );
    }

    return (
        <Group {...groupProps} ref={groupRef}>
            {accentProps && (
                <Rect {...accentProps} fill={el.accentColor} listening={false} />
            )}
            <Text
                ref={textRef}
                key={`${el.id}-${el.fontFamily}-${fontRevision}`}
                x={0} y={0}
                width={el.width}
                text={hidden ? '' : el.text}
                fontSize={el.fontSize} fontFamily={el.fontFamily} fill={effectiveFill}
                fontStyle={el.fontStyle} align={el.align} verticalAlign={el.verticalAlign}
                lineHeight={el.lineHeight} letterSpacing={el.letterSpacing}
                textDecoration={el.textDecoration}
                stroke={effectiveStroke}
                strokeWidth={effectiveStrokeWidth}
                padding={el.padding} wrap={el.wrap}
                shadowColor={textShadowColor}
                shadowBlur={textShadowBlur}
                shadowOpacity={textShadowOpacity}
                shadowOffsetX={textShadowOffsetX}
                shadowOffsetY={textShadowOffsetY}
            />
        </Group>
    );
}

// ─── KonvaButtonEl ────────────────────────────────────────────────────────────

interface KonvaButtonElProps {
    el: ButtonEl;
    draggable: boolean;
    onSelect: () => void;
    onDblClick: () => void;
    onDragMove?: (e: Konva.KonvaEventObject<DragEvent>) => void;
    onChange: (patch: Partial<ButtonEl>) => void;
}

export function KonvaButtonEl({ el, draggable, onSelect, onDblClick, onDragMove, onChange }: KonvaButtonElProps) {
    const groupRef = useRef<Konva.Group>(null);
    const [fontRevision, setFontRevision] = useState(0);

    useEffect(() => {
        let cancelled = false;
        loadGoogleFont(el.fontFamily).then(() => {
            if (cancelled) return;
            setFontRevision((r) => r + 1);
            groupRef.current?.getLayer()?.batchDraw();
        });
        return () => { cancelled = true; };
    }, [el.fontFamily]);

    const displayText = el.iconEnabled && el.icon
        ? el.iconPosition === 'left' ? `${el.icon}  ${el.text}` : `${el.text}  ${el.icon}`
        : el.text;

    const dash = borderStyleToDash(el.borderStyle, el.strokeWidth);
    const isSoftSurfaceButton = el.bgEnabled && el.bgOpacity >= 1 && el.bgColor.toLowerCase() === '#f2f2f2';
    const strokeColor = el.strokeWidth > 0 ? el.stroke : isSoftSurfaceButton ? '#d9d9d9' : undefined;
    const strokeWidth = el.strokeWidth > 0 ? el.strokeWidth : isSoftSurfaceButton ? 1 : 0;

    return (
        <Group
            ref={groupRef}
            id={el.id}
            x={el.x} y={el.y}
            rotation={el.rotation}
            opacity={el.opacity}
            draggable={draggable}
            onClick={onSelect} onTap={onSelect}
            onDblClick={onDblClick}
            onDragMove={onDragMove}
            shadowEnabled={el.shadowEnabled} shadowColor={el.shadowColor}
            shadowBlur={el.shadowBlur} shadowOffsetX={el.shadowOffsetX}
            shadowOffsetY={el.shadowOffsetY} shadowOpacity={el.shadowOpacity}
            onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => onChange({ x: e.target.x(), y: e.target.y() })}
            onTransformEnd={(e: Konva.KonvaEventObject<Event>) => {
                const node = e.target;
                onChange({
                    x: node.x(), y: node.y(),
                    width: Math.max(40, el.width * node.scaleX()),
                    height: Math.max(20, el.height * node.scaleY()),
                    rotation: node.rotation(),
                });
                node.scaleX(1); node.scaleY(1);
            }}
        >
            <Rect
                x={0} y={0}
                width={el.width} height={el.height}
                fill={el.bgEnabled ? hexToRgba(el.bgColor, el.bgOpacity) : undefined}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                cornerRadius={el.cornerRadius}
                dash={dash.length ? dash : undefined}
                dashEnabled={el.dashEnabled}
                hitFunc={(ctx, shape) => {
                    ctx.beginPath();
                    ctx.rect(0, 0, shape.width(), shape.height());
                    ctx.closePath();
                    ctx.fillStrokeShape(shape);
                }}
            />
            <Text
                key={`${el.id}-${el.fontFamily}-${fontRevision}`}
                x={el.paddingX} y={0}
                width={Math.max(1, el.width - el.paddingX * 2)}
                height={el.height}
                text={displayText}
                fontSize={el.fontSize}
                fontFamily={el.fontFamily}
                fontStyle={el.fontStyle}
                fill={el.fill}
                align={el.align}
                verticalAlign="middle"
                letterSpacing={el.letterSpacing}
                wrap="none"
                listening={false}
            />
        </Group>
    );
}

// ─── Overlay Preset Rendering ─────────────────────────────────────────────────

function OverlayPresetLayer({ preset, color, opacity, w, h }: {
    preset: OverlayPreset;
    color: string;
    opacity: number;
    w: number;
    h: number;
}) {
    const c = (a: number) => hexToRgba(color, Math.min(1, a * opacity));
    const diagonal = Math.sqrt(w * w + h * h) / 2;

    switch (preset) {
        case 'none': return null;

        case 'dark':
            return <Rect x={0} y={0} width={w} height={h} fill={c(0.38)} listening={false} />;
        case 'dark_strong':
            return <Rect x={0} y={0} width={w} height={h} fill={c(0.65)} listening={false} />;

        case 'gradient':
            return <Rect x={0} y={0} width={w} height={h}
                fillLinearGradientStartPoint={{ x: w / 2, y: h }}
                fillLinearGradientEndPoint={{ x: w / 2, y: 0 }}
                fillLinearGradientColorStops={[0, c(0.85), 0.5, c(0.35), 0.75, c(0)]}
                listening={false} />;
        case 'gradient_strong':
            return <Rect x={0} y={0} width={w} height={h}
                fillLinearGradientStartPoint={{ x: w / 2, y: h }}
                fillLinearGradientEndPoint={{ x: w / 2, y: 0 }}
                fillLinearGradientColorStops={[0, c(0.95), 0.55, c(0.5), 0.82, c(0)]}
                listening={false} />;

        case 'vignette':
            return <Rect x={0} y={0} width={w} height={h}
                fillRadialGradientStartPoint={{ x: w / 2, y: h / 2 }}
                fillRadialGradientEndPoint={{ x: w / 2, y: h / 2 }}
                fillRadialGradientStartRadius={0}
                fillRadialGradientEndRadius={diagonal}
                fillRadialGradientColorStops={[0, c(0), 0.45, c(0.05), 0.75, c(0.55), 1, c(0.9)]}
                listening={false} />;
        case 'vignette_strong':
            return <Rect x={0} y={0} width={w} height={h}
                fillRadialGradientStartPoint={{ x: w / 2, y: h / 2 }}
                fillRadialGradientEndPoint={{ x: w / 2, y: h / 2 }}
                fillRadialGradientStartRadius={0}
                fillRadialGradientEndRadius={diagonal}
                fillRadialGradientColorStops={[0, c(0), 0.35, c(0.1), 0.65, c(0.65), 1, c(1)]}
                listening={false} />;

        case 'base':
            return <Rect x={0} y={0} width={w} height={h}
                fillLinearGradientStartPoint={{ x: w / 2, y: h }}
                fillLinearGradientEndPoint={{ x: w / 2, y: h * 0.42 }}
                fillLinearGradientColorStops={[0, c(0.75), 0.65, c(0.2), 1, c(0)]}
                listening={false} />;
        case 'base_strong':
            return <Rect x={0} y={0} width={w} height={h}
                fillLinearGradientStartPoint={{ x: w / 2, y: h }}
                fillLinearGradientEndPoint={{ x: w / 2, y: h * 0.22 }}
                fillLinearGradientColorStops={[0, c(0.9), 0.6, c(0.4), 1, c(0)]}
                listening={false} />;
        case 'base_intense':
            return <Rect x={0} y={0} width={w} height={h}
                fillLinearGradientStartPoint={{ x: w / 2, y: h }}
                fillLinearGradientEndPoint={{ x: w / 2, y: 0 }}
                fillLinearGradientColorStops={[0, c(1), 0.55, c(0.65), 0.82, c(0.15), 1, c(0)]}
                listening={false} />;

        case 'top':
            return <Rect x={0} y={0} width={w} height={h}
                fillLinearGradientStartPoint={{ x: w / 2, y: 0 }}
                fillLinearGradientEndPoint={{ x: w / 2, y: h * 0.58 }}
                fillLinearGradientColorStops={[0, c(0.75), 0.65, c(0.2), 1, c(0)]}
                listening={false} />;
        case 'top_strong':
            return <Rect x={0} y={0} width={w} height={h}
                fillLinearGradientStartPoint={{ x: w / 2, y: 0 }}
                fillLinearGradientEndPoint={{ x: w / 2, y: h * 0.78 }}
                fillLinearGradientColorStops={[0, c(0.9), 0.6, c(0.4), 1, c(0)]}
                listening={false} />;
        case 'top_intense':
            return <Rect x={0} y={0} width={w} height={h}
                fillLinearGradientStartPoint={{ x: w / 2, y: 0 }}
                fillLinearGradientEndPoint={{ x: w / 2, y: h }}
                fillLinearGradientColorStops={[0, c(1), 0.55, c(0.65), 0.82, c(0.15), 1, c(0)]}
                listening={false} />;

        case 'frame':
            return <Rect x={0} y={0} width={w} height={h}
                fillRadialGradientStartPoint={{ x: w / 2, y: h / 2 }}
                fillRadialGradientEndPoint={{ x: w / 2, y: h / 2 }}
                fillRadialGradientStartRadius={diagonal * 0.45}
                fillRadialGradientEndRadius={diagonal}
                fillRadialGradientColorStops={[0, c(0), 0.35, c(0.1), 0.75, c(0.5), 1, c(0.85)]}
                listening={false} />;
        case 'frame_strong':
            return <Rect x={0} y={0} width={w} height={h}
                fillRadialGradientStartPoint={{ x: w / 2, y: h / 2 }}
                fillRadialGradientEndPoint={{ x: w / 2, y: h / 2 }}
                fillRadialGradientStartRadius={diagonal * 0.28}
                fillRadialGradientEndRadius={diagonal}
                fillRadialGradientColorStops={[0, c(0), 0.3, c(0.15), 0.65, c(0.65), 1, c(1)]}
                listening={false} />;

        case 'left':
            return <Rect x={0} y={0} width={w} height={h}
                fillLinearGradientStartPoint={{ x: 0, y: h / 2 }}
                fillLinearGradientEndPoint={{ x: w * 0.65, y: h / 2 }}
                fillLinearGradientColorStops={[0, c(0.85), 0.6, c(0.2), 1, c(0)]}
                listening={false} />;
        case 'right':
            return <Rect x={0} y={0} width={w} height={h}
                fillLinearGradientStartPoint={{ x: w, y: h / 2 }}
                fillLinearGradientEndPoint={{ x: w * 0.35, y: h / 2 }}
                fillLinearGradientColorStops={[0, c(0.85), 0.6, c(0.2), 1, c(0)]}
                listening={false} />;

        case 'diag_bl':
            return <Rect x={0} y={0} width={w} height={h}
                fillLinearGradientStartPoint={{ x: 0, y: h }}
                fillLinearGradientEndPoint={{ x: w * 0.75, y: h * 0.25 }}
                fillLinearGradientColorStops={[0, c(0.9), 0.55, c(0.3), 1, c(0)]}
                listening={false} />;
        case 'diag_br':
            return <Rect x={0} y={0} width={w} height={h}
                fillLinearGradientStartPoint={{ x: w, y: h }}
                fillLinearGradientEndPoint={{ x: w * 0.25, y: h * 0.25 }}
                fillLinearGradientColorStops={[0, c(0.9), 0.55, c(0.3), 1, c(0)]}
                listening={false} />;
        case 'diag_tl':
            return <Rect x={0} y={0} width={w} height={h}
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: w * 0.75, y: h * 0.75 }}
                fillLinearGradientColorStops={[0, c(0.9), 0.55, c(0.3), 1, c(0)]}
                listening={false} />;
        case 'diag_tr':
            return <Rect x={0} y={0} width={w} height={h}
                fillLinearGradientStartPoint={{ x: w, y: 0 }}
                fillLinearGradientEndPoint={{ x: w * 0.25, y: h * 0.75 }}
                fillLinearGradientColorStops={[0, c(0.9), 0.55, c(0.3), 1, c(0)]}
                listening={false} />;

        default: return null;
    }
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
    onDragMove?: (e: Konva.KonvaEventObject<DragEvent>) => void;
    onChange: (patch: Partial<ImageEl>) => void;
}

export function KonvaImageEl({ el, slideW, slideH, draggable, onSelect, onDragMove, onChange }: KonvaImageElProps) {
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
            onDragMove={onDragMove}
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
            {el.overlayPreset && el.overlayPreset !== 'none'
                ? <OverlayPresetLayer
                    preset={el.overlayPreset as OverlayPreset}
                    color={el.overlayColor}
                    opacity={el.overlayOpacity}
                    w={dispW}
                    h={dispH}
                  />
                : el.overlayEnabled && (
                    <Rect
                        x={0} y={0} width={dispW} height={dispH}
                        fill={el.overlayColor}
                        opacity={el.overlayOpacity}
                        listening={false}
                    />
                )
            }
        </Group>
    );
}

// ─── KonvaBadgeEl ─────────────────────────────────────────────────────────────

const BADGE_PAD = 18;
const BADGE_GAP = 10;
const BADGE_CORNER_PAD = 50;

const VERIFIED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="rgb(0,149,246)"><path d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z" fill-rule="evenodd"/></svg>`;
const VERIFIED_DATA_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(VERIFIED_SVG)}`;

interface KonvaBadgeElProps {
    badge: ProfileBadge;
    slideW: number;
    slideH: number;
    onBadgeMove?: (x: number, y: number) => void;
}

export function KonvaBadgeEl({ badge, slideW, slideH, onBadgeMove }: KonvaBadgeElProps) {
    const img = useLoadImage(badge.photoUrl ?? '');
    const verifiedImg = useLoadImage(badge.verified ? VERIFIED_DATA_URL : '');
    const [fontReady, setFontReady] = useState(false);

    useEffect(() => {
        loadGoogleFont('Poppins').then(() => setFontReady(true)).catch(() => setFontReady(true));
    }, []);

    if (!badge.enabled) return null;

    const photoSize = badge.size;
    const photoR = photoSize / 2;
    const fontSize = Math.max(16, Math.round(photoSize * 0.36));
    const handleText = badge.handle ? `@${badge.handle}` : '';

    const measureCtx = getMeasureCtx();
    measureCtx.font = `500 ${fontSize}px ${fontReady ? '"Poppins"' : 'sans-serif'}, sans-serif`;
    // +20 buffer guards against font-fallback measurement being narrower than Poppins
    const textW = handleText ? Math.ceil(measureCtx.measureText(handleText).width) : 0;

    const verifiedSize = Math.round(fontSize * 0.95);
    const VERIFIED_GAP = 10;
    const verifiedBlockW = badge.verified ? verifiedSize + VERIFIED_GAP : 0;

    const hasAvatar = !!img;
    const avatarBlockW = hasAvatar ? photoSize + BADGE_GAP : 0;
    const contentW = avatarBlockW + textW + verifiedBlockW;
    const contentH = Math.max(hasAvatar ? photoSize : 0, fontSize);

    const containerW = contentW + BADGE_PAD * 2;
    const containerH = contentH + BADGE_PAD * 2;

    // ── Divider style — centered layout with horizontal lines ──────────────────
    if (badge.style === 'divider') {
        const iconSize = Math.round(fontSize * 1.05);
        const iconR = iconSize / 2;
        const iconTextGap = 9;
        const lineGap = 14;

        const iconBlockW = iconSize + iconTextGap;
        const divContentW = iconBlockW + textW + verifiedBlockW;
        const divTotalW = Math.round(slideW * 0.70);
        const lineW = Math.max(20, Math.round((divTotalW - divContentW - lineGap * 2) / 2));
        const totalW = lineW * 2 + lineGap * 2 + divContentW;
        const padV = 5;
        const divH = Math.max(iconSize, fontSize) + padV * 2;
        const midY = Math.round(divH / 2);

        const dbx = badge.x ?? Math.round((slideW - totalW) / 2);
        const dby = badge.y ?? (slideH - BADGE_CORNER_PAD - divH);

        const lineFill = 'rgba(255,255,255,0.50)';
        const iconX = lineW + lineGap;
        const divTextX = iconX + iconBlockW;
        const divTextY = midY - Math.round(fontSize / 2);
        const divIconY = midY - iconR;

        return (
            <Group
                x={dbx} y={dby}
                draggable
                onDragEnd={(e) => onBadgeMove?.(Math.round(e.target.x()), Math.round(e.target.y()))}
                onClick={(e) => { e.cancelBubble = true; }}
                onTap={(e) => { e.cancelBubble = true; }}
            >
                {/* Left line */}
                <Rect x={0} y={midY - 1} width={lineW} height={1.5} fill={lineFill} listening={false} />

                {/* Avatar (circular) or decorative ring */}
                {hasAvatar ? (
                    <Group
                        x={iconX}
                        y={divIconY}
                        clipFunc={(ctx: Konva.Context) => { ctx.arc(iconR, iconR, iconR, 0, Math.PI * 2); }}
                    >
                        <KonvaImage image={img!} width={iconSize} height={iconSize} />
                    </Group>
                ) : (
                    <Rect
                        x={iconX + iconR - 5}
                        y={midY - 5}
                        width={10} height={10}
                        cornerRadius={999}
                        fill="transparent"
                        stroke={lineFill}
                        strokeWidth={1.5}
                        listening={false}
                    />
                )}

                {/* Handle text */}
                {handleText && (
                    <Text
                        x={divTextX}
                        y={divTextY}
                        width={textW + 20}
                        text={handleText}
                        fontSize={fontSize}
                        fontFamily="Poppins"
                        fontStyle="500"
                        fill="#ffffff"
                        align="left"
                        listening={false}
                    />
                )}

                {/* Verified */}
                {badge.verified && verifiedImg && (
                    <KonvaImage
                        x={divTextX + textW + VERIFIED_GAP}
                        y={midY - Math.round(verifiedSize / 2)}
                        width={verifiedSize}
                        height={verifiedSize}
                        image={verifiedImg}
                        listening={false}
                    />
                )}

                {/* Right line */}
                <Rect
                    x={lineW + lineGap + divContentW + lineGap}
                    y={midY - 1}
                    width={lineW} height={1.5}
                    fill={lineFill}
                    listening={false}
                />
            </Group>
        );
    }

    const bx = badge.x ?? BADGE_CORNER_PAD;
    const by = badge.y ?? (slideH - BADGE_CORNER_PAD - containerH);

    const bgFill = badge.style === 'solid'
        ? 'rgba(0,0,0,0.68)'
        : badge.style === 'glass'
        ? 'rgba(255,255,255,0.18)'
        : 'transparent';

    const textFill = badge.style === 'minimal' ? '#111111' : '#ffffff';
    const cornerR = photoR + BADGE_PAD;

    const textX = BADGE_PAD + avatarBlockW;
    const textY = BADGE_PAD + Math.round((contentH - fontSize) / 2);

    return (
        <Group
            x={bx} y={by}
            draggable
            onDragEnd={(e) => onBadgeMove?.(Math.round(e.target.x()), Math.round(e.target.y()))}
            onClick={(e) => { e.cancelBubble = true; }}
            onTap={(e) => { e.cancelBubble = true; }}
        >
            {badge.style !== 'minimal' && (
                <Rect
                    x={0} y={0}
                    width={containerW} height={containerH}
                    cornerRadius={cornerR}
                    fill={bgFill}
                    stroke={badge.style === 'glass' ? 'rgba(255,255,255,0.35)' : undefined}
                    strokeWidth={badge.style === 'glass' ? 1.5 : 0}
                />
            )}

            {hasAvatar && (
                <Group
                    x={BADGE_PAD}
                    y={BADGE_PAD + Math.round((contentH - photoSize) / 2)}
                    clipFunc={(ctx: Konva.Context) => {
                        ctx.arc(photoR, photoR, photoR, 0, Math.PI * 2);
                    }}
                >
                    <KonvaImage image={img!} width={photoSize} height={photoSize} />
                </Group>
            )}

            {handleText && (
                <Text
                    x={textX}
                    y={textY}
                    width={textW}
                    text={handleText}
                    fontSize={fontSize}
                    fontFamily="Poppins"
                    fontStyle="500"
                    fill={textFill}
                    align="left"
                    listening={false}
                />
            )}

            {badge.verified && verifiedImg && (
                <KonvaImage
                    x={textX + textW + VERIFIED_GAP}
                    y={BADGE_PAD + Math.round((contentH - verifiedSize) / 2)}
                    width={verifiedSize}
                    height={verifiedSize}
                    image={verifiedImg}
                    listening={false}
                />
            )}
        </Group>
    );
}
