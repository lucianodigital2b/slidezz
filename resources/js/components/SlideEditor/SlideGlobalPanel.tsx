import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Trash2, ChevronDown, ChevronRight, Minus, Bookmark, ArrowRight, Heart, MessageSquare, Smile, X, User } from 'lucide-react';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Slide, TextEl, SlideCorners, CornerIcon, CornerKey, ProfileBadge, BadgeStyle } from './types';

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
    caption: string;
    onCaptionChange: (caption: string) => void;
    selectedCornerId: CornerKey | null;
    onCornerSelect: (key: CornerKey) => void;
    defaultHandle: string | null;
    onProfileBadgeChange: (badge: ProfileBadge) => void;
    onApplyBadgeToAll?: (badge: ProfileBadge) => void;
}

const CORNER_T_KEYS: Record<CornerKey, string> = {
    topLeft:     'slideEditor.globalPanel.cornerTopLeft',
    topRight:    'slideEditor.globalPanel.cornerTopRight',
    bottomLeft:  'slideEditor.globalPanel.cornerBottomLeft',
    bottomRight: 'slideEditor.globalPanel.cornerBottomRight',
};

const CORNER_ORDER: CornerKey[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];

const INSTAGRAM_LIMIT = 2200;

export function SlideGlobalPanel({ slide, onBackgroundChange, onAddText, onSelectElement, onDeleteElement, onCornersChange, onApplyCornersToAll, caption, onCaptionChange, selectedCornerId, onCornerSelect, defaultHandle, onProfileBadgeChange, onApplyBadgeToAll }: SlideGlobalPanelProps) {
    const { t } = useTranslation();
    const textElements = slide.elements.filter((el): el is TextEl => el.type === 'text');
    const isTransparent = slide.background === 'transparent' || slide.background === '';
    const [cornersOpen, setCornersOpen] = useState(true);
    const [badgeOpen, setBadgeOpen] = useState(false);
    const photoInputRef = useRef<HTMLInputElement>(null);

    const corners = slide.corners ?? makeDefaultCorners();

    const BADGE_DEFAULTS: ProfileBadge = {
        enabled: false,
        style: 'solid',
        handle: defaultHandle ?? '',
        photoUrl: '',
        size: 100,
    };
    const badge = slide.profileBadge ?? BADGE_DEFAULTS;

    function patchBadge(patch: Partial<ProfileBadge>) {
        onProfileBadgeChange({ ...badge, ...patch });
    }

    function handlePhotoFile(file: File) {
        const reader = new FileReader();
        reader.onload = () => patchBadge({ photoUrl: reader.result as string });
        reader.readAsDataURL(file);
    }

    function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) { handlePhotoFile(file); }
        e.target.value = '';
    }

    async function handlePasteFromClipboard() {
        try {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                const imageType = item.types.find((t) => t.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    handlePhotoFile(new File([blob], 'badge.png', { type: imageType }));
                    break;
                }
            }
        } catch { /* clipboard unavailable */ }
    }

    // Caption modal state
    const [captionOpen, setCaptionOpen] = useState(false);
    const [localCaption, setLocalCaption] = useState('');
    const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
    const [animIn, setAnimIn] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    function openCaptionModal() {
        setLocalCaption(caption);
        setEmojiPickerOpen(false);
        setCaptionOpen(true);
        requestAnimationFrame(() => requestAnimationFrame(() => setAnimIn(true)));
    }

    function closeCaptionModal() {
        setAnimIn(false);
        setEmojiPickerOpen(false);
        setTimeout(() => setCaptionOpen(false), 220);
    }

    function saveCaptionModal() {
        onCaptionChange(localCaption);
        closeCaptionModal();
    }

    function handleEmojiClick(emojiData: EmojiClickData) {
        const ta = textareaRef.current;
        const emoji = emojiData.emoji;
        if (!ta) {
            setLocalCaption((prev) => prev + emoji);
        } else {
            const start = ta.selectionStart ?? localCaption.length;
            const end = ta.selectionEnd ?? localCaption.length;
            const next = localCaption.slice(0, start) + emoji + localCaption.slice(end);
            setLocalCaption(next);
            requestAnimationFrame(() => {
                ta.focus();
                ta.setSelectionRange(start + emoji.length, start + emoji.length);
            });
        }
        setEmojiPickerOpen(false);
    }

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

    const charsLeft = localCaption.length;
    const nearLimit = charsLeft > INSTAGRAM_LIMIT * 0.9;
    const overLimit = charsLeft > INSTAGRAM_LIMIT;

    return (
        <div className="overflow-y-auto h-full bg-gray-100" style={{ scrollbarWidth: 'thin', scrollbarColor: 'transparent transparent' }}>
        <div className="flex flex-col gap-2.5 p-2.5">

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
                                className="flex items-center justify-center gap-1 rounded-full bg-gray-100 px-2 py-1.5 hover:bg-gray-200 transition-colors"
                            >
                                {palette.map((color, j) => (
                                    <div key={j} className="rounded-full shrink-0" style={{ backgroundColor: color, width: 13, height: 13 }} />
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

            {/* Caption */}
            {/* <div className="p-4 flex flex-col gap-2.5 bg-white" style={{ borderRadius: '1.35rem' }}>
                <p className="text-sm font-medium text-gray-900">{t('slideEditor.globalPanel.caption')}</p>

                <button
                    onClick={openCaptionModal}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-left bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-gray-200">
                        <MessageSquare className="w-3.5 h-3.5 text-gray-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                        {caption ? (
                            <p className="text-xs font-medium text-gray-900 truncate leading-tight">{caption}</p>
                        ) : (
                            <>
                                <p className="text-xs font-medium text-gray-900">{t('slideEditor.globalPanel.captionEmpty')}</p>
                                <p className="text-[10px] font-medium text-gray-400">{t('slideEditor.globalPanel.captionHint')}</p>
                            </>
                        )}
                    </div>
                    {caption && (
                        <span className="text-[10px] font-medium text-[#E8440A] shrink-0">
                            {t('slideEditor.globalPanel.captionEdit')}
                        </span>
                    )}
                </button>
            </div> */}

            {/* Profile Badge */}
            <div className="overflow-hidden bg-white" style={{ borderRadius: '1.35rem' }}>
                <button
                    className="w-full flex items-center justify-between px-4 py-3"
                    onClick={() => setBadgeOpen((o) => !o)}
                >
                    <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-500" />
                        <p className="text-sm font-medium text-gray-900">{t('slideEditor.globalPanel.profileBadge')}</p>
                    </div>
                    {badgeOpen
                        ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                        : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    }
                </button>

                {badgeOpen && (
                    <div className="px-4 pb-4 flex flex-col gap-3 border-t border-gray-100">
                        <p className="text-[10px] text-gray-400 pt-2.5 leading-relaxed">{t('slideEditor.globalPanel.profileBadgeDesc')}</p>

                        {/* Show toggle */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={badge.enabled}
                                onChange={(e) => patchBadge({ enabled: e.target.checked })}
                                className="rounded accent-[#E8440A]"
                            />
                            <span className="text-xs font-medium text-gray-800">{t('slideEditor.globalPanel.profileBadgeShow')}</span>
                        </label>

                        {/* Verified toggle */}
                        <label className="flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-2">
                                <svg viewBox="0 0 40 40" fill="rgb(0,149,246)" width="13" height="13" className="shrink-0">
                                    <path d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z" fillRule="evenodd" />
                                </svg>
                                <span className="text-xs font-medium text-gray-800">{t('slideEditor.globalPanel.profileBadgeVerified')}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => patchBadge({ verified: !badge.verified })}
                                className={`relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${badge.verified ? 'bg-[#0095F6]' : 'bg-gray-200'}`}
                                style={{ width: 36, height: 20 }}
                            >
                                <span
                                    className={`pointer-events-none inline-block rounded-full bg-white shadow transition-transform duration-200 ${badge.verified ? 'translate-x-4' : 'translate-x-0'}`}
                                    style={{ width: 16, height: 16, margin: 2 }}
                                />
                            </button>
                        </label>

                        {/* Badge style pills */}
                        <div className="flex flex-col gap-1.5">
                            <p className="text-[9px] font-medium tracking-wider text-gray-400">{t('slideEditor.globalPanel.profileBadgeStyle')}</p>
                            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-full">
                                {(['glass', 'solid', 'minimal', 'divider'] as BadgeStyle[]).map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => patchBadge({ style: s })}
                                        className={`flex-1 py-1 rounded-full text-[11px] font-medium transition-all ${badge.style === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    >
                                        {t(`slideEditor.globalPanel.profileBadgeStyle${s.charAt(0).toUpperCase() + s.slice(1)}`)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Handle */}
                        <div className="flex flex-col gap-1">
                            <p className="text-[9px] font-medium tracking-wider text-gray-400">{t('slideEditor.globalPanel.profileBadgeHandle')}</p>
                            <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 focus-within:border-[#E8440A] transition-colors">
                                <span className="text-xs text-gray-400 font-medium">@</span>
                                <input
                                    type="text"
                                    value={badge.handle}
                                    onChange={(e) => patchBadge({ handle: e.target.value })}
                                    placeholder={t('slideEditor.globalPanel.profileBadgeHandlePlaceholder')}
                                    className="flex-1 text-xs outline-none text-gray-800 placeholder:text-gray-300"
                                />
                            </div>
                        </div>

                        {/* Photo */}
                        <div className="flex flex-col gap-1.5">
                            <p className="text-[9px] font-medium tracking-wider text-gray-400">{t('slideEditor.globalPanel.profileBadgePhotoHint')}</p>
                            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

                            {badge.photoUrl ? (
                                <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '1', maxHeight: 120 }}>
                                    <img src={badge.photoUrl} alt="badge" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => patchBadge({ photoUrl: '' })}
                                        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/60 text-white hover:bg-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => photoInputRef.current?.click()}
                                    className="w-full rounded-xl border-2 border-dashed border-gray-200 py-5 text-xs text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors flex flex-col items-center gap-1"
                                >
                                    <User className="w-5 h-5 text-gray-300" />
                                    {t('slideEditor.globalPanel.profileBadgePhoto')}
                                </button>
                            )}

                            <button
                                onClick={handlePasteFromClipboard}
                                className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                            >
                                <span>⌘</span>{t('slideEditor.globalPanel.profileBadgePaste')}
                            </button>
                        </div>

                        {/* Size slider */}
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <p className="text-[9px] font-medium tracking-wider text-gray-400">{t('slideEditor.globalPanel.profileBadgeSize')}</p>
                                <span className="text-[10px] font-medium text-gray-500 tabular-nums">{badge.size}</span>
                            </div>
                            <input
                                type="range"
                                min={60}
                                max={200}
                                value={badge.size}
                                onChange={(e) => patchBadge({ size: Number(e.target.value) })}
                                className="w-full accent-[#E8440A]"
                            />
                        </div>

                        {/* Apply to all */}
                        {onApplyBadgeToAll && (
                            <button
                                type="button"
                                onClick={() => onApplyBadgeToAll(badge)}
                                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
                            >
                                {t('slideEditor.globalPanel.profileBadgeApplyAll')}
                            </button>
                        )}
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
                                    const isSelected = selectedCornerId === key;
                                    return (
                                        <div
                                            key={key}
                                            onClick={() => onCornerSelect(key)}
                                            className={`flex flex-col gap-1 rounded-lg p-2 cursor-pointer transition-colors ${isSelected ? 'bg-[#E8440A]/10 ring-1 ring-[#E8440A]/40' : 'bg-gray-100 hover:bg-gray-200/70'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className={`text-[9px] font-medium tracking-wide ${isSelected ? 'text-[#E8440A]' : 'text-gray-400'}`}>
                                                    {t(CORNER_T_KEYS[key])}
                                                </span>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); patchCorner(key, { enabled: !cfg.enabled }); }}
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
                                                onClick={(e) => e.stopPropagation()}
                                                placeholder={t('slideEditor.globalPanel.cornerPlaceholder')}
                                                className={`w-full rounded text-[10px] px-1.5 py-1 outline-none bg-white border text-gray-700 placeholder:text-gray-300 ${isSelected ? 'border-[#E8440A]/40 focus:border-[#E8440A]' : 'border-gray-200 focus:border-[#E8440A]'}`}
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

            {/* Caption Modal — rendered in a portal to escape overflow:hidden */}
            {captionOpen && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                    style={{ transition: 'background-color 220ms ease', backgroundColor: animIn ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)' }}
                    onClick={closeCaptionModal}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
                        style={{
                            transition: 'opacity 220ms ease, transform 220ms ease',
                            opacity: animIn ? 1 : 0,
                            transform: animIn ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.96)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-[#E8440A]" />
                                <h2 className="text-sm font-medium text-gray-900">{t('slideEditor.globalPanel.captionModalTitle')}</h2>
                            </div>
                            <button
                                onClick={closeCaptionModal}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Editor body */}
                        <div className="px-5 pt-4 pb-5 flex flex-col gap-3">
                            <div className="relative">
                                <textarea
                                    ref={textareaRef}
                                    value={localCaption}
                                    onChange={(e) => setLocalCaption(e.target.value)}
                                    placeholder={t('slideEditor.globalPanel.captionPlaceholder')}
                                    rows={8}
                                    autoFocus
                                    className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm leading-relaxed text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#E8440A]/20 focus:border-[#E8440A] transition-colors"
                                />
                            </div>

                            {/* Toolbar row */}
                            <div className="flex items-center justify-between">
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setEmojiPickerOpen((o) => !o)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                                    >
                                        <Smile className="w-3.5 h-3.5" />
                                        Emoji
                                    </button>

                                    {emojiPickerOpen && (
                                        <div className="absolute bottom-full left-0 mb-2 z-10 shadow-xl rounded-xl overflow-hidden">
                                            <EmojiPicker
                                                onEmojiClick={handleEmojiClick}
                                                width={320}
                                                height={380}
                                                lazyLoadEmojis
                                                skinTonesDisabled
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-medium tabular-nums ${overLimit ? 'text-red-500' : nearLimit ? 'text-amber-500' : 'text-gray-400'}`}>
                                        {charsLeft} / {INSTAGRAM_LIMIT}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={saveCaptionModal}
                                        className="px-4 py-1.5 bg-[#E8440A] text-white text-xs font-medium rounded-lg hover:bg-[#d13d09] transition-colors"
                                    >
                                        {t('slideEditor.globalPanel.captionSave')}
                                    </button>
                                </div>
                            </div>

                            {nearLimit && (
                                <p className="text-[11px] font-medium text-amber-500 bg-amber-50 rounded-lg px-3 py-2">
                                    {t('slideEditor.globalPanel.captionLimitWarning')}
                                </p>
                            )}
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </div>
        </div>
    );
}
