import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Konva from 'konva';
import { Group, Rect, Shape, Text, Image as KonvaImage } from 'react-konva';
import { TextEl, ImageEl, RichSpan } from './types';

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
}

interface LayoutLine {
    tokens: LayoutToken[];
    height: number;
}

let _measureCanvas: HTMLCanvasElement | null = null;
function getMeasureCtx(): CanvasRenderingContext2D {
    if (!_measureCanvas) _measureCanvas = document.createElement('canvas');
    return _measureCanvas.getContext('2d')!;
}

function layoutRichText(spans: RichSpan[], el: TextEl): LayoutLine[] {
    const ctx = getMeasureCtx();
    const fs = el.fontStyle || '';
    ctx.font = `${fs ? fs + ' ' : ''}${el.fontSize}px "${el.fontFamily}"`;
    const lineH = el.fontSize * el.lineHeight;

    // Tokenize spans into words/spaces/newlines
    const tokens: { text: string; color: string; highlight?: string; isSpace: boolean; isNewline: boolean }[] = [];
    for (const span of spans) {
        const parts = span.text.split(/(\n|\s+)/);
        for (const part of parts) {
            if (!part) continue;
            tokens.push({
                text: part,
                color: span.color ?? el.fill,
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
            lineWidth -= ctx.measureText(last.text).width + el.letterSpacing * last.text.length;
        }
        if (lineTokens.length > 0) lines.push(buildLine(lineTokens, lineWidth, ctx, el, lineH));
        lineTokens = [];
        lineWidth = 0;
    };

    for (const token of tokens) {
        if (token.isNewline) { flushLine(); continue; }
        const tw = ctx.measureText(token.text).width + el.letterSpacing * token.text.length;
        if (!token.isSpace && lineWidth + tw > el.width && lineTokens.length > 0) flushLine();
        lineTokens.push(token);
        lineWidth += tw;
    }
    flushLine();

    return lines;
}

function buildLine(
    tokens: { text: string; color: string; highlight?: string }[],
    lineWidth: number,
    ctx: CanvasRenderingContext2D,
    el: TextEl,
    lineH: number,
): LayoutLine {
    let startX = 0;
    if (el.align === 'center') startX = (el.width - lineWidth) / 2;
    else if (el.align === 'right') startX = el.width - lineWidth;

    let x = startX;
    const layoutTokens: LayoutToken[] = [];
    for (const token of tokens) {
        const tw = ctx.measureText(token.text).width + el.letterSpacing * token.text.length;
        layoutTokens.push({ text: token.text, color: token.color, highlight: token.highlight, x, width: tw });
        x += tw;
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
    onChange: (patch: Partial<TextEl>) => void;
}

export function KonvaTextEl({ el, hidden, draggable, onSelect, onDblClick, onChange }: KonvaTextElProps) {
    const textRef = useRef<Konva.Text>(null);
    const [textH, setTextH] = useState(80);

    useEffect(() => {
        if (textRef.current) {
            const h = textRef.current.height();
            if (h !== textH) setTextH(h);
        }
    });

    // Rich text layout (memoized on relevant fields)
    const layout = useMemo(
        () => (el.richText && el.richText.length > 0 ? layoutRichText(el.richText, el) : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [el.richText, el.width, el.fontSize, el.fontFamily, el.fontStyle, el.fill, el.lineHeight, el.letterSpacing, el.align],
    );
    const richTotalH = layout ? layout.reduce((s, l) => s + l.height, 0) : 0;

    const richSceneFunc = useCallback((ctx: Konva.Context) => {
        if (!layout) return;
        // Access native Canvas 2D context for advanced text rendering
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const c = (ctx as any)._context as CanvasRenderingContext2D;
        const fs = el.fontStyle || '';
        c.font = `${fs ? fs + ' ' : ''}${el.fontSize}px "${el.fontFamily}"`;
        if ('letterSpacing' in c) (c as any).letterSpacing = `${el.letterSpacing}px`;

        let curY = 0;
        for (const line of layout) {
            if (!hidden) {
                for (const token of line.tokens) {
                    if (token.highlight && token.text.trim()) {
                        const pad = Math.round(el.fontSize * 0.08);
                        c.fillStyle = token.highlight;
                        c.fillRect(token.x - pad, curY, token.width + pad * 2, el.fontSize * 1.05);
                    }
                    c.fillStyle = token.color;
                    c.fillText(token.text, token.x, curY + el.fontSize * 0.82);
                }
            }
            curY += line.height;
        }
    }, [layout, el, hidden]);

    const effectiveH = layout ? richTotalH : textH;
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
            <Group {...groupProps}>
                {accentProps && <Rect {...accentProps} fill={el.accentColor} listening={false} />}
                <Shape
                    sceneFunc={richSceneFunc}
                    width={el.width}
                    height={Math.max(richTotalH, el.fontSize)}
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
        <Group {...groupProps}>
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

export function KonvaImageEl({ el, slideW, slideH, draggable, onSelect, onChange }: KonvaImageElProps) {
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