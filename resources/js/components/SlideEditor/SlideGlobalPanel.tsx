import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, ChevronDown, ChevronRight, Minus, Bookmark, ArrowRight, Heart } from 'lucide-react';
import { Slide, TextEl, SlideCorners, CornerIcon } from './types';

const QUICK_PALETTES = [
    ['#F9A8D4', '#374151', '#EF4444'],
    ['#5EEAD4', '#0F172A', '#F59E0B'],
    ['#E5E7EB', '#1F2937', '#6366F1'],
    ['#FDE68A', '#92400E', '#065F46'],
    ['#BFDBFE', '#1E3A5F', '#F97316'],
    ['#D1FAE5', '#064E3B', '#DC2626'],
];

const CORNER_ICONS: { id: CornerIcon; icon: React.ReactNode }[] = [
    { id: 'none', icon: <Minus className="w-3.5 h-3.5" /> },
    { id: 'bookmark', icon: <Bookmark className="w-3.5 h-3.5" /> },
    { id: 'arrow', icon: <ArrowRight className="w-3.5 h-3.5" /> },
    { id: 'heart', icon: <Heart className="w-3.5 h-3.5" /> },
];

function makeDefaultCorners(): SlideCorners {
    return {
        topLeft:     { text: '', enabled: false, color: '#111111' },
        topRight:    { text: '', enabled: false, color: '#111111' },
        bottomLeft:  { text: '', enabled: false, color: '#111111' },
        bottomRight: { text: '', enabled: false, color: '#111111' },
        show: true,
        showDots: false,
        bottomRightIcon: 'none',
    };
}

interface SlideGlobalPanelProps {
    slide: Slide;
    onBackgroundChange: (color: string) => void;
    onAddText: () => void;
    onSelectElement: (id: string) => void;
    onDeleteElement: (id: string) => void;
    onCornersChange: (corners: SlideCorners) => void;
    onApplyCornersToAll: (corners: SlideCorners) => void;
}

type CornerKey = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

const CORNER_T_KEYS: Record<CornerKey, string> = {
    topLeft:     'slideEditor.globalPanel.cornerTopLeft',
    topRight:    'slideEditor.globalPanel.cornerTopRight',
    bottomLeft:  'slideEditor.globalPanel.cornerBottomLeft',
    bottomRight: 'slideEditor.globalPanel.cornerBottomRight',
};

const CORNER_ORDER: CornerKey[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];

