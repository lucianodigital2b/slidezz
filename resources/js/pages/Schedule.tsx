import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { schedule } from '@/routes';
import {
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, List, Grid,
    Plus, ChevronDown, MessageSquare, Tag, Globe, CheckCircle2, AlertCircle
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

interface ScheduleItem {
    id: number;
    status: string;
    publish_at: string;
    content_project: { id: number; title: string; video_url: string | null };
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

export default function Schedule({ schedulesByDay = {}, month, year, counts, contentProjects = [], socialAccounts = [] }: Props) {
    const [view, setView] = useState<'calendar' | 'list'>('calendar');
    const [listTab, setListTab] = useState<'queue' | 'drafts' | 'sent'>('queue');
    const [calendarFilter, setCalendarFilter] = useState<'all' | 'drafts' | 'scheduled' | 'sent'>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);

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
                        <Button className="bg-[#FF5722] hover:bg-[#E64A19] text-white ml-2" onClick={() => setIsModalOpen(true)}>
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
                                    
                                    const filteredSchedules = daySchedules.filter(s => {
                                        if (calendarFilter === 'all') return true;
                                        if (calendarFilter === 'scheduled') return s.status === 'pending' || s.status === 'publishing';
                                        return s.status === calendarFilter;
                                    });

                                    return (
                                        <div 
                                            key={index} 
                                            className={`min-h-[100px] bg-white p-2 ${day ? 'hover:bg-gray-50/50' : 'bg-gray-50/50'} transition-colors flex flex-col gap-1 relative group`}
                                        >
                                            {day && (
                                                <>
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-[#FF5722] text-white' : 'text-gray-700'}`}>
                                                            {day}
                                                        </span>
                                                        <button 
                                                            onClick={() => {
                                                                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00`;
                                                                setData('publish_at', dateStr);
                                                                setIsModalOpen(true);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-[#FF5722] transition-opacity"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-col gap-2 overflow-y-auto flex-1 no-scrollbar pb-1 mt-1 pr-1">
                                                        {filteredSchedules.map(schedule => (
                                                            <div 
                                                                key={schedule.id} 
                                                                className={`text-xs p-1.5 rounded border flex items-center gap-1.5 truncate shadow-sm relative
                                                                    ${schedule.status === 'published' ? 'bg-green-50 border-green-200 text-green-800' : 
                                                                      schedule.status === 'failed' ? 'bg-red-50 border-red-300 text-red-800' : 
                                                                      'bg-blue-50 border-blue-200 text-blue-800'}`
                                                                }
                                                            >
                                                                {schedule.status === 'failed' && (
                                                                    <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full z-10 shadow-sm border border-red-100">
                                                                        <AlertCircle className="w-3.5 h-3.5 text-red-500" fill="currentColor" stroke="white" />
                                                                    </div>
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
                                
                                <Button className="bg-[#FF5722] hover:bg-[#E64A19] text-white shadow-sm font-semibold border border-[#FF5722]/50" onClick={() => setIsModalOpen(true)}>
                                    <Plus className="w-4 h-4 mr-2" /> New Post
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>

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
                            <Button type="submit" disabled={processing} className="bg-[#FF5722] hover:bg-[#E64A19] text-white">
                                {processing ? 'Scheduling...' : 'Schedule Post'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
