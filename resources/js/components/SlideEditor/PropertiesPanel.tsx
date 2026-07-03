import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline, Strikethrough, ChevronDown, Check } from 'lucide-react';
import { BaseEl, SlideEl, TextEl, ShapeEl, ImageEl, GradientEl, PathEl, ButtonEl, ButtonIconPosition, Align, VAlign, Wrap, AccentSide, BorderStyle, BgSize, GradientDirection, RichSpan } from './types';
import { Section, ToggleField, Field, ColorField, SliderField, FontPicker, PositionGrid } from './PrimitiveControls';
import { preserveSingleHighlightRichText } from './utils';
import { OVERLAY_PRESETS, OverlayPreset, getOverlayLabel } from './overlays';

// ── Word Highlight helpers ────────────────────────────────────────────────────

function getHighlightedWords(text: string, richText: RichSpan[] | undefined): Map<number, string> {
    const result = new Map<number, string>();
    if (!richText || richText.length === 0) return result;
    const charColors: (string | null)[] = new Array(text.length).fill(null);
    let pos = 0;
    for (const span of richText) {
        const color = span.color ?? null;
        for (let i = 0; i < span.text.length && pos + i < charColors.length; i++) {
            charColors[pos + i] = color;
        }
        pos += span.text.length;
    }
    const wordRegex = /\S+/g;
    let wordIndex = 0;
    let m;
    while ((m = wordRegex.exec(text)) !== null) {
        const color = charColors[m.index];
        if (color) result.set(wordIndex, color);
        wordIndex++;
    }
    return result;
}

function buildRichTextFromHighlights(text: string, highlights: Map<number, string>): RichSpan[] | undefined {
    if (highlights.size === 0) return undefined;
    const spans: RichSpan[] = [];
    const pushPlain = (t: string) => {
        if (!t) return;
        const last = spans[spans.length - 1];
        if (last && !last.color) { last.text += t; } else { spans.push({ text: t }); }
    };
    const wordRegex = /\S+/g;
    let lastIndex = 0;
    let wordIndex = 0;
    let m;
    while ((m = wordRegex.exec(text)) !== null) {
        if (m.index > lastIndex) pushPlain(text.slice(lastIndex, m.index));
        const color = highlights.get(wordIndex);
        if (color) { spans.push({ text: m[0], color }); } else { pushPlain(m[0]); }
        lastIndex = m.index + m[0].length;
        wordIndex++;
    }
    if (lastIndex < text.length) pushPlain(text.slice(lastIndex));
    return spans.length > 0 ? spans : undefined;
}

const HIGHLIGHT_PRESETS = ['#FFD600', '#FF3B30', '#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#5AC8FA'];

