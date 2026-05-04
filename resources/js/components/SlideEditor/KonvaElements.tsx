import React, { useEffect, useRef, useState } from 'react';
import Konva from 'konva';
import { Group, Rect, Text, Image as KonvaImage } from 'react-konva';
import { TextEl, ImageEl } from './types';

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