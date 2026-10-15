import { useRef } from 'react';
import {
    Undo2, Redo2, Save, Image as ImageIcon, Loader2, Download, LayoutTemplate, Check,
    ChevronRight, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, CalendarIcon, Bug,
    Globe, Smartphone, Film,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format as formatFns } from 'date-fns';
import { Link } from '@inertiajs/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import AppLogoIcon from '@/components/app-logo-icon';
import DashboardController from '@/actions/App/Http/Controllers/DashboardController';
import { SendToTikTokButton } from '@/components/send-to-tiktok-button';
import type { TikTokAccount, TikTokDraftStatus } from '@/components/send-to-tiktok-button';
import { FORMATS, Format, isStoreFormat as isStoreFormatKey } from './types';

/** Proportional preview box for a format, drawn from its real aspect ratio. */
function formatSwatch(format: Format): { width: number; height: number } {
    const { w, h } = FORMATS[format];
    const max = 14;

    return h >= w
        ? { width: Math.round((w / h) * max), height: max }
        : { width: max, height: Math.round((h / w) * max) };
}

interface InstagramAccount {
    id: number;
    handle: string | null;
    avatar: string | null;
    expires_at: string | null;
}

interface EditorToolbarProps {
    pastLength: number;
    futureLength: number;
    onUndo: () => void;
    onRedo: () => void;
    selectedId: string | null;
    onBringToFront: () => void;
    onBringForward: () => void;
    onSendBackward: () => void;
    onSendToBack: () => void;
    onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onAddGradient: () => void;
    title: string;
    onTitleChange: (title: string) => void;
    saveStatus: 'saved' | 'saving' | 'error';
    onSave: () => void;
    templateStatus: 'idle' | 'saving' | 'saved' | 'error';
    onSaveAsTemplate: () => void;
    format: Format;
    onFormatChange: (format: Format) => void;
    onExportPNG: () => void;
    onExportAllZip: () => void;
    onExportMetadata: () => void;
    exportingZip: boolean;
    /** True when the canvas is an App Store / Play Store screenshot format. */
    isStoreFormat: boolean;
    localeCount: number;
    activeLocale: string | null;
    onOpenLocalization: () => void;
    onExportStore: () => void;
    /** Turns the slides into a video project and opens the video editor. */
    onCreateVideo: () => void;
    creatingVideo: boolean;
    /** Renders the slides to MP4 and downloads it. */
    onDownloadMp4: () => void;
    /** Render progress (0-100) while the MP4 is being made, null when idle. */
    mp4Progress: number | null;
    instagramAccounts: InstagramAccount[];
    igEnabled: boolean;
    igPosting: boolean;
    slidesCount: number;
    publishAt: Date | undefined;
    onPublishAtChange: (date: Date | undefined) => void;
    onPublishToInstagram: () => void;
    tiktokAccounts: TikTokAccount[];
    onSendToTikTok: (accountId: number) => Promise<TikTokDraftStatus>;
}

