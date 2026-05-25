import { useRef } from 'react';
import {
    Undo2, Redo2, Save, Image as ImageIcon, Loader2, Download,
    ChevronRight, ChevronUp, ChevronDown, ChevronsUp, ChevronsDown, CalendarIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format as formatFns } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { FORMATS, Format } from './types';

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
    format: Format;
    onFormatChange: (format: Format) => void;
    onExportPNG: () => void;
    instagramAccounts: InstagramAccount[];
    igPosting: boolean;
    slidesCount: number;
    publishAt: Date | undefined;
    onPublishAtChange: (date: Date | undefined) => void;
    onPublishToInstagram: () => void;
}

export function EditorToolbar({
    pastLength, futureLength, onUndo, onRedo,
    selectedId, onBringToFront, onBringForward, onSendBackward, onSendToBack,
    onImageUpload, onAddGradient,
    title, onTitleChange,
    saveStatus, onSave,
    format, onFormatChange,
    onExportPNG,
    instagramAccounts, igPosting, slidesCount, publishAt, onPublishAtChange, onPublishToInstagram,
}: EditorToolbarProps) {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-100 shrink-0">

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
                className="text-sm font-medium text-gray-700 border-b border-transparent hover:border-gray-300 focus:border-[#E8440A] focus:outline-none bg-transparent px-1 w-44 truncate"
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

            {/* Format switcher */}
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5">
                {(Object.entries(FORMATS) as [Format, typeof FORMATS[Format]][]).map(([key, fmt]) => (
                    <button key={key} onClick={() => onFormatChange(key)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${format === key ? 'bg-[#f2f2f2] text-gray-700' : 'text-gray-500 hover:text-gray-700'}`}>
                        <span
                            className={`inline-flex items-center justify-center border-2 rounded-sm shrink-0 ${format === key ? 'border-gray-500' : 'border-gray-400'}`}
                            style={{ width: key === 'post' ? 12 : 9, height: key === 'post' ? 12 : 14 }}
                        />
                        {t(`slideEditor.formats.${key}`)}
                        <span className={`text-[10px] ${format === key ? 'text-gray-500' : 'text-gray-400'}`}>{fmt.ratio}</span>
                    </button>
                ))}
            </div>

            <div className="w-px h-6 bg-gray-200 mx-1" />

            {/* Export PNG */}
            <button onClick={onExportPNG}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-[#E8440A] text-white hover:bg-[#D13D09] transition-colors">
                <Download className="w-4 h-4" /> {t('slideEditor.toolbar.exportPng')}
            </button>

            {/* Instagram */}
            {instagramAccounts.length > 0 && (
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
                                        className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium text-white bg-[#E8440A] hover:bg-[#D13D09] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
