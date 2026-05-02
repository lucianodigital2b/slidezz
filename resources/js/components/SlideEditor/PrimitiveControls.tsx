import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GOOGLE_FONTS, loadGoogleFont } from '@/utils/google-fonts';

/** Elementor-style: slider + inline editable number input */
export function SliderField({
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
export function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
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
export function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
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
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</label>
            {children}
        </div>
    );
}

/** Label + toggle on same row */
export function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</span>
            <Toggle checked={checked} onChange={onChange} />
        </div>
    );
}

const VISIBLE_LIMIT = 80;

export function FontPicker({ value, onChange }: { value: string; onChange: (family: string) => void }) {
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

const POSITIONS = [
    { x: 0,   y: 0,   label: '↖' }, { x: 50,  y: 0,   label: '↑' }, { x: 100, y: 0,   label: '↗' },
    { x: 0,   y: 50,  label: '←' }, { x: 50,  y: 50,  label: '●' }, { x: 100, y: 50,  label: '→' },
    { x: 0,   y: 100, label: '↙' }, { x: 50,  y: 100, label: '↓' }, { x: 100, y: 100, label: '↘' },
];

export function PositionGrid({ x, y, onChange }: { x: number; y: number; onChange: (x: number, y: number) => void }) {
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