export function EditorToolbar({
    pastLength, futureLength, onUndo, onRedo,
    selectedId, onBringToFront, onBringForward, onSendBackward, onSendToBack,
    onImageUpload, onAddGradient,
    title, onTitleChange,
    saveStatus, onSave,
    templateStatus, onSaveAsTemplate,
    format, onFormatChange,
    onExportPNG, onExportAllZip, onExportMetadata, exportingZip,
    isStoreFormat, localeCount, activeLocale, onOpenLocalization, onExportStore, onCreateVideo, creatingVideo, onDownloadMp4, mp4Progress,
    instagramAccounts, igEnabled, igPosting, slidesCount, publishAt, onPublishAtChange, onPublishToInstagram,
    tiktokAccounts, onSendToTikTok,
}: EditorToolbarProps) {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-100 shrink-0">

            {/* Logo / home link */}
            <Link href={DashboardController.index().url} className="flex items-center gap-1.5 mr-1 shrink-0 group">
                <div className="flex size-7 items-center justify-center rounded-md bg-[#FFE156] text-[#1A1A1A] group-hover:bg-[#E6CB4D] transition-colors">
                    <AppLogoIcon className="size-4 fill-current" />
                </div>
                <span className="text-sm font-semibold text-gray-800 leading-tight">Slidezz</span>
            </Link>

            <div className="w-px h-6 bg-gray-200 mx-1" />

            {/* Undo / Redo */}
            <div className="flex items-center gap-1">
                <button title="Undo (Ctrl+Z)" onClick={onUndo} disabled={pastLength === 0}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                    <Undo2 className="w-4 h-4" />
                </button>
                <button title="Redo (Ctrl+Y)" onClick={onRedo} disabled={futureLength === 0}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                    <Redo2 className="w-4 h-4" />
                </button>
            </div>

            <div className="w-px h-6 bg-gray-200 mx-1" />

            {/* Layer controls */}
            {selectedId && (
                <>
                    <div className="flex items-center gap-1">
                        <button title={t('slideEditor.actions.bringToFront')} onClick={onBringToFront} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"><ChevronsUp className="w-4 h-4" /></button>
                        <button title={t('slideEditor.actions.bringForward')} onClick={onBringForward} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"><ChevronUp className="w-4 h-4" /></button>
                        <button title={t('slideEditor.actions.sendBackward')} onClick={onSendBackward} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"><ChevronDown className="w-4 h-4" /></button>
                        <button title={t('slideEditor.actions.sendToBack')} onClick={onSendToBack} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"><ChevronsDown className="w-4 h-4" /></button>
                    </div>
                    <div className="w-px h-6 bg-gray-200 mx-1" />
                </>
            )}

            {/* Image upload */}
            <button title={t('slideEditor.toolbar.image')} onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                <ImageIcon className="w-4 h-4" /> {t('slideEditor.toolbar.image')}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onImageUpload} />

            {/* Gradient */}
            <button title={t('slideEditor.toolbar.gradient')} onClick={onAddGradient}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0" aria-hidden="true">
                    <defs>
                        <linearGradient id="grad-btn" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="currentColor" stopOpacity="0" />
                            <stop offset="1" stopColor="currentColor" stopOpacity="1" />
                        </linearGradient>
                    </defs>
                    <rect x="1" y="1" width="14" height="14" rx="2" fill="url(#grad-btn)" />
                </svg>
                {t('slideEditor.toolbar.gradient')}
            </button>

            <div className="w-px h-6 bg-gray-200 mx-1" />

            {/* Title */}
            <input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                className="text-sm font-medium text-gray-700 border-b border-transparent hover:border-gray-300 focus:border-[#FFE156] focus:outline-none bg-transparent px-1 w-44 truncate"
            />

            <div className="flex-1" />

            {/* Save status */}
            <span className="text-[11px] text-gray-400 select-none">
                {saveStatus === 'saving'
                    ? t('slideEditor.toolbar.saving')
                    : saveStatus === 'error'
                    ? t('slideEditor.toolbar.saveError')
                    : t('slideEditor.toolbar.saved')}
            </span>

            {/* Save button */}
            <button onClick={onSave}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                <Save className="w-4 h-4" /> {t('slideEditor.toolbar.save')}
            </button>

            {/* Save as template button */}
            <button onClick={onSaveAsTemplate} disabled={templateStatus === 'saving'}
                title={t('slideEditor.toolbar.saveAsTemplate')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition-colors">
                {templateStatus === 'saving'
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : templateStatus === 'saved'
                    ? <Check className="w-4 h-4 text-green-600" />
                    : <LayoutTemplate className="w-4 h-4" />}
                <span className="hidden lg:inline">
                    {templateStatus === 'saved' ? t('slideEditor.toolbar.templateSaved') : t('slideEditor.toolbar.saveAsTemplate')}
                </span>
            </button>

            {/* Format switcher — social formats plus the store screenshot canvases */}
            <Popover>
                <PopoverTrigger asChild>
                    <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50">
                        <span
                            className="inline-flex shrink-0 items-center justify-center rounded-sm border-2 border-gray-500"
                            style={formatSwatch(format)}
                        />
                        {t(`slideEditor.formats.${format}`)}
                        <span className="text-[10px] text-gray-400">{FORMATS[format].ratio}</span>
                        <ChevronDown className="h-3 w-3 text-gray-400" />
                    </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-60 p-1">
                    {(Object.keys(FORMATS) as Format[]).map((key, index) => (
                        <div key={key}>
                            {index === 2 && (
                                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                                    {t('slideEditor.formats.storeGroup')}
                                </p>
                            )}
                            <button
                                onClick={() => onFormatChange(key)}
                                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-gray-100 ${format === key ? 'text-gray-900' : 'text-gray-600'}`}
                            >
                                <span
                                    className={`inline-flex shrink-0 items-center justify-center rounded-sm border-2 ${format === key ? 'border-gray-700' : 'border-gray-400'}`}
                                    style={formatSwatch(key)}
                                />
                                <span className="flex-1 text-left">{t(`slideEditor.formats.${key}`)}</span>
                                <span className="text-[10px] text-gray-400">{FORMATS[key].ratio}</span>
                                {format === key && <Check className="h-3.5 w-3.5 text-gray-700" />}
                            </button>
                        </div>
                    ))}
                </PopoverContent>
            </Popover>

            {/* Locales — store formats ship one screenshot set per language */}
            {isStoreFormatKey(format) && (
                <button
                    onClick={onOpenLocalization}
                    title={t('appScreenshots.localization.title')}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        activeLocale ? 'border-[#FFE156] bg-[#FFE156]/10 text-[#1A1A1A]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    <Globe className="h-4 w-4" />
                    <span className="hidden lg:inline">{activeLocale ?? t('appScreenshots.localization.short')}</span>
                    {localeCount > 0 && (
                        <span className="rounded-full bg-gray-100 px-1.5 text-[10px] font-semibold text-gray-600">{localeCount}</span>
                    )}
                </button>
            )}

            <div className="w-px h-6 bg-gray-200 mx-1" />

            {/* Export */}
            <Popover>
                <PopoverTrigger asChild>
                    <button
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-[#FFE156] text-[#1A1A1A] hover:bg-[#E6CB4D] transition-colors disabled:opacity-60"
                        disabled={exportingZip}>
                        {exportingZip || mp4Progress !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        {t('slideEditor.toolbar.export')}
                    </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-1">
                    <button
                        onClick={onExportPNG}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                        <Download className="w-4 h-4 shrink-0" /> {t('slideEditor.toolbar.exportCurrentPng')}
                    </button>
                    <button
                        onClick={onExportAllZip}
                        disabled={exportingZip || slidesCount === 0}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50">
                        {exportingZip ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <Download className="w-4 h-4 shrink-0" />}
                        {t('slideEditor.toolbar.exportAllZip', { count: slidesCount })}
                    </button>
                    {!isStoreFormat && (
                        <button
                            onClick={onCreateVideo}
                            disabled={creatingVideo || slidesCount === 0}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50">
                            {creatingVideo ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <Film className="w-4 h-4 shrink-0" />}
                            {t('slideEditor.toolbar.createVideo')}
                        </button>
                    )}
                    {!isStoreFormat && (
                        <button
                            onClick={onDownloadMp4}
                            disabled={mp4Progress !== null || slidesCount === 0}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50">
                            {mp4Progress !== null ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <Film className="w-4 h-4 shrink-0" />}
                            {mp4Progress !== null
                                ? t('slideEditor.toolbar.renderingMp4', { progress: mp4Progress })
                                : t('slideEditor.toolbar.downloadMp4')}
                        </button>
                    )}
                    {isStoreFormat && (
                        <button
                            onClick={onExportStore}
                            disabled={slidesCount === 0}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50">
                            <Smartphone className="w-4 h-4 shrink-0" /> {t('appScreenshots.localization.exportStoreMenu')}
                        </button>
                    )}
                    {import.meta.env.DEV && (
                        <>
                            <div className="my-1 h-px bg-gray-100" />
                            <button
                                onClick={onExportMetadata}
                                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 transition-colors">
                                <Bug className="w-4 h-4 shrink-0" /> {t('slideEditor.toolbar.exportMetadata')}
                            </button>
                        </>
                    )}
                </PopoverContent>
            </Popover>

            {/* TikTok (photo draft in the creator's inbox) */}
            {!isStoreFormat && (
                <SendToTikTokButton
                    accounts={tiktokAccounts}
                    send={onSendToTikTok}
                    disabled={slidesCount === 0 || slidesCount > 35}
                    className="py-1 text-xs"
                />
            )}

            {/* Instagram */}
            {igEnabled && instagramAccounts.length > 0 && (
                <>
                    <div className="w-px h-6 bg-gray-200 mx-1" />
                    <TooltipProvider delayDuration={200}>
                        <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-0.5 bg-white">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${publishAt ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                                        <CalendarIcon className="w-3.5 h-3.5" />
                                        {publishAt ? formatFns(publishAt, 'MMM d, h:mm a') : 'Schedule'}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar
                                        mode="single"
                                        selected={publishAt}
                                        onSelect={(date) => {
                                            if (date) {
                                                const newDate = new Date(date);
                                                if (publishAt) {
                                                    newDate.setHours(publishAt.getHours());
                                                    newDate.setMinutes(publishAt.getMinutes());
                                                } else {
                                                    newDate.setHours(new Date().getHours() + 1);
                                                    newDate.setMinutes(0);
                                                }
                                                onPublishAtChange(newDate);
                                            } else {
                                                onPublishAtChange(undefined);
                                            }
                                        }}
                                        initialFocus
                                        disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                                    />
                                    {publishAt && (
                                        <div className="p-3 border-t border-gray-100 flex items-center justify-between">
                                            <span className="text-xs text-gray-500">Time</span>
                                            <input
                                                type="time"
                                                value={formatFns(publishAt, 'HH:mm')}
                                                onChange={(e) => {
                                                    const [h, m] = e.target.value.split(':');
                                                    const newDate = new Date(publishAt);
                                                    newDate.setHours(parseInt(h), parseInt(m));
                                                    onPublishAtChange(newDate);
                                                }}
                                                className="text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-indigo-500"
                                            />
                                        </div>
                                    )}
                                </PopoverContent>
                            </Popover>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={onPublishToInstagram}
                                        disabled={igPosting || slidesCount < 2 || slidesCount > 10}
                                        className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium text-[#1A1A1A] bg-[#FFE156] hover:bg-[#E6CB4D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {igPosting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                        {publishAt ? 'Schedule IG' : 'Post to IG'}
                                    </button>
                                </TooltipTrigger>
                                {(slidesCount < 2 || slidesCount > 10) && (
                                    <TooltipContent>
                                        <p>Instagram carousels require between 2 and 10 slides.</p>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </div>
                    </TooltipProvider>
                </>
            )}
        </div>
    );
}
