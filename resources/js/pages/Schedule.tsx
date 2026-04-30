import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { schedule } from '@/routes';
import {
    Calendar as CalendarIcon, ChevronLeft, ChevronRight, List, Grid,
    Plus, ChevronDown, MessageSquare, Tag, Globe, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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

export default function Schedule({ schedulesByDay, month, year, counts }: Props) {
    const [view, setView] = useState<'calendar' | 'list'>('calendar');
    const [listTab, setListTab] = useState<'queue' | 'drafts' | 'sent'>('queue');
    const [calendarFilter, setCalendarFilter] = useState<'all' | 'drafts' | 'scheduled' | 'sent'>('all');

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

    // Calculate dates for the week view (mocking a week view here for simplicity based on the first week of the month, or you can adjust to show the current week)
    // For a real week view, we would need the current week's start date from props or state.
    // Let's use the first 7 days of the month as a placeholder for the layout.
    const weekDays = [
        { name: 'Sunday', date: 26 },
        { name: 'Monday', date: 27 },
        { name: 'Tuesday', date: 28 },
        { name: 'Wednesday', date: 29, active: true },
        { name: 'Thursday', date: 30 },
        { name: 'Friday', date: 1 },
        { name: 'Saturday', date: 2 },
    ];

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
                        <Button className="bg-[#FF5722] hover:bg-[#E64A19] text-white ml-2">
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
                            <div className="grid grid-cols-7 border-b border-gray-100 pl-16">
                                {weekDays.map((day, index) => (
                                    <div 
                                        key={index} 
                                        className={`py-4 text-center border-r border-gray-100 ${day.active ? 'border-b-2 border-b-[#FF5722]' : ''}`}
                                    >
                                        <div className={`text-xs font-medium ${day.active ? 'text-[#FF5722]' : 'text-gray-500'}`}>
                                            {day.name} <span className="ml-1">{day.date}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Time Grid */}
                            <div className="flex-1 overflow-y-auto relative">
                                {HOURS.map((hour, index) => (
                                    <div key={index} className="flex relative h-24 border-b border-gray-100">
                                        {/* Time Label */}
                                        <div className="w-16 flex-shrink-0 relative">
                                            <span className="absolute -top-2.5 right-4 text-[10px] text-gray-400 font-medium">
                                                {hour}
                                            </span>
                                        </div>

                                        {/* Hour Grid Cells */}
                                        <div className="flex-1 grid grid-cols-7 relative">
                                            {weekDays.map((_, dayIndex) => (
                                                <div 
                                                    key={dayIndex} 
                                                    className="border-r border-gray-100 h-full relative hover:bg-gray-50 transition-colors cursor-pointer group"
                                                >
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Plus className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
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
                                
                                <Button className="bg-[#FF5722] hover:bg-[#E64A19] text-white shadow-sm font-semibold border border-[#FF5722]/50">
                                    <Plus className="w-4 h-4 mr-2" /> New Post
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
