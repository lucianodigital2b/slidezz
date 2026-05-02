import React from 'react';
import { useTranslation } from 'react-i18next';
import { MousePointer, Trash2, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, Strikethrough } from 'lucide-react';
import { BaseEl, SlideEl, TextEl, ShapeEl, ImageEl, GradientEl, Align, VAlign, Wrap, AccentSide, BorderStyle, BgSize, GradientDirection } from './types';
import { Section, ToggleField, Field, ColorField, SliderField, FontPicker, PositionGrid } from './PrimitiveControls';

export function ShadowSection({ el, onChange }: { el: BaseEl; onChange: (p: Partial<BaseEl>) => void }) {
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

interface PropertiesPanelProps {
    el: SlideEl | null;
    onChange: (patch: Partial<SlideEl>) => void;
    onDelete: () => void;
}

export function PropertiesPanel({ el, onChange, onDelete }: PropertiesPanelProps) {
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