import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { connect as tiktokConnect } from '@/routes/social-accounts';
import { schedule } from '@/routes';
import { store as scheduleStore } from '@/routes/schedule';
import {
    Search, MoreVertical, Plus, Image as ImageIcon,
    LayoutGrid, List, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';

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
}

const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function TikTokIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.72a8.19 8.19 0 004.79 1.53V6.78a4.85 4.85 0 01-1.02-.09z" />
        </svg>
    );
}

export default function Schedule({ schedulesByDay, socialAccounts, contentProjects, month, year }: Props) {
    const [view, setView] = useState<'calendar' | 'grid' | 'list'>('calendar');

    const { data, setData, post, processing, errors, reset } = useForm({
        content_project_id: contentProjects[0]?.id?.toString() ?? '',
        social_account_id: socialAccounts[0]?.id?.toString() ?? '',
        publish_at: '',
    });

    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

    const today = new Date();
    const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;
    const todayDay = isCurrentMonth ? today.getDate() : null;

    const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
    const cells = Array.from({ length: totalCells }, (_, i) => {
        const day = i - firstDayOfWeek + 1;
        return day >= 1 && day <= daysInMonth ? day : null;
    });

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

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(scheduleStore.url(), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    const selectedProject = contentProjects.find((p) => p.id.toString() === data.content_project_id);
    const selectedAccount = socialAccounts.find((a) => a.id.toString() === data.social_account_id);

    return (
        <>
            <Head title="Agenda" />

            <div className="p-6">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">Agenda</h1>
                        <p className="text-sm text-gray-500">Gerencie e acompanhe suas publicações agendadas no TikTok</p>
                    </div>
                    <div className="relative w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input placeholder="Buscar ..." className="pl-9 bg-white border-gray-200 rounded-lg focus-visible:ring-[#FF5722]" />
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6 items-start">

                    {/* Left Panel: Create Schedule */}
                    <form onSubmit={submit} className="w-full lg:w-[380px] bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex-shrink-0">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-base font-semibold text-gray-900">Criar Agendamento</h2>
                            <button type="button" className="text-gray-400 hover:text-gray-600">
                                <MoreVertical className="w-4 h-4" />
                            </button>
                        </div>

                        {/* TikTok Account Selector */}
                        <div className="flex items-center gap-3 mb-5">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-black flex-shrink-0">
                                <TikTokIcon className="w-4 h-4 text-white" />
                            </div>

                            {socialAccounts.length === 0 ? (
                                <button
                                    type="button"
                                    onClick={() => { window.location.href = tiktokConnect.url('tiktok'); }}
                                    className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> Conectar TikTok
                                </button>
                            ) : (
                                <select
                                    value={data.social_account_id}
                                    onChange={(e) => setData('social_account_id', e.target.value)}
                                    className="flex-1 bg-gray-50 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[#FF5722]"
                                >
                                    {socialAccounts.map((a) => (
                                        <option key={a.id} value={a.id}>@{a.handle}</option>
                                    ))}
                                </select>
                            )}

                            {selectedAccount && (
                                <Avatar className="w-7 h-7 flex-shrink-0">
                                    <AvatarImage src={selectedAccount.avatar ?? undefined} />
                                    <AvatarFallback>{selectedAccount.handle.slice(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            )}
                        </div>

                        {/* Content Type Label */}
                        <div className="border-b border-gray-100 mb-5">
                            <span className="inline-block pb-3 text-sm font-medium text-[#FF5722] border-b-2 border-[#FF5722]">
                                Vídeo
                            </span>
                        </div>

                        {/* Content Project Selector */}
                        {contentProjects.length === 0 ? (
                            <div className="rounded-xl border-2 border-dashed border-gray-200 p-8 mb-5 flex flex-col items-center justify-center gap-2 text-center">
                                <ImageIcon className="w-8 h-8 text-gray-300" />
                                <p className="text-sm text-gray-500">Nenhum projeto de conteúdo ainda</p>
                                <p className="text-xs text-gray-400">Crie um projeto de conteúdo para agendá-lo</p>
                            </div>
                        ) : (
                            <>
                                <div className="relative rounded-xl overflow-hidden mb-3 bg-gray-100 aspect-video">
                                    {selectedProject?.video_url ? (
                                        <img
                                            src={selectedProject.video_url}
                                            alt={selectedProject.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <ImageIcon className="w-10 h-10 text-gray-300" />
                                        </div>
                                    )}
                                </div>

                                <select
                                    value={data.content_project_id}
                                    onChange={(e) => setData('content_project_id', e.target.value)}
                                    className="w-full mb-4 px-3 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#FF5722]"
                                >
                                    {contentProjects.map((p) => (
                                        <option key={p.id} value={p.id}>{p.title}</option>
                                    ))}
                                </select>
                                {errors.content_project_id && (
                                    <p className="text-xs text-red-500 mb-3">{errors.content_project_id}</p>
                                )}
                            </>
                        )}

                        {/* Footer: Date picker + Submit */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <input
                                        type="datetime-local"
                                        value={data.publish_at}
                                        onChange={(e) => setData('publish_at', e.target.value)}
                                        min={new Date().toISOString().slice(0, 16)}
                                        className="text-sm text-gray-700 bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
                                    />
                                </div>
                                {errors.publish_at && (
                                    <p className="text-xs text-red-500 mt-1 ml-6">{errors.publish_at}</p>
                                )}
                            </div>
                            <div className="flex">
                                <Button
                                    type="submit"
                                    disabled={processing || socialAccounts.length === 0 || contentProjects.length === 0}
                                    className="bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-r-none pr-3 disabled:opacity-50"
                                >
                                    {processing ? 'Agendando...' : 'Agendar'}
                                </Button>
                                <Button
                                    type="button"
                                    disabled={processing}
                                    className="bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-l-none border-l border-orange-400/30 px-2 disabled:opacity-50"
                                >
                                    <ChevronRight className="w-4 h-4 rotate-90" />
                                </Button>
                            </div>
                        </div>
                    </form>

                    {/* Right Panel: Calendar */}
                    <div className="flex-1 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 w-full overflow-hidden">

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4">
                            <h2 className="text-base font-semibold text-gray-900">Sua Agenda</h2>
                            <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                                <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button onClick={goToday} className="text-gray-500 hover:text-gray-900 transition-colors">Hoje</button>
                                <span className="text-gray-300">›</span>
                                <span className="min-w-[130px] text-center">{MONTH_NAMES[month - 1]} {year}</span>
                                <button onClick={() => navigate(1)} className="p-1 hover:bg-gray-100 rounded">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600">
                                    <TikTokIcon className="w-3.5 h-3.5" />
                                    TikTok
                                </div>
                                <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#FF5722]">
                                    <option value="">Todos os status</option>
                                    <option value="pending">Pendente</option>
                                    <option value="publishing">Publicando</option>
                                    <option value="published">Publicado</option>
                                    <option value="failed">Falhou</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-1 text-gray-400">
                                <button onClick={() => setView('calendar')} className={`p-1.5 rounded transition-colors ${view === 'calendar' ? 'text-gray-900 bg-gray-100' : 'hover:text-gray-900 hover:bg-gray-50'}`}>
                                    <CalendarIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => setView('grid')} className={`p-1.5 rounded transition-colors ${view === 'grid' ? 'text-gray-900 bg-gray-100' : 'hover:text-gray-900 hover:bg-gray-50'}`}>
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button onClick={() => setView('list')} className={`p-1.5 rounded transition-colors ${view === 'list' ? 'text-gray-900 bg-gray-100' : 'hover:text-gray-900 hover:bg-gray-50'}`}>
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 border-t border-gray-100 pt-4">
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                                <div key={day} className="text-xs font-medium text-gray-400 pb-4">{day}</div>
                            ))}

                            {cells.map((day, i) => {
                                if (day === null) {
                                    return <div key={`empty-${i}`} className="min-h-[90px] border-t border-gray-100" />;
                                }

                                const daySchedules = schedulesByDay[String(day)] ?? [];
                                const isToday = day === todayDay;
                                const hasSchedules = daySchedules.length > 0;

                                return (
                                    <div
                                        key={`day-${day}`}
                                        className={`min-h-[90px] border-t border-gray-100 relative ${isToday ? 'bg-orange-50/40' : ''}`}
                                    >
                                        {hasSchedules && (
                                            <div className="absolute top-[-1px] left-0 right-0 h-0.5 bg-[#FF5722]" />
                                        )}
                                        <div className="p-2">
                                            <span className={`text-sm font-medium ${isToday ? 'text-[#FF5722]' : 'text-gray-900'}`}>
                                                {day}
                                            </span>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {daySchedules.slice(0, 4).map((item) => (
                                                    <div
                                                        key={item.id}
                                                        title={`@${item.social_account.handle} · ${item.content_project.title}`}
                                                        className="w-6 h-6 rounded bg-gray-200 overflow-hidden flex-shrink-0"
                                                    >
                                                        {item.content_project.video_url ? (
                                                            <img
                                                                src={item.content_project.video_url}
                                                                alt={item.content_project.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-orange-300 to-orange-500 flex items-center justify-center">
                                                                <TikTokIcon className="w-3 h-3 text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {daySchedules.length > 4 && (
                                                    <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-[10px] font-medium text-gray-500">
                                                        +{daySchedules.length - 4}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