function WordHighlightSection({ el, onChange }: { el: TextEl; onChange: (p: Partial<TextEl>) => void }) {
    const { t } = useTranslation();
    const [hlColor, setHlColor] = React.useState(HIGHLIGHT_PRESETS[0]);
    const [hexInput, setHexInput] = React.useState(HIGHLIGHT_PRESETS[0]);

    const words = React.useMemo(() => {
        const result: string[] = [];
        const regex = /\S+/g;
        let m;
        while ((m = regex.exec(el.text)) !== null) result.push(m[0]);
        return result;
    }, [el.text]);

    const highlights = React.useMemo(() => getHighlightedWords(el.text, el.richText), [el.text, el.richText]);

    const applyColor = (c: string) => { setHlColor(c); setHexInput(c); };

    const toggleWord = (wordIndex: number) => {
        const next = new Map<number, string>();
        if (!highlights.has(wordIndex)) next.set(wordIndex, hlColor);
        onChange({ richText: buildRichTextFromHighlights(el.text, next) });
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
                {words.map((word, i) => {
                    const color = highlights.get(i);
                    return (
                        <button key={i} type="button" onClick={() => toggleWord(i)}
                            className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-all"
                            style={color
                                ? { backgroundColor: color, borderColor: color, color: '#fff' }
                                : { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb', color: '#374151' }}>
                            {word}
                        </button>
                    );
                })}
            </div>

            <button type="button" onClick={() => onChange({ richText: undefined })}
                className="text-xs text-gray-400 hover:text-gray-600 self-start transition-colors">
                {t('slideEditor.actions.clearAll')}
            </button>

            <div className="grid grid-cols-4 gap-1.5">
                {HIGHLIGHT_PRESETS.map((c) => (
                    <button key={c} type="button" onClick={() => applyColor(c)}
                        className="h-8 rounded transition-all"
                        style={{ backgroundColor: c, outline: hlColor === c ? '2px solid #111' : '2px solid transparent', outlineOffset: '2px' }} />
                ))}
            </div>

            <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border border-gray-200 shrink-0" style={{ backgroundColor: hlColor }} />
                <input type="text" value={hexInput}
                    onChange={(e) => {
                        const v = e.target.value;
                        setHexInput(v);
                        if (/^#[0-9a-fA-F]{6}$/.test(v)) setHlColor(v);
                    }}
                    className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#FFE156] font-mono uppercase" />
            </div>
        </div>
    );
}

// ─── Overlay Preset Section ───────────────────────────────────────────────────

function OverlayPresetSection({ el, onChange }: { el: ImageEl; onChange: (p: Partial<ImageEl>) => void }) {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);
    const activePreset = (el.overlayPreset ?? 'none') as OverlayPreset;
    const hasOverlay = activePreset !== 'none';

    React.useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    function select(preset: OverlayPreset) {
        setOpen(false);
        if (preset === 'none') {
            onChange({ overlayPreset: 'none', overlayEnabled: false });
        } else {
            onChange({
                overlayPreset: preset,
                overlayEnabled: true,
                overlayColor: el.overlayColor || '#000000',
                overlayOpacity: el.overlayOpacity > 0 ? el.overlayOpacity : 1,
            });
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <div ref={ref} className="relative">
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded border border-gray-200 text-xs text-gray-700 hover:border-gray-300 transition-colors bg-white"
                >
                    <span className="font-medium">{getOverlayLabel(activePreset)}</span>
                    <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg shadow-2xl border border-gray-800 bg-[#1a1a1a] overflow-hidden max-h-72 overflow-y-auto">
                        {OVERLAY_PRESETS.map((opt) => (
                            <button
                                key={opt.key}
                                type="button"
                                onClick={() => select(opt.key)}
                                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors text-left ${
                                    activePreset === opt.key
                                        ? 'bg-[#3b82f6] text-white'
                                        : 'text-gray-200 hover:bg-[#2a2a2a]'
                                }`}
                            >
                                {opt.label}
                                {activePreset === opt.key && <Check className="w-3 h-3 shrink-0" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {hasOverlay && (
                <>
                    <Field label="Cor">
                        <ColorField value={el.overlayColor} onChange={(v) => onChange({ overlayColor: v })} />
                    </Field>
                    <Field label="Intensidade">
                        <SliderField value={el.overlayOpacity} onChange={(v) => onChange({ overlayOpacity: v })} min={0} max={1} step={0.01} />
                    </Field>
                </>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────

export function ShadowSection({ el, onChange }: { el: BaseEl | null; onChange: (p: Partial<BaseEl>) => void }) {
    const { t } = useTranslation();
    if (!el) return null;
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

export function PropertiesPanel({
    el,
    onChange,
    onDelete,
}: PropertiesPanelProps) {
    const { t } = useTranslation();

    const ch = <T,>(patch: Partial<T>) => onChange(patch as Partial<SlideEl>);

    const iconBtn = (active: boolean, onClick: () => void, icon: React.ReactNode, title: string) => (
        <button type="button" title={title} onClick={onClick}
            className={`p-1.5 rounded border transition-colors ${active ? 'bg-[#f2f2f2] text-gray-700 border-gray-300' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
            {icon}
        </button>
    );

    return (
        <div className="flex flex-col overflow-y-auto h-full divide-y divide-gray-100">
            <div className="px-4 py-1 flex flex-col">
                {!el && (
                    <p className="px-1 py-4 text-xs text-gray-400 text-center">
                        {t('slideEditor.properties.empty')}
                    </p>
                )}

                {/* ── Transform ─────────────────────────────────────────────── */}
                {el && (
                <Section title={t('slideEditor.sections.transform')}>
                    <div className="grid grid-cols-2 gap-2">
                        {(['x', 'y', 'width', 'height'] as const).map((k) => (
                            <Field key={k} label={t(`slideEditor.fields.${k}`)}>
                                <input type="number" value={Math.round(el[k])}
                                    onChange={(e) => onChange({ [k]: parseFloat(e.target.value) || 0 } as Partial<SlideEl>)}
                                    className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#FFE156]" />
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
                )}

                {/* ── Text ──────────────────────────────────────────────────── */}
                {el?.type === 'text' && (
                    <>
                        <Section title={t('slideEditor.sections.text')}>
                            <Field label={t('slideEditor.fields.content')}>
                                <textarea value={el.text} rows={3}
                                    onChange={(e) => {
                                        const nextText = e.target.value;
                                        const nextRichText = preserveSingleHighlightRichText(el.text, nextText, el.richText, el.fill);

                                        ch<TextEl>({ text: nextText, richText: nextRichText });
                                    }}
                                    className="w-full rounded border border-gray-200 px-2 py-1 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[#FFE156]" />
                            </Field>
                            <Field label={t('slideEditor.fields.textColor')}><ColorField value={el.fill} onChange={(v) => ch<TextEl>({ fill: v })} /></Field>
                        </Section>

                        <Section title={t('slideEditor.sections.typography')}>
                            <Field label={t('slideEditor.fields.font')}><FontPicker value={el.fontFamily} onChange={(v) => ch<TextEl>({ fontFamily: v })} /></Field>
                            <Field label={t('slideEditor.fields.size')}>
                                <SliderField value={el.fontSize} onChange={(v) => ch<TextEl>({ fontSize: v })} min={8} max={300} unit="px" />
                            </Field>
                            <div className="flex gap-1.5 flex-wrap">
                                {iconBtn((el.fontStyle ?? '').includes('bold'), () => ch<TextEl>({ fontStyle: (el.fontStyle ?? '').includes('bold') ? (el.fontStyle ?? '').replace('bold', '').trim() : `${el.fontStyle ?? ''} bold`.trim() }), <Bold className="w-3.5 h-3.5" />, t('slideEditor.fields.bold'))}
                                {iconBtn((el.fontStyle ?? '').includes('italic'), () => ch<TextEl>({ fontStyle: (el.fontStyle ?? '').includes('italic') ? (el.fontStyle ?? '').replace('italic', '').trim() : `${el.fontStyle ?? ''} italic`.trim() }), <Italic className="w-3.5 h-3.5" />, t('slideEditor.fields.italic'))}
                                {iconBtn((el.textDecoration ?? '').includes('underline'), () => ch<TextEl>({ textDecoration: (el.textDecoration ?? '').includes('underline') ? (el.textDecoration ?? '').replace('underline', '').trim() : `${el.textDecoration ?? ''} underline`.trim() }), <Underline className="w-3.5 h-3.5" />, t('slideEditor.fields.underline'))}
                                {iconBtn((el.textDecoration ?? '').includes('line-through'), () => ch<TextEl>({ textDecoration: (el.textDecoration ?? '').includes('line-through') ? (el.textDecoration ?? '').replace('line-through', '').trim() : `${el.textDecoration ?? ''} line-through`.trim() }), <Strikethrough className="w-3.5 h-3.5" />, t('slideEditor.fields.strikethrough'))}
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
                                    className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#FFE156]">
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

                        <Section title={t('slideEditor.sections.wordHighlight')} defaultOpen={false}>
                            <WordHighlightSection el={el} onChange={(p) => ch<TextEl>(p)} />
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
                                                    className={`py-1.5 rounded border text-[10px] font-medium transition-colors ${el.accentSide === side ? 'bg-[#f2f2f2] text-gray-700 border-gray-300' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
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
                {(el?.type === 'rect' || el?.type === 'circle') && (
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

                {/* ── Path (custom shapes) ──────────────────────────────────── */}
                {el?.type === 'path' && (
                    <>
                        <Section title={t('slideEditor.sections.fill')}>
                            <Field label={t('slideEditor.fields.color')}>
                                <ColorField value={el.fill === 'none' ? '#000000' : el.fill} onChange={(v) => ch<PathEl>({ fill: v })} />
                            </Field>
                        </Section>

                        <Section title={t('slideEditor.sections.border')}>
                            <Field label={t('slideEditor.fields.color')}><ColorField value={el.stroke === 'none' ? '#000000' : el.stroke} onChange={(v) => ch<PathEl>({ stroke: v })} /></Field>
                            <Field label={t('slideEditor.fields.thickness')}>
                                <SliderField value={el.strokeWidth} onChange={(v) => ch<PathEl>({ strokeWidth: v })} min={0} max={60} />
                            </Field>
                            <Field label={t('slideEditor.fields.borderStyle')}>
                                <div className="flex gap-1">
                                    {(['solid', 'dashed', 'dotted'] as BorderStyle[]).map((s) =>
                                        iconBtn(el.borderStyle === s, () => ch<PathEl>({ borderStyle: s, dashEnabled: s !== 'solid' }),
                                            <span className="text-[9px] font-bold uppercase">{s[0]}</span>, s)
                                    )}
                                </div>
                            </Field>
                        </Section>
                    </>
                )}

                {/* ── Image ─────────────────────────────────────────────────── */}
                {el?.type === 'image' && (
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
                                                    className={`flex-1 py-1 rounded border text-[10px] font-medium uppercase tracking-wide transition-colors ${el.bgSize === s ? 'bg-[#f2f2f2] text-gray-700 border-gray-300' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
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
                            <OverlayPresetSection el={el} onChange={(p) => ch<ImageEl>(p)} />
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
                {el?.type === 'gradient' && (
                    <Section title={t('slideEditor.sections.gradient')}>
                        <Field label={t('slideEditor.fields.color')}>
                            <ColorField value={el.color} onChange={(v) => ch<GradientEl>({ color: v })} />
                        </Field>
                        <Field label={t('slideEditor.fields.gradientDirection')}>
                            <div className="grid grid-cols-4 gap-1">
                                {(['bottom', 'top', 'left', 'right'] as GradientDirection[]).map((dir) => (
                                    <button key={dir} type="button"
                                        onClick={() => ch<GradientEl>({ direction: dir })}
                                        className={`py-1.5 rounded border text-[10px] font-medium transition-colors ${el.direction === dir ? 'bg-[#f2f2f2] text-gray-700 border-gray-300' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                        {t(`slideEditor.gradientDirections.${dir}`)}
                                    </button>
                                ))}
                            </div>
                        </Field>
                    </Section>
                )}

                {/* ── Button ───────────────────────────────────────────────── */}
                {el?.type === 'button' && (
                    <>
                        <Section title={t('slideEditor.sections.button')}>
                            <Field label={t('slideEditor.fields.content')}>
                                <input
                                    type="text"
                                    value={el.text}
                                    onChange={(e) => ch<ButtonEl>({ text: e.target.value })}
                                    className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#FFE156]"
                                />
                            </Field>
                            <Field label={t('slideEditor.fields.stylePreset')}>
                                <div className="grid grid-cols-2 gap-1">
                                    {([
                                        { key: 'filled',   label: t('slideEditor.buttonStyles.filled'),   apply: () => ch<ButtonEl>({ bgEnabled: true,  bgOpacity: 1,    strokeWidth: 0 }) },
                                        { key: 'outlined', label: t('slideEditor.buttonStyles.outlined'), apply: () => ch<ButtonEl>({ bgEnabled: false, bgOpacity: 1,    strokeWidth: 4 }) },
                                        { key: 'ghost',    label: t('slideEditor.buttonStyles.ghost'),    apply: () => ch<ButtonEl>({ bgEnabled: false, bgOpacity: 1,    strokeWidth: 0 }) },
                                        { key: 'glass',    label: t('slideEditor.buttonStyles.glass'),    apply: () => ch<ButtonEl>({ bgEnabled: true,  bgOpacity: 1, bgColor: '#f2f2f2', stroke: '#d9d9d9', strokeWidth: 2, cornerRadius: 16, fill: '#111111' }) },
                                    ] as const).map(({ key, label, apply }) => (
                                        <button key={key} type="button" onClick={apply}
                                            className="py-1.5 rounded border text-[10px] font-semibold uppercase tracking-wide transition-colors border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-[#f2f2f2] hover:text-gray-700">
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </Field>
                        </Section>

                        <Section title={t('slideEditor.sections.typography')}>
                            <Field label={t('slideEditor.fields.font')}><FontPicker value={el.fontFamily} onChange={(v) => ch<ButtonEl>({ fontFamily: v })} /></Field>
                            <Field label={t('slideEditor.fields.size')}>
                                <SliderField value={el.fontSize} onChange={(v) => ch<ButtonEl>({ fontSize: v })} min={12} max={200} unit="px" />
                            </Field>
                            <div className="flex gap-1.5">
                                {iconBtn((el.fontStyle ?? '').includes('bold'), () => ch<ButtonEl>({ fontStyle: (el.fontStyle ?? '').includes('bold') ? (el.fontStyle ?? '').replace('bold', '').trim() : `${el.fontStyle ?? ''} bold`.trim() }), <Bold className="w-3.5 h-3.5" />, t('slideEditor.fields.bold'))}
                                {iconBtn((el.fontStyle ?? '').includes('italic'), () => ch<ButtonEl>({ fontStyle: (el.fontStyle ?? '').includes('italic') ? (el.fontStyle ?? '').replace('italic', '').trim() : `${el.fontStyle ?? ''} italic`.trim() }), <Italic className="w-3.5 h-3.5" />, t('slideEditor.fields.italic'))}
                            </div>
                            <Field label={t('slideEditor.fields.alignH')}>
                                <div className="flex gap-1">
                                    {(['left', 'center', 'right'] as Align[]).map((a) => {
                                        const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight;
                                        return iconBtn(el.align === a, () => ch<ButtonEl>({ align: a }), <Icon className="w-3.5 h-3.5" />, a);
                                    })}
                                </div>
                            </Field>
                            <Field label={t('slideEditor.fields.letterSpacing')}>
                                <SliderField value={el.letterSpacing} onChange={(v) => ch<ButtonEl>({ letterSpacing: v })} min={-10} max={50} step={0.5} unit="px" />
                            </Field>
                        </Section>

                        <Section title={t('slideEditor.sections.fill')}>
                            <Field label={t('slideEditor.fields.textColor')}><ColorField value={el.fill} onChange={(v) => ch<ButtonEl>({ fill: v })} /></Field>
                            <ToggleField label={t('slideEditor.fields.bgEnabled')} checked={el.bgEnabled} onChange={(v) => ch<ButtonEl>({ bgEnabled: v })} />
                            {el.bgEnabled && (
                                <>
                                    <Field label={t('slideEditor.fields.bgColor')}><ColorField value={el.bgColor} onChange={(v) => ch<ButtonEl>({ bgColor: v })} /></Field>
                                    <Field label={t('slideEditor.fields.opacity')}>
                                        <SliderField value={el.bgOpacity} onChange={(v) => ch<ButtonEl>({ bgOpacity: v })} min={0} max={1} step={0.01} />
                                    </Field>
                                </>
                            )}
                        </Section>

                        <Section title={t('slideEditor.sections.border')}>
                            <Field label={t('slideEditor.fields.color')}><ColorField value={el.stroke} onChange={(v) => ch<ButtonEl>({ stroke: v })} /></Field>
                            <Field label={t('slideEditor.fields.thickness')}>
                                <SliderField value={el.strokeWidth} onChange={(v) => ch<ButtonEl>({ strokeWidth: v })} min={0} max={30} />
                            </Field>
                            <Field label={t('slideEditor.fields.cornerRadius')}>
                                <SliderField value={el.cornerRadius} onChange={(v) => ch<ButtonEl>({ cornerRadius: v })} min={0} max={300} />
                            </Field>
                            <Field label={t('slideEditor.fields.borderStyle')}>
                                <div className="flex gap-1">
                                    {(['solid', 'dashed', 'dotted'] as BorderStyle[]).map((s) =>
                                        iconBtn(el.borderStyle === s, () => ch<ButtonEl>({ borderStyle: s, dashEnabled: s !== 'solid' }),
                                            <span className="text-[9px] font-bold uppercase">{s[0]}</span>, s)
                                    )}
                                </div>
                            </Field>
                        </Section>

                        <Section title={t('slideEditor.sections.buttonSpacing')}>
                            <Field label={t('slideEditor.fields.paddingX')}>
                                <SliderField value={el.paddingX} onChange={(v) => ch<ButtonEl>({ paddingX: v })} min={0} max={300} />
                            </Field>
                            <Field label={t('slideEditor.fields.paddingY')}>
                                <SliderField value={el.paddingY} onChange={(v) => ch<ButtonEl>({ paddingY: v })} min={0} max={300} />
                            </Field>
                        </Section>

                        <Section title={t('slideEditor.sections.buttonIcon')} defaultOpen={false}>
                            <ToggleField label={t('slideEditor.fields.enableIcon')} checked={el.iconEnabled} onChange={(v) => ch<ButtonEl>({ iconEnabled: v })} />
                            {el.iconEnabled && (
                                <>
                                    <Field label={t('slideEditor.fields.icon')}>
                                        <input
                                            type="text"
                                            value={el.icon}
                                            onChange={(e) => ch<ButtonEl>({ icon: e.target.value })}
                                            className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#FFE156]"
                                        />
                                    </Field>
                                    <Field label={t('slideEditor.fields.iconPosition')}>
                                        <div className="flex gap-1">
                                            {(['left', 'right'] as ButtonIconPosition[]).map((pos) => (
                                                <button key={pos} type="button"
                                                    onClick={() => ch<ButtonEl>({ iconPosition: pos })}
                                                    className={`flex-1 py-1 rounded border text-[10px] font-medium transition-colors ${el.iconPosition === pos ? 'bg-[#f2f2f2] text-gray-700 border-gray-300' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                                    {pos === 'left' ? t('slideEditor.fields.iconLeft') : t('slideEditor.fields.iconRight')}
                                                </button>
                                            ))}
                                        </div>
                                    </Field>
                                </>
                            )}
                        </Section>
                    </>
                )}

                {/* ── Shadow (all types) ────────────────────────────────────── */}
                <ShadowSection el={el} onChange={(p) => onChange(p as Partial<SlideEl>)} />

            </div>

            {/* ── Delete ────────────────────────────────────────────────────── */}
            {el && (
            <div className="px-4 py-3 shrink-0">
                <button onClick={onDelete}
                    className="flex items-center gap-2 text-red-500 hover:text-red-600 text-xs font-medium transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                    {t('slideEditor.deleteElement')}
                </button>
            </div>
            )}
        </div>
    );
}
