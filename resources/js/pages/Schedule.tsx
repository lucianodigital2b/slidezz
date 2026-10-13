import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { schedule } from '@/routes';
import { destroy as destroySchedule, duplicate as duplicateSchedule, update as updateSchedule } from '@/routes/schedule';
import {
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, List, Grid,
    Plus, ChevronDown, MessageSquare, Tag, Globe, CheckCircle2, AlertCircle, XCircle, Copy, Trash2, CalendarClock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface ScheduleItem {
    id: number;
    status: string;
    publish_at: string;
    error_log: string | null;
    content_project: { id: number; title: string; video_url: string | null; caption: string; images: string[] };
    social_account: { id: number; handle: string; provider: string; avatar: string | null };
}

interface SocialAccountOption {
    id: number;
    handle: string;
    provider: string;
    avatar: string | null;
}

interface ContentProjectOption {
    id: number;
    title: string;
    type: string;
    video_url: string | null;
}

interface Props {
    schedulesByDay: Record<string, ScheduleItem[]>;
    socialAccounts: SocialAccountOption[];
    contentProjects: ContentProjectOption[];
    month: number;
    year: number;
    statuses: string[];
    counts: {
        queue: number;
        drafts: number;
        sent: number;
    };
}

const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const HOURS = [
    '12 AM', '2 AM', '4 AM', '6 AM', '8 AM', '10 AM',
    '12 PM', '2 PM', '4 PM', '6 PM', '8 PM', '10 PM'
];

// Movable = can change its date; published/publishing posts can only be duplicated.
const isMovable = (s: ScheduleItem) => s.status === 'pending' || s.status === 'failed';

// Value for <input type="datetime-local"> in the browser's timezone.
const toLocalInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function Schedule({ schedulesByDay = {}, month, year, counts, contentProjects = [], socialAccounts = [] }: Props) {
    const [view, setView] = useState<'calendar' | 'list'>('calendar');
    const [listTab, setListTab] = useState<'queue' | 'drafts' | 'sent'>('queue');
    const [calendarFilter, setCalendarFilter] = useState<'all' | 'drafts' | 'scheduled' | 'sent'>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [preview, setPreview] = useState<ScheduleItem | null>(null);
    const [copied, setCopied] = useState(false);
    const [previewAt, setPreviewAt] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [busy, setBusy] = useState(false);
    const [dragOverDay, setDragOverDay] = useState<number | null>(null);

    const openPreview = (item: ScheduleItem) => {
        setPreview(item);
        setPreviewAt(toLocalInput(new Date(item.publish_at)));
        setConfirmDelete(false);
    };

    const requestOptions = (onSuccess?: () => void) => ({
        preserveScroll: true,
        preserveState: true,
        onStart: () => setBusy(true),
        onFinish: () => setBusy(false),
        onSuccess: () => onSuccess?.(),
        onError: (errs: Record<string, string>) => {
            toast.error(Object.values(errs)[0] ?? 'Something went wrong.');
        },
    });

    // publish_at goes to the server as UTC ISO, so the local time picked is the time it posts.
    const moveTo = (item: ScheduleItem, when: Date, onSuccess?: () => void) => {
        router.patch(updateSchedule(item.id).url, { publish_at: when.toISOString() }, requestOptions(onSuccess));
    };

    const duplicateTo = (item: ScheduleItem, when: Date, onSuccess?: () => void) => {
        router.post(duplicateSchedule(item.id).url, { publish_at: when.toISOString() }, requestOptions(onSuccess));
    };

    const deleteItem = (item: ScheduleItem) => {
        router.delete(destroySchedule(item.id).url, requestOptions(() => setPreview(null)));
    };

    const handleDrop = (e: React.DragEvent, day: number) => {
        e.preventDefault();
        setDragOverDay(null);

        const id = Number(e.dataTransfer.getData('text/schedule-id'));
        const item = Object.values(schedulesByDay).flat().find((s) => s.id === id);
        if (!item) return;

        // Keep the post's time of day, change only the date.
        const original = new Date(item.publish_at);
        const when = new Date(year, month - 1, day, original.getHours(), original.getMinutes());
        const copy = e.altKey || e.ctrlKey || e.metaKey || !isMovable(item);

        if (!copy && when.getTime() === original.getTime()) return;
        if (when <= new Date()) {
            toast.error('That time has already passed. Open the post to pick a later time.');
            return;
        }

        if (copy) {
            duplicateTo(item, when);
        } else {
            moveTo(item, when);
        }
    };

    const copyCaption = async (caption: string) => {
        await navigator.clipboard.writeText(caption);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const { data, setData, post, processing, errors, reset } = useForm({
        content_project_id: '',
        social_account_id: '',
        publish_at: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(schedule.store().url, {
            onSuccess: () => {
                setIsModalOpen(false);
                reset();
            },
        });
    };

    const today = new Date();
    const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;
    const todayDay = isCurrentMonth ? today.getDate() : null;

    const navigate = (delta: number) => {
        const d = new Date(year, month - 1 + delta, 1);
        router.get(schedule.url(), { month: d.getMonth() + 1, year: d.getFullYear() }, {
            preserveState: true,
            replace: true,
        });
    };

    const goToday = () => {
        router.get(schedule.url(), { month: today.getMonth() + 1, year: today.getFullYear() }, {
            preserveState: true,
            replace: true,
        });
    };

    // Calculate days for the monthly calendar
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0 is Sunday
    const calendarDays: (number | null)[] = [];
    
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push(i);
    }
    const remainingCells = 42 - calendarDays.length;
    for (let i = 0; i < remainingCells; i++) {
        calendarDays.push(null);
    }

    return (
        <>
            <Head title="Agenda" />

            <div className="flex flex-col h-full bg-white text-gray-900 min-h-screen font-sans">
                {/* Top Navigation Bar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100">
                            <Grid className="w-4 h-4 text-gray-700" />
                        </div>
                        <h1 className="text-lg font-semibold text-gray-900">Agenda</h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                            <CheckCircle2 className="w-5 h-5" />
                        </button>
                        <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-200">
                            <button
                                onClick={() => setView('list')}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                <List className="w-4 h-4" /> List
                            </button>
                            <button
                                onClick={() => setView('calendar')}
                                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${view === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                <CalendarIcon className="w-4 h-4" /> Calendar
                            </button>
                        </div>
                        <Button className="bg-[#FFE156] hover:bg-[#E6CB4D] text-[#1A1A1A] ml-2" onClick={() => setIsModalOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" /> New Post
                        </Button>
                    </div>
                </div>

                {view === 'calendar' ? (
                    <>
                        {/* Sub Navigation Bar */}
                        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                    <button onClick={() => navigate(-1)} className="p-1 text-gray-500 hover:bg-gray-100 rounded transition-colors">
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => navigate(1)} className="p-1 text-gray-500 hover:bg-gray-100 rounded transition-colors">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                <span className="text-sm font-semibold text-gray-900">
                                    {MONTH_NAMES[month - 1]} {year}
                                </span>

                                <button onClick={goToday} className="px-3 py-1 text-sm font-medium text-gray-600 bg-white rounded-md hover:bg-gray-50 transition-colors border border-gray-200">
                                    Today
                                </button>

                                <button className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 ml-2">
                                    Week <ChevronDown className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-6 text-sm text-gray-500">
                                <select
                                    value={calendarFilter}
                                    onChange={(e) => setCalendarFilter(e.target.value as any)}
                                    className="flex items-center gap-2 bg-transparent text-gray-500 hover:text-gray-900 transition-colors cursor-pointer outline-none font-medium"
                                >
                                    <option value="all">All Posts</option>
                                    <option value="drafts">Drafts</option>
                                    <option value="scheduled">Scheduled</option>
                                    <option value="sent">Sent</option>
                                </select>
                            </div>
                        </div>

                        {/* Calendar Grid Area */}
                        <div className="flex-1 flex flex-col overflow-hidden bg-white">
                            {/* Days Header */}
                            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                    <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="flex-1 grid grid-cols-7 grid-rows-6 bg-gray-200 gap-px overflow-y-auto">
                                {calendarDays.map((day, index) => {
                                    const isToday = isCurrentMonth && day === todayDay;
                                    const daySchedules = day ? (schedulesByDay[day] || []) : [];
                                    
                                    const isPastDay = !!day && new Date(year, month - 1, day, 23, 59) < new Date();

                                    const filteredSchedules = daySchedules.filter(s => {
                                        if (calendarFilter === 'all') return true;
                                        if (calendarFilter === 'scheduled') return s.status === 'pending' || s.status === 'publishing';
                                        return s.status === calendarFilter;
                                    });

                                    return (
                                        <div
                                            key={index}
                                            onDragOver={(e) => {
                                                if (!day || isPastDay) return;
                                                e.preventDefault();
                                                e.dataTransfer.dropEffect = e.altKey || e.ctrlKey || e.metaKey ? 'copy' : 'move';
                                                if (dragOverDay !== day) setDragOverDay(day);
                                            }}
                                            onDragLeave={(e) => {
                                                if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverDay(null);
                                            }}
                                            onDrop={(e) => day && handleDrop(e, day)}
                                            className={`min-h-[100px] p-2 ${day && dragOverDay === day ? 'bg-[#FFE156]/20 ring-2 ring-inset ring-[#FFE156]' : day ? 'bg-white hover:bg-gray-50/50' : 'bg-gray-50/50'} transition-colors flex flex-col gap-1 relative group`}
                                        >
                                            {day && (
                                                <>
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-[#FFE156] text-[#1A1A1A]' : 'text-gray-700'}`}>
                                                            {day}
                                                        </span>
                                                        <button 
                                                            onClick={() => {
                                                                // Don't allow clicking past dates
                                                                const clickDate = new Date(year, month - 1, day, 12, 0);
                                                                if (clickDate < new Date() && !isToday) return;

                                                                // Pre-fill next hour for today, or 12:00 for future dates
                                                                const defaultTime = isToday 
                                                                    ? new Date(new Date().getTime() + 60 * 60 * 1000).toISOString().slice(0, 16)
                                                                    : `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00`;

                                                                setData('publish_at', defaultTime);
                                                                setIsModalOpen(true);
                                                            }}
                                                            className={`p-1 transition-opacity ${
                                                                (new Date(year, month - 1, day, 23, 59) < new Date() && !isToday)
                                                                ? 'opacity-0 cursor-not-allowed'
                                                                : 'opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#FFE156]'
                                                            }`}
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-col gap-2 overflow-y-auto flex-1 no-scrollbar pb-1 mt-1 pr-1">
                                                        {filteredSchedules.map(schedule => (
                                                            <div
                                                                key={schedule.id}
                                                                draggable={!busy}
                                                                onDragStart={(e) => {
                                                                    e.dataTransfer.setData('text/schedule-id', String(schedule.id));
                                                                    e.dataTransfer.effectAllowed = isMovable(schedule) ? 'copyMove' : 'copy';
                                                                }}
                                                                onDragEnd={() => setDragOverDay(null)}
                                                                onClick={() => openPreview(schedule)}
                                                                className={`text-xs p-1.5 rounded border flex items-center gap-1.5 truncate shadow-sm relative cursor-grab active:cursor-grabbing hover:brightness-95
                                                                    ${schedule.status === 'published' ? 'bg-green-50 border-green-200 text-green-800' : 
                                                                      schedule.status === 'failed' ? 'bg-red-50 border-red-300 text-red-800' : 
                                                                      'bg-blue-50 border-blue-200 text-blue-800'}`
                                                                }
                                                            >
                                                                {schedule.status === 'failed' && (
                                                                    <TooltipProvider delayDuration={100}>
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full z-10 shadow-sm border border-red-100 cursor-help">
                                                                                    <AlertCircle className="w-3.5 h-3.5 text-red-500" fill="currentColor" stroke="white" />
                                                                                </div>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent className="max-w-[250px] break-words text-xs bg-red-50 border-red-200 text-red-900 shadow-md">
                                                                                <div className="flex items-start gap-2">
                                                                                    <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                                                                    <div className="flex flex-col gap-1">
                                                                                        <p className="font-semibold">Publishing Failed</p>
                                                                                        <p className="text-red-800/90">{schedule.error_log || "An unknown error occurred while publishing to the platform."}</p>
                                                                                    </div>
                                                                                </div>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                )}
                                                                {schedule.social_account.provider === 'tiktok' && (
                                                                    <span className="font-bold text-black bg-white rounded-sm px-0.5 text-[10px]">♪</span>
                                                                )}
                                                                {schedule.social_account.provider === 'instagram' && (
                                                                    <span className="font-bold text-white bg-gradient-to-tr from-yellow-400 to-fuchsia-600 rounded-sm px-0.5 text-[10px]">ig</span>
                                                                )}
                                                                <span className="truncate font-medium" title={schedule.content_project.title}>
                                                                    {new Date(schedule.publish_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {schedule.content_project.title}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* List View Navigation Bar */}
                        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white">
                            <div className="flex items-center gap-6">
                                <button className={`pb-3 -mb-3 text-sm font-medium border-b-2 transition-colors ${listTab === 'queue' ? 'border-black text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'}`} onClick={() => setListTab('queue')}>
                                    Queue <span className="ml-1.5 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{counts.queue}</span>
                                </button>
                                <button className={`pb-3 -mb-3 text-sm font-medium border-b-2 transition-colors ${listTab === 'drafts' ? 'border-black text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'}`} onClick={() => setListTab('drafts')}>
                                    Drafts <span className="ml-1.5 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{counts.drafts}</span>
                                </button>
                                <button className={`pb-3 -mb-3 text-sm font-medium border-b-2 transition-colors ${listTab === 'sent' ? 'border-black text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'}`} onClick={() => setListTab('sent')}>
                                    Sent <span className="ml-1.5 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{counts.sent}</span>
                                </button>
                            </div>

                            <div className="flex items-center gap-6 text-sm text-gray-500">
                                <select
                                    value={calendarFilter}
                                    onChange={(e) => setCalendarFilter(e.target.value as any)}
                                    className="flex items-center gap-2 bg-transparent text-gray-500 hover:text-gray-900 transition-colors cursor-pointer outline-none font-medium"
                                >
                                    <option value="all">All Posts</option>
                                    <option value="drafts">Drafts</option>
                                    <option value="scheduled">Scheduled</option>
                                    <option value="sent">Sent</option>
                                </select>
                            </div>
                        </div>

                        {/* List View Empty State */}
                        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 pb-20">
                            <div className="flex flex-col items-center max-w-sm text-center">
                                {/* Stacked Cards Illustration */}
                                <div className="relative w-64 h-48 mb-8 flex justify-center">
                                    <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className={`w-56 h-16 border border-gray-200 rounded-lg bg-white shadow-sm flex items-center p-3 relative z-${10 + i}`}>
                                                <div className="flex-1 flex flex-col gap-2">
                                                    <div className="h-1.5 w-3/4 bg-gray-200 rounded-full" />
                                                    <div className="h-1.5 w-1/2 bg-gray-100 rounded-full" />
                                                </div>
                                                <div className="w-10 h-10 rounded-md bg-gray-100 ml-4" />
                                            </div>
                                        ))}
                                    </div>
                                    {/* Abstract curved arrow */}
                                    <svg className="absolute -right-4 top-1/4 w-12 h-32 text-gray-300" fill="none" viewBox="0 0 48 128" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M24 8L32 0L40 8M32 0v64c0 17.673-14.327 32-32 32" />
                                    </svg>
                                </div>
                                
                                <h3 className="text-base font-semibold text-gray-900 mb-2">No posts scheduled</h3>
                                <p className="text-sm text-gray-500 mb-6">Schedule some posts and they will appear here</p>
                                
                                <Button className="bg-[#FFE156] hover:bg-[#E6CB4D] text-[#1A1A1A] shadow-sm font-semibold border border-[#FFE156]/50" onClick={() => setIsModalOpen(true)}>
                                    <Plus className="w-4 h-4 mr-2" /> New Post
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
                <DialogContent className="sm:max-w-[640px]">
                    {preview && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{preview.content_project.title}</DialogTitle>
                                <DialogDescription>
                                    @{preview.social_account.handle} ({preview.social_account.provider}) · {new Date(preview.publish_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} · {preview.status}
                                </DialogDescription>
                            </DialogHeader>
                            {preview.content_project.images.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {preview.content_project.images.map((src, i) => (
                                        <a key={i} href={src} target="_blank" rel="noreferrer" className="shrink-0">
                                            <img src={src} alt={`Slide ${i + 1}`} className="h-72 w-auto rounded-md border border-gray-200" />
                                        </a>
                                    ))}
                                </div>
                            )}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Caption</span>
                                    {preview.content_project.caption && (
                                        <Button type="button" variant="outline" size="sm" onClick={() => copyCaption(preview.content_project.caption)}>
                                            {copied ? 'Copied' : 'Copy caption'}
                                        </Button>
                                    )}
                                </div>
                                <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md bg-gray-50 p-3 font-sans text-sm text-gray-800">
                                    {preview.content_project.caption || 'No caption.'}
                                </pre>
                            </div>
                            {preview.error_log && <p className="text-xs text-red-600">{preview.error_log}</p>}
                            <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
                                <label htmlFor="preview_publish_at" className="text-sm font-medium">Date & time</label>
                                <div className="flex flex-wrap items-center gap-2">
                                    <input
                                        type="datetime-local"
                                        id="preview_publish_at"
                                        value={previewAt}
                                        min={toLocalInput(new Date())}
                                        onChange={(e) => setPreviewAt(e.target.value)}
                                        className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    {isMovable(preview) && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={busy || !previewAt || new Date(previewAt).getTime() === new Date(preview.publish_at).getTime()}
                                            onClick={() => moveTo(preview, new Date(previewAt), () => setPreview(null))}
                                        >
                                            <CalendarClock className="w-4 h-4 mr-1.5" /> Move
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={busy || !previewAt}
                                        onClick={() => duplicateTo(preview, new Date(previewAt), () => setPreview(null))}
                                    >
                                        <Copy className="w-4 h-4 mr-1.5" /> Duplicate
                                    </Button>
                                    {preview.status !== 'publishing' && (
                                        <Button
                                            type="button"
                                            variant={confirmDelete ? 'destructive' : 'outline'}
                                            size="sm"
                                            className={confirmDelete ? 'ml-auto' : 'ml-auto text-red-600 hover:text-red-700'}
                                            disabled={busy}
                                            onClick={() => (confirmDelete ? deleteItem(preview) : setConfirmDelete(true))}
                                        >
                                            <Trash2 className="w-4 h-4 mr-1.5" /> {confirmDelete ? 'Confirm delete' : 'Delete'}
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500">
                                    {isMovable(preview)
                                        ? 'Tip: drag a post to another day to move it, hold Alt or Ctrl while dropping to duplicate.'
                                        : `This post is ${preview.status}, so it can only be duplicated.`}
                                </p>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle>Schedule New Post</DialogTitle>
                            <DialogDescription>
                                Select a post from your library and schedule it to be published.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="flex flex-col gap-2">
                                <label htmlFor="content_project" className="text-sm font-medium">
                                    Content Project
                                </label>
                                <select
                                    id="content_project"
                                    value={data.content_project_id}
                                    onChange={(e) => setData('content_project_id', e.target.value)}
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                >
                                    <option value="" disabled>Select a project</option>
                                    {contentProjects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.title} ({project.type})
                                        </option>
                                    ))}
                                </select>
                                {errors.content_project_id && <p className="text-xs text-red-500">{errors.content_project_id}</p>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="social_account" className="text-sm font-medium">
                                    Social Account
                                </label>
                                <select
                                    id="social_account"
                                    value={data.social_account_id}
                                    onChange={(e) => setData('social_account_id', e.target.value)}
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                >
                                    <option value="" disabled>Select an account</option>
                                    {socialAccounts.map((account) => (
                                        <option key={account.id} value={account.id}>
                                            @{account.handle} ({account.provider})
                                        </option>
                                    ))}
                                </select>
                                {errors.social_account_id && <p className="text-xs text-red-500">{errors.social_account_id}</p>}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label htmlFor="publish_at" className="text-sm font-medium">
                                    Publish Date & Time
                                </label>
                                <input
                                    type="datetime-local"
                                    id="publish_at"
                                    value={data.publish_at}
                                    min={new Date().toISOString().slice(0, 16)}
                                    onChange={(e) => setData('publish_at', e.target.value)}
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                />
                                {errors.publish_at && <p className="text-xs text-red-500">{errors.publish_at}</p>}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={processing} className="bg-[#FFE156] hover:bg-[#E6CB4D] text-[#1A1A1A]">
                                {processing ? 'Scheduling...' : 'Schedule Post'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