export function SlideGlobalPanel({ slide, onBackgroundChange, onAddText, onSelectElement, onDeleteElement, onCornersChange, onApplyCornersToAll }: SlideGlobalPanelProps) {
    const { t } = useTranslation();
    const textElements = slide.elements.filter((el): el is TextEl => el.type === 'text');
    const isTransparent = slide.background === 'transparent' || slide.background === '';
    const [cornersOpen, setCornersOpen] = useState(true);

    const corners = slide.corners ?? makeDefaultCorners();

    function patchCorner(key: CornerKey, patch: Partial<SlideCorners['topLeft']>) {
        onCornersChange({ ...corners, [key]: { ...corners[key], ...patch } });
    }

    function patchCorners(patch: Partial<SlideCorners>) {
        onCornersChange({ ...corners, ...patch });
    }

    function handleCornerTextChange(key: CornerKey, text: string) {
        patchCorner(key, {
            text,
            ...(text.trim() ? { enabled: true } : {}),
        });
    }

    return (
        <div className="flex flex-col gap-2.5 p-2.5 overflow-y-auto h-full bg-gray-100" style={{ scrollbarWidth: 'none' }}>

            {/* Background */}
            <div className="p-4 flex flex-col gap-3 bg-white" style={{ borderRadius: '1.35rem' }}>
                <p className="text-sm font-medium text-gray-900">{t('slideEditor.globalPanel.background')}</p>

                {/* Quick Palettes */}
                <div className="flex flex-col gap-2">
                    <p className="text-xs font-medium text-gray-400">{t('slideEditor.globalPanel.quickPalettes')}</p>
                    <div className="grid grid-cols-3 gap-1.5">
                        {QUICK_PALETTES.map((palette, i) => (
                            <button
                                key={i}
                                onClick={() => onBackgroundChange(palette[0])}
                                className="flex rounded-lg overflow-hidden hover:scale-105 transition-transform"
                                style={{ height: 22 }}
                            >
                                {palette.map((color, j) => (
                                    <div key={j} className="flex-1" style={{ backgroundColor: color }} />
                                ))}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Background Color */}
                <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-400">{t('slideEditor.globalPanel.bgColor')}</p>
                    <div className="flex items-center gap-2">
                        <div className="relative w-5 h-5 rounded-full overflow-hidden border border-gray-200 cursor-pointer">
                            <input
                                type="color"
                                value={isTransparent ? '#ffffff' : slide.background}
                                onChange={(e) => onBackgroundChange(e.target.value)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                style={{ width: '200%', height: '200%', top: '-50%', left: '-50%' }}
                            />
                            <div className="w-full h-full rounded-full" style={{ backgroundColor: isTransparent ? '#ffffff' : slide.background }} />
                        </div>
                        <span className="text-xs font-medium font-mono text-gray-400">
                            {isTransparent ? 'transparent' : slide.background.toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* Transparent toggle */}
                <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-400">{t('slideEditor.globalPanel.transparent')}</p>
                    <button
                        onClick={() => onBackgroundChange(isTransparent ? '#FFFFFF' : 'transparent')}
                        className={`relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${isTransparent ? 'bg-[#E8440A]' : 'bg-gray-200'}`}
                        style={{ width: 44, height: 24 }}
                    >
                        <span
                            className={`pointer-events-none inline-block rounded-full bg-white shadow transition-transform duration-200 ${isTransparent ? 'translate-x-5' : 'translate-x-0'}`}
                            style={{ width: 20, height: 20, margin: 2 }}
                        />
                    </button>
                </div>
            </div>

            {/* Text */}
            <div className="p-4 flex flex-col gap-2.5 bg-white" style={{ borderRadius: '1.35rem' }}>
                <p className="text-sm font-medium text-gray-900">{t('slideEditor.globalPanel.text')}</p>

                {/* Add text badge */}
                <button
                    onClick={onAddText}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-left bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-gray-200">
                        <span className="text-gray-700 text-sm font-bold leading-none">T</span>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-900">{t('slideEditor.globalPanel.addTextLayer')}</p>
                        <p className="text-[10px] font-medium text-gray-400">{t('slideEditor.globalPanel.addTextLayerHint')}</p>
                    </div>
                </button>

                {/* Text Layers */}
                {textElements.length > 0 && (
                    <div className="flex flex-col gap-0.5">
                        <p className="text-xs mb-1 font-medium text-gray-400">{t('slideEditor.globalPanel.textLayers')}</p>
                        {textElements.map((el) => (
                            <div
                                key={el.id}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-pointer group hover:bg-gray-50 transition-colors"
                                onClick={() => onSelectElement(el.id)}
                            >
                                <div className="w-6 h-6 rounded flex items-center justify-center shrink-0 bg-gray-100">
                                    <span className="text-gray-600 text-[10px] font-bold leading-none">T</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-900 truncate leading-tight">{el.text || t('slideEditor.globalPanel.text')}</p>
                                    <p className="text-[10px] truncate font-medium text-gray-400">{el.fontFamily}</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteElement(el.id); }}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity shrink-0 text-gray-400 hover:text-red-500"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Cantos */}
            <div className="overflow-hidden bg-white" style={{ borderRadius: '1.35rem' }}>
                <button
                    className="w-full flex items-center justify-between px-4 py-3"
                    onClick={() => setCornersOpen((o) => !o)}
                >
                    <p className="text-sm font-medium text-gray-900">{t('slideEditor.globalPanel.corners')}</p>
                    {cornersOpen
                        ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                        : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    }
                </button>

                {cornersOpen && (
                    <div className="px-4 pb-3 flex flex-col gap-3 border-t border-gray-100">

                        {/* Corner text inputs — 2×2 grid */}
                        <div className="pt-2.5">
                            <p className="text-[10px] font-medium tracking-wider mb-2 text-gray-400">{t('slideEditor.globalPanel.cornersTexts')}</p>
                            <div className="grid grid-cols-2 gap-1.5">
                                {CORNER_ORDER.map((key) => {
                                    const cfg = corners[key];
                                    return (
                                        <div key={key} className="flex flex-col gap-1 rounded-lg p-2 bg-gray-100">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-medium tracking-wide text-gray-400">
                                                    {t(CORNER_T_KEYS[key])}
                                                </span>
                                                <button
                                                    onClick={() => patchCorner(key, { enabled: !cfg.enabled })}
                                                    className={`relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${cfg.enabled ? 'bg-[#E8440A]' : 'bg-gray-300'}`}
                                                    style={{ width: 28, height: 16 }}
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block rounded-full bg-white shadow transition-transform duration-200 ${cfg.enabled ? 'translate-x-3' : 'translate-x-0'}`}
                                                        style={{ width: 12, height: 12, margin: 2 }}
                                                    />
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={cfg.text}
                                                onChange={(e) => handleCornerTextChange(key, e.target.value)}
                                                placeholder={t('slideEditor.globalPanel.cornerPlaceholder')}
                                                className="w-full rounded text-[10px] px-1.5 py-1 outline-none bg-white border border-gray-200 focus:border-[#E8440A] text-gray-700 placeholder:text-gray-300"
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Exibir cantos */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={corners.show}
                                onChange={(e) => patchCorners({ show: e.target.checked })}
                                className="rounded accent-[#E8440A]"
                            />
                            <span className="text-xs font-medium text-gray-800">{t('slideEditor.globalPanel.showCorners')}</span>
                        </label>

                        {/* Indicadores de quantidade */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={corners.showDots}
                                onChange={(e) => patchCorners({ showDots: e.target.checked })}
                                className="rounded accent-[#E8440A]"
                            />
                            <span className="text-xs font-medium text-gray-800">{t('slideEditor.globalPanel.showDots')}</span>
                        </label>

                        <button
                            type="button"
                            onClick={() => onApplyCornersToAll(corners)}
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
                        >
                            Apply to all
                        </button>

                        {/* Icon picker */}
                        <div className="flex flex-col gap-1.5">
                            <p className="text-[9px] font-medium tracking-wider text-gray-400">
                                {t('slideEditor.globalPanel.cornerIcon')}
                            </p>
                            <div className="flex items-center gap-1.5">
                                {CORNER_ICONS.map(({ id, icon }) => (
                                    <button
                                        key={id}
                                        onClick={() => patchCorners({ bottomRightIcon: id })}
                                        className={`flex items-center justify-center rounded-lg transition-colors ${corners.bottomRightIcon === id ? 'bg-[#E8440A] text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                        style={{ width: 32, height: 32 }}
                                    >
                                        {icon}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
