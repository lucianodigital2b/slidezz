import { Check, ChevronDown, Download, Eye, Globe, Languages, Loader2, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
    ExportTarget,
    Localizations } from './appStore';
import {
    STORE_LOCALES,
    collectTranslatableText,
    exportTargetsFor,
    findLocale,
    localeFolder,
    storeLabel,
} from './appStore';
import type { Format, Slide } from './types';
import { storeOf } from './types';

interface LocalizationPanelProps {
    open: boolean;
    onClose: () => void;
    slides: Slide[];
    format: Format;
    localizations: Localizations;
    locales: string[];
    activeLocale: string | null;
    translating: string | null;
    error: string;
    exporting: boolean;
    exportProgress: string;
    onAddLocale: (code: string) => void;
    onRemoveLocale: (code: string) => void;
    onActivateLocale: (code: string | null) => void;
    onTranslateLocale: (code: string) => void;
    onTranslateAll: () => void;
    onEditText: (code: string, elementId: string, text: string) => void;
    onExport: (localeCodes: string[], targetIds: string[]) => void;
}

/**
 * The localization workspace for a store screenshot set: which locales the
 * listing ships in, their translated captions, and the ZIP export laid out the
 * way App Store Connect / Play Console expect (one folder per locale).
 */
export function LocalizationPanel({
    open, onClose, slides, format,
    localizations, locales, activeLocale, translating, error, exporting, exportProgress,
    onAddLocale, onRemoveLocale, onActivateLocale, onTranslateLocale, onTranslateAll, onEditText, onExport,
}: LocalizationPanelProps) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState<string | null>(null);
    const [addOpen, setAddOpen] = useState(false);

    const targets = useMemo(() => exportTargetsFor(format), [format]);
    const [selectedTargets, setSelectedTargets] = useState<string[]>([targets[0]?.id].filter(Boolean) as string[]);

    const strings = useMemo(() => collectTranslatableText(slides), [slides]);
    const store = storeOf(format);
    const available = STORE_LOCALES.filter((locale) => !locales.includes(locale.code));

    if (!open) {
        return null;
    }

    function toggleTarget(target: ExportTarget) {
        setSelectedTargets((prev) => (
            prev.includes(target.id) ? prev.filter((id) => id !== target.id) : [...prev, target.id]
        ));
    }

    const exportLocales = locales.length > 0 ? locales : ['source'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-[#1A1A1A]" />
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">{t('appScreenshots.localization.title')}</h2>
                            <p className="text-xs text-gray-500">
                                {t('appScreenshots.localization.subtitle', { store: storeLabel(format), count: strings.length })}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5">

                    {/* Source language row */}
                    <button
                        type="button"
                        onClick={() => onActivateLocale(null)}
                        className={`flex w-full items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-colors ${
                            activeLocale === null ? 'border-[#FFE156] bg-[#FFE156]/5' : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <div>
                            <p className="text-sm font-semibold text-gray-800">{t('appScreenshots.localization.sourceLabel')}</p>
                            <p className="text-xs text-gray-500">{t('appScreenshots.localization.sourceHint')}</p>
                        </div>
                        {activeLocale === null && <Check className="h-4 w-4 text-[#1A1A1A]" />}
                    </button>

                    {/* Locale list */}
                    <div className="mt-3 space-y-2">
                        {locales.map((code) => {
                            const locale = findLocale(code);
                            const entries = localizations[code] ?? {};
                            const done = strings.filter((item) => entries[item.id]?.text).length;
                            const isActive = activeLocale === code;
                            const isOpen = expanded === code;

                            return (
                                <div key={code} className={`rounded-xl border-2 transition-colors ${isActive ? 'border-[#FFE156]' : 'border-gray-200'}`}>
                                    <div className="flex items-center gap-2 px-4 py-3">
                                        <button
                                            type="button"
                                            onClick={() => setExpanded(isOpen ? null : code)}
                                            className="flex flex-1 items-center gap-3 text-left"
                                        >
                                            <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-gray-800">{locale?.label ?? code}</p>
                                                <p className="text-xs text-gray-500">
                                                    {localeFolder(code, store)} · {t('appScreenshots.localization.progress', { done, total: strings.length })}
                                                </p>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            title={t('appScreenshots.localization.preview')}
                                            onClick={() => onActivateLocale(isActive ? null : code)}
                                            className={`rounded-lg p-2 transition-colors ${isActive ? 'bg-[#FFE156] text-[#1A1A1A]' : 'text-gray-500 hover:bg-gray-100'}`}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onTranslateLocale(code)}
                                            disabled={translating !== null}
                                            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            {translating === code
                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                : <Languages className="h-3.5 w-3.5" />}
                                            {done > 0 ? t('appScreenshots.localization.retranslate') : t('appScreenshots.localization.translate')}
                                        </button>
                                        <button
                                            type="button"
                                            title={t('appScreenshots.localization.remove')}
                                            onClick={() => onRemoveLocale(code)}
                                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Per-string editing */}
                                    {isOpen && (
                                        <div className="space-y-3 border-t border-gray-100 px-4 py-3">
                                            {strings.map((item) => (
                                                <div key={item.id}>
                                                    <p className="mb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                                                        {t('appScreenshots.localization.screen', { number: item.slideIndex + 1 })} · {item.text}
                                                    </p>
                                                    <input
                                                        value={entries[item.id]?.text ?? ''}
                                                        placeholder={item.text}
                                                        onChange={(e) => onEditText(code, item.id, e.target.value)}
                                                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FFE156] focus:ring-2 focus:ring-[#FFE156]/20 focus:outline-none"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Add locale */}
                    <div className="mt-3">
                        <button
                            type="button"
                            onClick={() => setAddOpen((v) => !v)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300"
                        >
                            <Plus className="h-4 w-4" /> {t('appScreenshots.localization.addLocale')}
                        </button>

                        {addOpen && (
                            <div className="mt-2 grid max-h-56 grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border border-gray-100 p-2 sm:grid-cols-3">
                                {available.map((locale) => (
                                    <button
                                        key={locale.code}
                                        type="button"
                                        onClick={() => {
 onAddLocale(locale.code); setAddOpen(false); 
}}
                                        className="rounded-lg px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
                                    >
                                        {locale.label}
                                        <span className="block text-[10px] text-gray-400">{localeFolder(locale.code, store)}</span>
                                    </button>
                                ))}
                                {available.length === 0 && (
                                    <p className="col-span-full px-3 py-2 text-xs text-gray-400">{t('appScreenshots.localization.allAdded')}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Export sizes */}
                    <div className="mt-6">
                        <p className="mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
                            {t('appScreenshots.localization.sizesLabel')}
                        </p>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                            {targets.map((target) => (
                                <button
                                    key={target.id}
                                    type="button"
                                    onClick={() => toggleTarget(target)}
                                    className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-left text-xs font-semibold transition-colors ${
                                        selectedTargets.includes(target.id)
                                            ? 'border-[#FFE156] bg-[#FFE156]/5 text-[#1A1A1A]'
                                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                                >
                                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${
                                        selectedTargets.includes(target.id) ? 'border-[#FFE156] bg-[#FFE156]' : 'border-gray-300'
                                    }`}>
                                        {selectedTargets.includes(target.id) && <Check className="h-2.5 w-2.5 text-white" />}
                                    </span>
                                    {target.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error !== '' && (
                        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                            {t(`appScreenshots.localization.errors.${error}`, { defaultValue: t('appScreenshots.localization.errors.server_error') })}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
                    <button
                        type="button"
                        onClick={onTranslateAll}
                        disabled={translating !== null || locales.length === 0}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                    >
                        {translating !== null ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
                        {t('appScreenshots.localization.translateAll')}
                    </button>

                    <button
                        type="button"
                        onClick={() => onExport(exportLocales, selectedTargets)}
                        disabled={exporting || selectedTargets.length === 0}
                        className="flex items-center gap-2 rounded-lg bg-[#FFE156] px-5 py-2.5 text-sm font-semibold text-[#1A1A1A] transition-colors hover:bg-[#E6CB4D] disabled:opacity-50"
                    >
                        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        {exporting && exportProgress !== ''
                            ? exportProgress
                            : t('appScreenshots.localization.exportZip', { count: exportLocales.length * selectedTargets.length })}
                    </button>
                </div>
            </div>
        </div>
    );
}
