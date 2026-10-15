import { Head, router, useForm } from '@inertiajs/react';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    List,
    Grid,
    Plus,
    ChevronDown,
    CheckCircle2,
    AlertCircle,
    XCircle,
    Copy,
    Trash2,
    CalendarClock,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { schedule } from '@/routes';
import {
    destroy as destroySchedule,
    duplicate as duplicateSchedule,
    store as storeSchedule,
    update as updateSchedule,
} from '@/routes/schedule';

interface ScheduleItem {
    id: number;
    group_id: string;
    status: string;
    publish_at: string;
    error_log: string | null;
    content_project: {
        id: number;
        title: string;
        video_url: string | null;
        caption: string;
        images: string[];
    };
    social_account: {
        id: number;
        handle: string;
        provider: string;
        avatar: string | null;
    };
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

interface DraftItem {
    id: number;
    title: string;
    type: string;
    updated_at: string;
    images: string[];
}

interface Props {
    schedules: ScheduleItem[];
    queue: ScheduleItem[];
    sent: ScheduleItem[];
    drafts: DraftItem[];
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
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

// One post scheduled to several accounts: one row per account sharing a group_id.
// `lead` carries the content and time, and its id addresses the whole group on the server.
interface PostGroup {
    key: string;
    lead: ScheduleItem;
    members: ScheduleItem[];
}

// TikTok and Instagram both cut captions at 2,200 characters.
const CAPTION_MAX = 2200;

const isMemberMovable = (s: ScheduleItem) =>
    s.status === 'pending' || s.status === 'failed';

// Movable = can change its date; published/publishing posts can only be duplicated.
const isMovable = (g: PostGroup) => g.members.some(isMemberMovable);

// Accounts can only change while no account has published the post yet.
const isEditable = (g: PostGroup) => g.members.every(isMemberMovable);

const groupStatus = (g: PostGroup) => {
    if (g.members.some((m) => m.status === 'failed')) {
        return 'failed';
    }

    if (g.members.every((m) => m.status === 'published')) {
        return 'published';
    }

    if (g.members.some((m) => m.status === 'publishing')) {
        return 'publishing';
    }

    return 'pending';
};

const groupByPost = (items: ScheduleItem[]): PostGroup[] => {
    const groups = new Map<string, PostGroup>();

    for (const item of items) {
        const group = groups.get(item.group_id);

        if (group) {
            group.members.push(item);
        } else {
            groups.set(item.group_id, {
                key: item.group_id,
                lead: item,
                members: [item],
            });
        }
    }

    return [...groups.values()];
};

function ProviderBadge({ provider }: { provider: string }) {
    if (provider === 'tiktok') {
        return (
            <span className="rounded-sm bg-white px-0.5 text-[10px] font-bold text-black">
                ♪
            </span>
        );
    }

    if (provider === 'instagram') {
        return (
            <span className="rounded-sm bg-gradient-to-tr from-yellow-400 to-fuchsia-600 px-0.5 text-[10px] font-bold text-white">
                ig
            </span>
        );
    }

    return null;
}

function AccountPicker({
    accounts,
    selected,
    onChange,
    disabled = false,
}: {
    accounts: SocialAccountOption[];
    selected: number[];
    onChange: (ids: number[]) => void;
    disabled?: boolean;
}) {
    if (accounts.length === 0) {
        return (
            <p className="text-xs text-gray-500">
                No accounts connected yet. Connect one in Settings.
            </p>
        );
    }

    const allSelected = accounts.every((a) => selected.includes(a.id));

    return (
        <div className="flex flex-col gap-1">
            {accounts.length > 1 && !disabled && (
                <button
                    type="button"
                    className="self-end text-xs font-medium text-gray-500 hover:text-gray-900"
                    onClick={() =>
                        onChange(allSelected ? [] : accounts.map((a) => a.id))
                    }
                >
                    {allSelected ? 'Clear' : 'Select all'}
                </button>
            )}
            <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded-md border border-input p-1">
                {accounts.map((account) => {
                    const checked = selected.includes(account.id);

                    return (
                        <label
                            key={account.id}
                            className={`flex items-center gap-2.5 rounded px-2 py-1.5 text-sm ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-50'}`}
                        >
                            <Checkbox
                                checked={checked}
                                disabled={disabled}
                                onCheckedChange={() =>
                                    onChange(
                                        checked
                                            ? selected.filter(
                                                  (id) => id !== account.id,
                                              )
                                            : [...selected, account.id],
                                    )
                                }
                            />
                            {account.avatar ? (
                                <img
                                    src={account.avatar}
                                    alt=""
                                    className="h-6 w-6 rounded-full object-cover"
                                />
                            ) : (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold">
                                    {account.handle.slice(0, 2).toUpperCase()}
                                </div>
                            )}
                            <span className="truncate">@{account.handle}</span>
                            <ProviderBadge provider={account.provider} />
                        </label>
                    );
                })}
            </div>
        </div>
    );
}

// "Today", "Tomorrow", "Yesterday" or "Wed, 14 Oct", in the browser's timezone.
const dayLabel = (d: Date) => {
    const startOf = (x: Date) =>
        new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((startOf(d) - startOf(new Date())) / 86_400_000);

    if (diff === 0) {
        return 'Today';
    }

    if (diff === 1) {
        return 'Tomorrow';
    }

    if (diff === -1) {
        return 'Yesterday';
    }

    return d.toLocaleDateString([], {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        ...(d.getFullYear() !== new Date().getFullYear()
            ? { year: 'numeric' }
            : {}),
    });
};

// Consecutive runs of items on the same local day, in the order given.
function byDay<T>(items: T[], dateOf: (item: T) => Date) {
    const days: { key: string; label: string; items: T[] }[] = [];

    for (const item of items) {
        const d = dateOf(item);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        const last = days[days.length - 1];

        if (last?.key === key) {
            last.items.push(item);
        } else {
            days.push({ key, label: dayLabel(d), items: [item] });
        }
    }

    return days;
}

const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    });

