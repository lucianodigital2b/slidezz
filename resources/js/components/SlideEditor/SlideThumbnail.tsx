import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Rect, Circle as KonvaCircle, Path as KonvaPath } from 'react-konva';
import { Slide, Format, FORMATS } from './types';
import { KonvaTextEl, KonvaImageEl, KonvaButtonEl, KonvaBadgeEl } from './KonvaElements';
import { borderStyleToDash, gradientLinearProps } from './utils';

export function SlideThumbnail({ slide, format }: { slide: Slide; format: Format }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [displayW, setDisplayW] = useState(100);
    const [displayH, setDisplayH] = useState(100);

    const fmt = FORMATS[format];
    const slideH = fmt.h;

    useEffect(() => {
        const recalc = () => {
            if (!containerRef.current) return;
            const width = containerRef.current.clientWidth;
            const scale = width / fmt.w;
            setDisplayW(width);
            setDisplayH(Math.round(fmt.h * scale));
        };
        const obs = new ResizeObserver(recalc);
        if (containerRef.current) obs.observe(containerRef.current);
        recalc();
        return () => obs.disconnect();
    }, [format, fmt.w, fmt.h]);

    const scale = displayW / fmt.w;

    return (
        <div ref={containerRef} className="w-full shrink-0 bg-gray-100 overflow-hidden flex items-center justify-center pointer-events-none" style={{ aspectRatio: `${fmt.w} / ${fmt.h}` }}>
            {displayW > 0 && (
                <Stage width={displayW} height={displayH} scaleX={scale} scaleY={scale}>
                    <Layer>
                        <Rect x={0} y={0} width={fmt.w} height={slideH} fill={slide.background} listening={false} />
                        {[...slide.elements].sort((a, b) => {
                            const aIsBg = a.type === 'image' && a.isBackground ? -1 : 0;
                            const bIsBg = b.type === 'image' && b.isBackground ? -1 : 0;
                            return aIsBg - bIsBg;
                        }).map((el) => {
                            const common = {
                                key: el.id, id: el.id,
                                listening: false,
                                shadowEnabled: el.shadowEnabled,
                                shadowColor: el.shadowColor,
                                shadowBlur: el.shadowBlur,
                                shadowOffsetX: el.shadowOffsetX,
                                shadowOffsetY: el.shadowOffsetY,
                                shadowOpacity: el.shadowOpacity,
                            };

                            if (el.type === 'text') {
                                return <KonvaTextEl key={el.id} el={el} hidden={false} draggable={false} onSelect={()=>{}} onDblClick={()=>{}} onChange={()=>{}} />;
                            }
                            if (el.type === 'rect') {
                                const dash = borderStyleToDash(el.borderStyle, el.strokeWidth);
                                return <Rect {...common} x={el.x} y={el.y} width={el.width} height={el.height} rotation={el.rotation} opacity={el.opacity} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} cornerRadius={el.cornerRadius} dash={dash.length ? dash : undefined} dashEnabled={el.dashEnabled} />;
                            }
                            if (el.type === 'circle') {
                                const dash = borderStyleToDash(el.borderStyle, el.strokeWidth);
                                return <KonvaCircle {...common} x={el.x + el.width/2} y={el.y + el.height/2} radiusX={el.width/2} radiusY={el.height/2} rotation={el.rotation} opacity={el.opacity} fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth} dash={dash.length ? dash : undefined} dashEnabled={el.dashEnabled} />;
                            }
                            if (el.type === 'image') {
                                return <KonvaImageEl key={el.id} el={el} slideW={fmt.w} slideH={slideH} draggable={false} onSelect={()=>{}} onChange={()=>{}} />;
                            }
                            if (el.type === 'gradient') {
                                const gp = gradientLinearProps(el);
                                return <Rect {...common} x={el.x} y={el.y} width={el.width} height={el.height} rotation={el.rotation} opacity={el.opacity} fillLinearGradientStartPoint={gp.start} fillLinearGradientEndPoint={gp.end} fillLinearGradientColorStops={gp.stops} />;
                            }
                            if (el.type === 'button') {
                                return <KonvaButtonEl key={el.id} el={el} draggable={false} onSelect={() => {}} onDblClick={() => {}} onChange={() => {}} />;
                            }
                            if (el.type === 'path') {
                                return (
                                    <KonvaPath {...common}
                                        x={el.x} y={el.y}
                                        data={el.data}
                                        scaleX={el.width / el.dataW}
                                        scaleY={el.height / el.dataH}
                                        rotation={el.rotation} opacity={el.opacity}
                                        fill={el.fill === 'none' ? undefined : el.fill}
                                        stroke={el.strokeWidth > 0 ? el.stroke : undefined}
                                        strokeWidth={el.strokeWidth}
                                        strokeScaleEnabled={false}
                                    />
                                );
                            }
                            return null;
                        })}
                        {slide.profileBadge && (
                            <KonvaBadgeEl badge={slide.profileBadge} slideW={fmt.w} slideH={slideH} />
                        )}
                    </Layer>
                </Stage>
            )}
        </div>
    );
}