const STATUS_PILL: Record<string, { label: string; className: string }> = {
    pending: { label: 'Scheduled', className: 'bg-blue-50 text-blue-700' },
    publishing: { label: 'Sending', className: 'bg-amber-50 text-amber-700' },
    failed: { label: 'Failed', className: 'bg-red-50 text-red-700' },
    published: { label: 'Sent', className: 'bg-green-50 text-green-700' },
};

function Thumb({ src }: { src?: string }) {
    return src ? (
        <img
            src={src}
            alt=""
            loading="lazy"
            className="h-12 w-9 shrink-0 rounded border border-gray-200 object-cover"
        />
    ) : (
        <div className="h-12 w-9 shrink-0 rounded border border-gray-200 bg-gray-100" />
    );
}

function DayHeader({ label, count }: { label: string; count: number }) {
    return (
        <div className="sticky top-0 z-10 flex items-center justify-between border-y border-gray-200 bg-gray-50 px-6 py-2">
            <span className="text-sm font-semibold text-gray-900">{label}</span>
            <span className="text-xs text-gray-500">
                {count} {count === 1 ? 'post' : 'posts'}
            </span>
        </div>
    );
}

function PostRow({
    group,
    onOpen,
}: {
    group: PostGroup;
    onOpen: (group: PostGroup) => void;
}) {
    const status = STATUS_PILL[groupStatus(group)] ?? STATUS_PILL.pending;
    const failed = group.members.filter((m) => m.status === 'failed');
    const providers = [
        ...new Set(group.members.map((m) => m.social_account.provider)),
    ];

    return (
        <button
            type="button"
            onClick={() => onOpen(group)}
            className="flex w-full items-center gap-4 border-b border-gray-100 bg-white px-6 py-3 text-left transition-colors hover:bg-gray-50"
        >
            <Thumb src={group.lead.content_project.images[0]} />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                    {group.lead.content_project.title}
                </p>
                <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-gray-500">
                    {providers.map((p) => (
                        <span
                            key={p}
                            className="rounded-sm border border-gray-200"
                        >
                            <ProviderBadge provider={p} />
                        </span>
                    ))}
                    <span className="truncate">
                        {group.members
                            .map((m) => `@${m.social_account.handle}`)
                            .join(', ')}
                    </span>
                </div>
                {failed.length > 0 && (
                    <p className="mt-1 truncate text-xs text-red-600">
                        {failed[0].error_log ||
                            'An unknown error occurred while publishing to the platform.'}
                    </p>
                )}
            </div>
            <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
            >
                {status.label}
            </span>
            <span className="w-14 shrink-0 text-right text-sm text-gray-700 tabular-nums">
                {formatTime(group.lead.publish_at)}
            </span>
        </button>
    );
}

// Value for <input type="datetime-local"> in the browser's timezone.
const toLocalInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function Schedule({
    schedules = [],
    queue = [],
    sent = [],
    drafts = [],
    month,
    year,
    counts,
    contentProjects = [],
    socialAccounts = [],
}: Props) {
    const [view, setView] = useState<'calendar' | 'list'>('calendar');
    const [listTab, setListTab] = useState<'queue' | 'drafts' | 'sent'>(
        'queue',
    );
    const [calendarFilter, setCalendarFilter] = useState<
        'all' | 'drafts' | 'scheduled' | 'sent'
    >('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [preview, setPreview] = useState<PostGroup | null>(null);
    const [copied, setCopied] = useState(false);
    const [previewAt, setPreviewAt] = useState('');
    const [previewAccounts, setPreviewAccounts] = useState<number[]>([]);
    const [previewCaption, setPreviewCaption] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [busy, setBusy] = useState(false);
    const [dragOverDay, setDragOverDay] = useState<number | null>(null);
    const [accountFilter, setAccountFilter] = useState<number | 'all'>('all');

    // The server sends the month's posts; each lands on its local day here.
    const groupsByDay = useMemo(() => {
        const days: Record<string, ScheduleItem[]> = {};

        for (const item of schedules) {
            (days[new Date(item.publish_at).getDate()] ??= []).push(item);
        }

        return Object.fromEntries(
            Object.entries(days).map(([day, items]) => [
                day,
                groupByPost(items),
            ]),
        ) as Record<string, PostGroup[]>;
    }, [schedules]);

    // Queue runs from the next post on, Sent from the latest back: both come
    // ordered from the server, and grouping keeps that order.
    const listDays = useMemo(() => {
        const rows = (listTab === 'sent' ? sent : queue).filter(
            (s) =>
                accountFilter === 'all' ||
                s.social_account.id === accountFilter,
        );

        return byDay(groupByPost(rows), (g) => new Date(g.lead.publish_at));
    }, [listTab, queue, sent, accountFilter]);

    const draftDays = useMemo(
        () => byDay(drafts, (d) => new Date(d.updated_at)),
        [drafts],
    );

    const openPreview = (group: PostGroup) => {
        setPreview(group);
        setPreviewAt(toLocalInput(new Date(group.lead.publish_at)));
        setPreviewAccounts(group.members.map((m) => m.social_account.id));
        setPreviewCaption(group.lead.content_project.caption);
        setConfirmDelete(false);
    };

    // Accounts offered in the preview: the connected ones plus any the post already uses.
    const previewAccountOptions = useMemo(() => {
        if (!preview) {
            return [];
        }

        const options = [...socialAccounts];

        for (const member of preview.members) {
            if (!options.some((a) => a.id === member.social_account.id)) {
                options.push(member.social_account);
            }
        }

        return options;
    }, [preview, socialAccounts]);

    const sameIds = (a: number[], b: number[]) =>
        a.length === b.length && a.every((id) => b.includes(id));

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
    const moveTo = (group: PostGroup, when: Date, onSuccess?: () => void) => {
        router.patch(
            updateSchedule(group.lead.id).url,
            { publish_at: when.toISOString() },
            requestOptions(onSuccess),
        );
    };

    // What the preview form changed against the post as loaded.
    const previewChanges = (group: PostGroup) => ({
        time:
            new Date(previewAt).getTime() !==
            new Date(group.lead.publish_at).getTime(),
        accounts: !sameIds(
            previewAccounts,
            group.members.map((m) => m.social_account.id),
        ),
        caption: previewCaption !== group.lead.content_project.caption,
    });

    const savePreview = (group: PostGroup) => {
        const payload: {
            publish_at?: string;
            social_account_ids?: number[];
            caption?: string;
        } = {};
        const when = new Date(previewAt);
        const changed = previewChanges(group);

        if (changed.time) {
            payload.publish_at = when.toISOString();
        }

        if (changed.accounts) {
            payload.social_account_ids = previewAccounts;
            // Accounts added to a failed post go out at the time shown, so send it along.
            payload.publish_at = when.toISOString();
        }

        if (changed.caption) {
            payload.caption = previewCaption;
        }

        router.patch(
            updateSchedule(group.lead.id).url,
            payload,
            requestOptions(() => setPreview(null)),
        );
    };

    const duplicateTo = (
        group: PostGroup,
        when: Date,
        onSuccess?: () => void,
    ) => {
        router.post(
            duplicateSchedule(group.lead.id).url,
            { publish_at: when.toISOString() },
            requestOptions(onSuccess),
        );
    };

    const deleteItem = (group: PostGroup) => {
        router.delete(
            destroySchedule(group.lead.id).url,
            requestOptions(() => setPreview(null)),
        );
    };

    const handleDrop = (e: React.DragEvent, day: number) => {
        e.preventDefault();
        setDragOverDay(null);

        const id = Number(e.dataTransfer.getData('text/schedule-id'));
        const item = Object.values(groupsByDay)
            .flat()
            .find((g) => g.lead.id === id);

        if (!item) {
            return;
        }

        // Keep the post's time of day, change only the date.
        const original = new Date(item.lead.publish_at);
        const when = new Date(
            year,
            month - 1,
            day,
            original.getHours(),
            original.getMinutes(),
        );
        const copy = e.altKey || e.ctrlKey || e.metaKey || !isMovable(item);

        if (!copy && when.getTime() === original.getTime()) {
            return;
        }

        if (when <= new Date()) {
            toast.error(
                'That time has already passed. Open the post to pick a later time.',
            );

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

    const { data, setData, post, processing, errors, reset, transform } =
        useForm({
            content_project_id: '',
            social_account_ids: (socialAccounts.length === 1
                ? [socialAccounts[0].id]
                : []) as number[],
            publish_at: '',
        });

    // The picker shows local time; the server gets UTC so the post goes out at the time picked.
    transform((form) => ({
        ...form,
        publish_at: form.publish_at
            ? new Date(form.publish_at).toISOString()
            : '',
    }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(storeSchedule().url, {
            onSuccess: () => {
                setIsModalOpen(false);
                reset();
            },
        });
    };

    const today = new Date();
    const isCurrentMonth =
        today.getMonth() + 1 === month && today.getFullYear() === year;
    const todayDay = isCurrentMonth ? today.getDate() : null;

    const navigate = (delta: number) => {
        const d = new Date(year, month - 1 + delta, 1);
        router.get(
            schedule.url(),
            { month: d.getMonth() + 1, year: d.getFullYear() },
            {
                preserveState: true,
                replace: true,
            },
        );
    };

    const goToday = () => {
        router.get(
            schedule.url(),
            { month: today.getMonth() + 1, year: today.getFullYear() },
            {
                preserveState: true,
                replace: true,
            },
        );
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

            <div className="flex h-full min-h-screen flex-col bg-white font-sans text-gray-900">
                {/* Top Navigation Bar */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                            <Grid className="h-4 w-4 text-gray-700" />
                        </div>
                        <h1 className="text-lg font-semibold text-gray-900">
                            Agenda
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="p-2 text-gray-400 transition-colors hover:text-gray-600">
                            <CheckCircle2 className="h-5 w-5" />
                        </button>
                        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                            <button
                                onClick={() => setView('list')}
                                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                <List className="h-4 w-4" /> List
                            </button>
                            <button
                                onClick={() => setView('calendar')}
                                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                            >
                                <CalendarIcon className="h-4 w-4" /> Calendar
                            </button>
                        </div>
                        <Button
                            className="ml-2 bg-[#FFE156] text-[#1A1A1A] hover:bg-[#E6CB4D]"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <Plus className="mr-2 h-4 w-4" /> New Post
                        </Button>
                    </div>
                </div>

                {view === 'calendar' ? (
                    <>
                        {/* Sub Navigation Bar */}
                        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-3">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => navigate(-1)}
                                        className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => navigate(1)}
                                        className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>

                                <span className="text-sm font-semibold text-gray-900">
                                    {MONTH_NAMES[month - 1]} {year}
                                </span>

                                <button
                                    onClick={goToday}
                                    className="rounded-md border border-gray-200 bg-white px-3 py-1 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                                >
                                    Today
                                </button>

                                <button className="ml-2 flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900">
                                    Week <ChevronDown className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-6 text-sm text-gray-500">
                                <select
                                    value={calendarFilter}
                                    onChange={(e) =>
                                        setCalendarFilter(e.target.value as any)
                                    }
                                    className="flex cursor-pointer items-center gap-2 bg-transparent font-medium text-gray-500 transition-colors outline-none hover:text-gray-900"
                                >
                                    <option value="all">All Posts</option>
                                    <option value="drafts">Drafts</option>
                                    <option value="scheduled">Scheduled</option>
                                    <option value="sent">Sent</option>
                                </select>
                            </div>
                        </div>

                        {/* Calendar Grid Area */}
                        <div className="flex flex-1 flex-col overflow-hidden bg-white">
                            {/* Days Header */}
                            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                                {[
                                    'Sun',
                                    'Mon',
                                    'Tue',
                                    'Wed',
                                    'Thu',
                                    'Fri',
                                    'Sat',
                                ].map((day) => (
                                    <div
                                        key={day}
                                        className="border-r border-gray-200 py-2 text-center text-xs font-semibold tracking-wider text-gray-500 uppercase last:border-r-0"
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid flex-1 grid-cols-7 grid-rows-6 gap-px overflow-y-auto bg-gray-200">
                                {calendarDays.map((day, index) => {
                                    const isToday =
                                        isCurrentMonth && day === todayDay;
                                    const dayGroups = day
                                        ? groupsByDay[day] || []
                                        : [];

                                    const isPastDay =
                                        !!day &&
                                        new Date(year, month - 1, day, 23, 59) <
                                            new Date();

                                    const filteredGroups = dayGroups.filter(
                                        (g) =>
                                            g.members.some((s) => {
                                                if (calendarFilter === 'all') {
                                                    return true;
                                                }

                                                if (
                                                    calendarFilter ===
                                                    'scheduled'
                                                ) {
                                                    return (
                                                        s.status ===
                                                            'pending' ||
                                                        s.status ===
                                                            'publishing'
                                                    );
                                                }

                                                return (
                                                    s.status === calendarFilter
                                                );
                                            }),
                                    );

                                    return (
                                        <div
                                            key={index}
                                            onDragOver={(e) => {
                                                if (!day || isPastDay) {
                                                    return;
                                                }

                                                e.preventDefault();
                                                e.dataTransfer.dropEffect =
                                                    e.altKey ||
                                                    e.ctrlKey ||
                                                    e.metaKey
                                                        ? 'copy'
                                                        : 'move';

                                                if (dragOverDay !== day) {
                                                    setDragOverDay(day);
                                                }
                                            }}
                                            onDragLeave={(e) => {
                                                if (
                                                    !e.currentTarget.contains(
                                                        e.relatedTarget as Node,
                                                    )
                                                ) {
                                                    setDragOverDay(null);
                                                }
                                            }}
                                            onDrop={(e) =>
                                                day && handleDrop(e, day)
                                            }
                                            className={`min-h-[100px] p-2 ${day && dragOverDay === day ? 'bg-[#FFE156]/20 ring-2 ring-[#FFE156] ring-inset' : day ? 'bg-white hover:bg-gray-50/50' : 'bg-gray-50/50'} group relative flex flex-col gap-1 transition-colors`}
                                        >
                                            {day && (
                                                <>
                                                    <div className="mb-1 flex items-start justify-between">
                                                        <span
                                                            className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${isToday ? 'bg-[#FFE156] text-[#1A1A1A]' : 'text-gray-700'}`}
                                                        >
                                                            {day}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                // Don't allow clicking past dates
                                                                const clickDate =
                                                                    new Date(
                                                                        year,
                                                                        month -
                                                                            1,
                                                                        day,
                                                                        12,
                                                                        0,
                                                                    );

                                                                if (
                                                                    clickDate <
                                                                        new Date() &&
                                                                    !isToday
                                                                ) {
                                                                    return;
                                                                }

                                                                // Pre-fill next hour for today, or 12:00 for future dates
                                                                const defaultTime =
                                                                    isToday
                                                                        ? toLocalInput(
                                                                              new Date(
                                                                                  new Date().getTime() +
                                                                                      60 *
                                                                                          60 *
                                                                                          1000,
                                                                              ),
                                                                          )
                                                                        : `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00`;

                                                                setData(
                                                                    'publish_at',
                                                                    defaultTime,
                                                                );
                                                                setIsModalOpen(
                                                                    true,
                                                                );
                                                            }}
                                                            className={`p-1 transition-opacity ${
                                                                new Date(
                                                                    year,
                                                                    month - 1,
                                                                    day,
                                                                    23,
                                                                    59,
                                                                ) <
                                                                    new Date() &&
                                                                !isToday
                                                                    ? 'cursor-not-allowed opacity-0'
                                                                    : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:text-[#FFE156]'
                                                            }`}
                                                        >
                                                            <Plus className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                    <div className="no-scrollbar mt-1 flex flex-1 flex-col gap-2 overflow-y-auto pr-1 pb-1">
                                                        {filteredGroups.map(
                                                            (group) => {
                                                                const status =
                                                                    groupStatus(
                                                                        group,
                                                                    );
                                                                const failed =
                                                                    group.members.filter(
                                                                        (m) =>
                                                                            m.status ===
                                                                            'failed',
                                                                    );
                                                                const providers =
                                                                    [
                                                                        ...new Set(
                                                                            group.members.map(
                                                                                (
                                                                                    m,
                                                                                ) =>
                                                                                    m
                                                                                        .social_account
                                                                                        .provider,
                                                                            ),
                                                                        ),
                                                                    ];
                                                                const handles =
                                                                    group.members
                                                                        .map(
                                                                            (
                                                                                m,
                                                                            ) =>
                                                                                `@${m.social_account.handle}`,
                                                                        )
                                                                        .join(
                                                                            ', ',
                                                                        );

                                                                return (
                                                                    <div
                                                                        key={
                                                                            group.key
                                                                        }
                                                                        draggable={
                                                                            !busy
                                                                        }
                                                                        onDragStart={(
                                                                            e,
                                                                        ) => {
                                                                            e.dataTransfer.setData(
                                                                                'text/schedule-id',
                                                                                String(
                                                                                    group
                                                                                        .lead
                                                                                        .id,
                                                                                ),
                                                                            );
                                                                            e.dataTransfer.effectAllowed =
                                                                                isMovable(
                                                                                    group,
                                                                                )
                                                                                    ? 'copyMove'
                                                                                    : 'copy';
                                                                        }}
                                                                        onDragEnd={() =>
                                                                            setDragOverDay(
                                                                                null,
                                                                            )
                                                                        }
                                                                        onClick={() =>
                                                                            openPreview(
                                                                                group,
                                                                            )
                                                                        }
                                                                        className={`relative flex cursor-grab items-center gap-1.5 truncate rounded border p-1.5 text-xs shadow-sm hover:brightness-95 active:cursor-grabbing ${
                                                                            status ===
                                                                            'published'
                                                                                ? 'border-green-200 bg-green-50 text-green-800'
                                                                                : status ===
                                                                                    'failed'
                                                                                  ? 'border-red-300 bg-red-50 text-red-800'
                                                                                  : 'border-blue-200 bg-blue-50 text-blue-800'
                                                                        }`}
                                                                    >
                                                                        {failed.length >
                                                                            0 && (
                                                                            <TooltipProvider
                                                                                delayDuration={
                                                                                    100
                                                                                }
                                                                            >
                                                                                <Tooltip>
                                                                                    <TooltipTrigger
                                                                                        asChild
                                                                                    >
                                                                                        <div className="absolute -top-1.5 -right-1.5 z-10 cursor-help rounded-full border border-red-100 bg-white shadow-sm">
                                                                                            <AlertCircle
                                                                                                className="h-3.5 w-3.5 text-red-500"
                                                                                                fill="currentColor"
                                                                                                stroke="white"
                                                                                            />
                                                                                        </div>
                                                                                    </TooltipTrigger>
                                                                                    <TooltipContent className="max-w-[250px] border-red-200 bg-red-50 text-xs break-words text-red-900 shadow-md">
                                                                                        <div className="flex items-start gap-2">
                                                                                            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                                                                                            <div className="flex flex-col gap-1">
                                                                                                <p className="font-semibold">
                                                                                                    Publishing
                                                                                                    Failed
                                                                                                </p>
                                                                                                {failed.map(
                                                                                                    (
                                                                                                        m,
                                                                                                    ) => (
                                                                                                        <p
                                                                                                            key={
                                                                                                                m.id
                                                                                                            }
                                                                                                            className="text-red-800/90"
                                                                                                        >
                                                                                                            {group
                                                                                                                .members
                                                                                                                .length >
                                                                                                                1 && (
                                                                                                                <span className="font-medium">
                                                                                                                    @
                                                                                                                    {
                                                                                                                        m
                                                                                                                            .social_account
                                                                                                                            .handle
                                                                                                                    }

                                                                                                                    :{' '}
                                                                                                                </span>
                                                                                                            )}
                                                                                                            {m.error_log ||
                                                                                                                'An unknown error occurred while publishing to the platform.'}
                                                                                                        </p>
                                                                                                    ),
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </TooltipContent>
                                                                                </Tooltip>
                                                                            </TooltipProvider>
                                                                        )}
                                                                        {providers.map(
                                                                            (
                                                                                p,
                                                                            ) => (
                                                                                <ProviderBadge
                                                                                    key={
                                                                                        p
                                                                                    }
                                                                                    provider={
                                                                                        p
                                                                                    }
                                                                                />
                                                                            ),
                                                                        )}
                                                                        <span
                                                                            className="max-w-[45%] shrink-0 truncate rounded-sm bg-white/80 px-1 text-[10px] font-semibold"
                                                                            title={
                                                                                handles
                                                                            }
                                                                        >
                                                                            {group
                                                                                .members
                                                                                .length >
                                                                            1
                                                                                ? `×${group.members.length}`
                                                                                : handles}
                                                                        </span>
                                                                        <span
                                                                            className="truncate font-medium"
                                                                            title={`${group.lead.content_project.title} · ${handles}`}
                                                                        >
                                                                            {new Date(
                                                                                group
                                                                                    .lead
                                                                                    .publish_at,
                                                                            ).toLocaleTimeString(
                                                                                [],
                                                                                {
                                                                                    hour: '2-digit',
                                                                                    minute: '2-digit',
                                                                                },
                                                                            )}{' '}
                                                                            -{' '}
                                                                            {
                                                                                group
                                                                                    .lead
                                                                                    .content_project
                                                                                    .title
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                );
                                                            },
                                                        )}
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
                        <div className="flex items-center justify-between border-b border-gray-100 bg-white px-6 py-3">
                            <div className="flex items-center gap-6">
                                <button
                                    className={`-mb-3 border-b-2 pb-3 text-sm font-medium transition-colors ${listTab === 'queue' ? 'border-black text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                                    onClick={() => setListTab('queue')}
                                >
                                    Queue{' '}
                                    <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                        {counts.queue}
                                    </span>
                                </button>
                                <button
                                    className={`-mb-3 border-b-2 pb-3 text-sm font-medium transition-colors ${listTab === 'drafts' ? 'border-black text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                                    onClick={() => setListTab('drafts')}
                                >
                                    Drafts{' '}
                                    <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                        {counts.drafts}
                                    </span>
                                </button>
                                <button
                                    className={`-mb-3 border-b-2 pb-3 text-sm font-medium transition-colors ${listTab === 'sent' ? 'border-black text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
                                    onClick={() => setListTab('sent')}
                                >
                                    Sent{' '}
                                    <span className="ml-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                        {counts.sent}
                                    </span>
                                </button>
                            </div>

                            {listTab !== 'drafts' &&
                                socialAccounts.length > 1 && (
                                    <select
                                        value={accountFilter}
                                        onChange={(e) =>
                                            setAccountFilter(
                                                e.target.value === 'all'
                                                    ? 'all'
                                                    : Number(e.target.value),
                                            )
                                        }
                                        className="cursor-pointer bg-transparent text-sm font-medium text-gray-500 transition-colors outline-none hover:text-gray-900"
                                    >
                                        <option value="all">
                                            All accounts
                                        </option>
                                        {socialAccounts.map((a) => (
                                            <option key={a.id} value={a.id}>
                                                @{a.handle}
                                            </option>
                                        ))}
                                    </select>
                                )}
                        </div>

                        {listTab !== 'drafts' && listDays.length > 0 && (
                            <div className="flex-1 overflow-y-auto pb-20">
                                {listDays.map((day) => (
                                    <section key={day.key}>
                                        <DayHeader
                                            label={day.label}
                                            count={day.items.length}
                                        />
                                        {day.items.map((group) => (
                                            <PostRow
                                                key={group.key}
                                                group={group}
                                                onOpen={openPreview}
                                            />
                                        ))}
                                    </section>
                                ))}
                            </div>
                        )}

                        {listTab === 'drafts' && draftDays.length > 0 && (
                            <div className="flex-1 overflow-y-auto pb-20">
                                {draftDays.map((day) => (
                                    <section key={day.key}>
                                        <DayHeader
                                            label={day.label}
                                            count={day.items.length}
                                        />
                                        {day.items.map((draft) => (
                                            <button
                                                key={draft.id}
                                                type="button"
                                                onClick={() => {
                                                    setData(
                                                        'content_project_id',
                                                        String(draft.id),
                                                    );
                                                    setIsModalOpen(true);
                                                }}
                                                className="flex w-full items-center gap-4 border-b border-gray-100 bg-white px-6 py-3 text-left transition-colors hover:bg-gray-50"
                                            >
                                                <Thumb src={draft.images[0]} />
                                                <p className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                                                    {draft.title}
                                                </p>
                                                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                                                    Draft
                                                </span>
                                                <span className="w-14 shrink-0 text-right text-sm text-gray-700 tabular-nums">
                                                    {formatTime(
                                                        draft.updated_at,
                                                    )}
                                                </span>
                                            </button>
                                        ))}
                                    </section>
                                ))}
                            </div>
                        )}

                        {/* List View Empty State */}
                        {(listTab === 'drafts' ? draftDays : listDays)
                            .length === 0 && (
                            <div className="flex flex-1 flex-col items-center justify-center bg-gray-50/50 pb-20">
                                <div className="flex max-w-sm flex-col items-center text-center">
                                    {/* Stacked Cards Illustration */}
                                    <div className="relative mb-8 flex h-48 w-64 justify-center">
                                        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3">
                                            {[1, 2, 3].map((i) => (
                                                <div
                                                    key={i}
                                                    className={`relative flex h-16 w-56 items-center rounded-lg border border-gray-200 bg-white p-3 shadow-sm z-${10 + i}`}
                                                >
                                                    <div className="flex flex-1 flex-col gap-2">
                                                        <div className="h-1.5 w-3/4 rounded-full bg-gray-200" />
                                                        <div className="h-1.5 w-1/2 rounded-full bg-gray-100" />
                                                    </div>
                                                    <div className="ml-4 h-10 w-10 rounded-md bg-gray-100" />
                                                </div>
                                            ))}
                                        </div>
                                        {/* Abstract curved arrow */}
                                        <svg
                                            className="absolute top-1/4 -right-4 h-32 w-12 text-gray-300"
                                            fill="none"
                                            viewBox="0 0 48 128"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="1.5"
                                                d="M24 8L32 0L40 8M32 0v64c0 17.673-14.327 32-32 32"
                                            />
                                        </svg>
                                    </div>

                                    <h3 className="mb-2 text-base font-semibold text-gray-900">
                                        {listTab === 'sent'
                                            ? 'Nothing sent yet'
                                            : listTab === 'drafts'
                                              ? 'No drafts'
                                              : 'No posts scheduled'}
                                    </h3>
                                    <p className="mb-6 text-sm text-gray-500">
                                        {listTab === 'sent'
                                            ? 'Posts show up here once they go out'
                                            : 'Schedule some posts and they will appear here'}
                                    </p>

                                    <Button
                                        className="border border-[#FFE156]/50 bg-[#FFE156] font-semibold text-[#1A1A1A] shadow-sm hover:bg-[#E6CB4D]"
                                        onClick={() => setIsModalOpen(true)}
                                    >
                                        <Plus className="mr-2 h-4 w-4" /> New
                                        Post
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <Dialog
                open={preview !== null}
                onOpenChange={(open) => !open && setPreview(null)}
            >
                <DialogContent className="sm:max-w-[640px]">
                    {preview && (
                        <>
                            <DialogHeader>
                                <DialogTitle>
                                    {preview.lead.content_project.title}
                                </DialogTitle>
                                <DialogDescription>
                                    {new Date(
                                        preview.lead.publish_at,
                                    ).toLocaleString([], {
                                        dateStyle: 'short',
                                        timeStyle: 'short',
                                    })}{' '}
                                    ·{' '}
                                    {preview.members.length === 1
                                        ? `@${preview.lead.social_account.handle} · ${preview.lead.status}`
                                        : `${preview.members.length} accounts`}
                                </DialogDescription>
                            </DialogHeader>
                            {preview.lead.content_project.images.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {preview.lead.content_project.images.map(
                                        (src, i) => (
                                            <a
                                                key={i}
                                                href={src}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="shrink-0"
                                            >
                                                <img
                                                    src={src}
                                                    alt={`Slide ${i + 1}`}
                                                    className="h-72 w-auto rounded-md border border-gray-200"
                                                />
                                            </a>
                                        ),
                                    )}
                                </div>
                            )}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <label
                                        htmlFor="preview_caption"
                                        className="text-sm font-medium"
                                    >
                                        Caption
                                    </label>
                                    {previewCaption && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                copyCaption(previewCaption)
                                            }
                                        >
                                            {copied ? 'Copied' : 'Copy caption'}
                                        </Button>
                                    )}
                                </div>
                                {isMovable(preview) ? (
                                    <>
                                        <Textarea
                                            id="preview_caption"
                                            value={previewCaption}
                                            maxLength={CAPTION_MAX}
                                            rows={4}
                                            disabled={busy}
                                            onChange={(e) =>
                                                setPreviewCaption(
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="No caption."
                                            className="max-h-64 text-sm"
                                        />
                                        <p className="text-right text-xs text-gray-400">
                                            {previewCaption.length}/
                                            {CAPTION_MAX}
                                        </p>
                                    </>
                                ) : (
                                    <pre className="max-h-64 overflow-y-auto rounded-md bg-gray-50 p-3 font-sans text-sm whitespace-pre-wrap text-gray-800">
                                        {preview.lead.content_project.caption ||
                                            'No caption.'}
                                    </pre>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
                                <span className="text-sm font-medium">
                                    Accounts
                                </span>
                                {isEditable(preview) ? (
                                    <AccountPicker
                                        accounts={previewAccountOptions}
                                        selected={previewAccounts}
                                        onChange={setPreviewAccounts}
                                        disabled={busy}
                                    />
                                ) : (
                                    <ul className="flex flex-col gap-1.5">
                                        {preview.members.map((m) => (
                                            <li
                                                key={m.id}
                                                className="flex flex-col gap-0.5 text-sm"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <ProviderBadge
                                                        provider={
                                                            m.social_account
                                                                .provider
                                                        }
                                                    />
                                                    <span>
                                                        @
                                                        {
                                                            m.social_account
                                                                .handle
                                                        }
                                                    </span>
                                                    <span
                                                        className={`ml-auto rounded-full px-2 py-0.5 text-xs ${m.status === 'published' ? 'bg-green-50 text-green-700' : m.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}
                                                    >
                                                        {m.status}
                                                    </span>
                                                </div>
                                                {m.error_log && (
                                                    <p className="text-xs text-red-600">
                                                        {m.error_log}
                                                    </p>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                                {isEditable(preview) &&
                                    previewAccounts.length === 0 && (
                                        <p className="text-xs text-amber-700">
                                            Pick at least one account to save.
                                            To cancel the post, delete it.
                                        </p>
                                    )}
                                {isEditable(preview) &&
                                    preview.members.some(
                                        (m) => m.error_log,
                                    ) && (
                                        <div className="flex flex-col gap-1">
                                            {preview.members
                                                .filter((m) => m.error_log)
                                                .map((m) => (
                                                    <p
                                                        key={m.id}
                                                        className="text-xs text-red-600"
                                                    >
                                                        {preview.members
                                                            .length > 1 && (
                                                            <span className="font-medium">
                                                                @
                                                                {
                                                                    m
                                                                        .social_account
                                                                        .handle
                                                                }
                                                                :{' '}
                                                            </span>
                                                        )}
                                                        {m.error_log}
                                                    </p>
                                                ))}
                                        </div>
                                    )}
                            </div>
                            <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
                                <label
                                    htmlFor="preview_publish_at"
                                    className="text-sm font-medium"
                                >
                                    Date & time
                                </label>
                                <div className="flex flex-wrap items-center gap-2">
                                    <input
                                        type="datetime-local"
                                        id="preview_publish_at"
                                        value={previewAt}
                                        min={toLocalInput(new Date())}
                                        onChange={(e) =>
                                            setPreviewAt(e.target.value)
                                        }
                                        className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
                                    />
                                    {isMovable(preview) && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled={
                                                busy ||
                                                !previewAt ||
                                                previewAccounts.length === 0 ||
                                                !Object.values(
                                                    previewChanges(preview),
                                                ).some(Boolean)
                                            }
                                            onClick={() => savePreview(preview)}
                                        >
                                            <CalendarClock className="mr-1.5 h-4 w-4" />{' '}
                                            Save
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={busy || !previewAt}
                                        onClick={() =>
                                            duplicateTo(
                                                preview,
                                                new Date(previewAt),
                                                () => setPreview(null),
                                            )
                                        }
                                    >
                                        <Copy className="mr-1.5 h-4 w-4" />{' '}
                                        Duplicate
                                    </Button>
                                    {preview.members.some(
                                        (m) => m.status !== 'publishing',
                                    ) && (
                                        <Button
                                            type="button"
                                            variant={
                                                confirmDelete
                                                    ? 'destructive'
                                                    : 'outline'
                                            }
                                            size="sm"
                                            className={
                                                confirmDelete
                                                    ? 'ml-auto'
                                                    : 'ml-auto text-red-600 hover:text-red-700'
                                            }
                                            disabled={busy}
                                            onClick={() =>
                                                confirmDelete
                                                    ? deleteItem(preview)
                                                    : setConfirmDelete(true)
                                            }
                                        >
                                            <Trash2 className="mr-1.5 h-4 w-4" />{' '}
                                            {confirmDelete
                                                ? 'Confirm delete'
                                                : 'Delete'}
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500">
                                    {isEditable(preview)
                                        ? 'Tip: drag a post to another day to move it, hold Alt or Ctrl while dropping to duplicate.'
                                        : isMovable(preview)
                                          ? 'Some accounts already published this post: moving it only moves the pending or failed ones. Duplicate it to pick other accounts.'
                                          : `This post is ${groupStatus(preview)}, so it can only be duplicated.`}
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
                                Select a post from your library and the accounts
                                it goes out to.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="flex flex-col gap-2">
                                <label
                                    htmlFor="content_project"
                                    className="text-sm font-medium"
                                >
                                    Content Project
                                </label>
                                <select
                                    id="content_project"
                                    value={data.content_project_id}
                                    onChange={(e) =>
                                        setData(
                                            'content_project_id',
                                            e.target.value,
                                        )
                                    }
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                >
                                    <option value="" disabled>
                                        Select a project
                                    </option>
                                    {contentProjects.map((project) => (
                                        <option
                                            key={project.id}
                                            value={project.id}
                                        >
                                            {project.title} ({project.type})
                                        </option>
                                    ))}
                                </select>
                                {errors.content_project_id && (
                                    <p className="text-xs text-red-500">
                                        {errors.content_project_id}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <span className="text-sm font-medium">
                                    Social Accounts
                                </span>
                                <AccountPicker
                                    accounts={socialAccounts}
                                    selected={data.social_account_ids}
                                    onChange={(ids) =>
                                        setData('social_account_ids', ids)
                                    }
                                />
                                {errors.social_account_ids && (
                                    <p className="text-xs text-red-500">
                                        {errors.social_account_ids}
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <label
                                    htmlFor="publish_at"
                                    className="text-sm font-medium"
                                >
                                    Publish Date & Time
                                </label>
                                <input
                                    type="datetime-local"
                                    id="publish_at"
                                    value={data.publish_at}
                                    min={toLocalInput(new Date())}
                                    onChange={(e) =>
                                        setData('publish_at', e.target.value)
                                    }
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                    required
                                />
                                {errors.publish_at && (
                                    <p className="text-xs text-red-500">
                                        {errors.publish_at}
                                    </p>
                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={
                                    processing ||
                                    data.social_account_ids.length === 0
                                }
                                className="bg-[#FFE156] text-[#1A1A1A] hover:bg-[#E6CB4D]"
                            >
                                {processing
                                    ? 'Scheduling...'
                                    : data.social_account_ids.length > 1
                                      ? `Schedule to ${data.social_account_ids.length} accounts`
                                      : 'Schedule Post'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
