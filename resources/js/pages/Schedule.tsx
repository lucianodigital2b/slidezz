import { Head } from '@inertiajs/react';
import { dashboard } from '@/routes';
import { Search, Bell, Mail, MoreVertical, Plus, Edit3, Image as ImageIcon, Smile, LayoutGrid, List, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Home, Calendar, Folder, Users, FileText, Clock, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';

export default function Schedule() {
    return (
        <div className="min-h-screen bg-[#F8F9FB] text-neutral-900 font-sans flex flex-col md:flex-row overflow-hidden">
            <Head title="Schedule" />

            {/* Sidebar Lateral Menu */}
            <aside className="hidden md:flex flex-col items-center py-6 w-20 bg-white border-r border-gray-100 flex-shrink-0 z-10">
                <div className="mb-10 text-orange-500">
                    {/* Logo Placeholder */}
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sun">
                        <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
                    </svg>
                </div>
                
                <nav className="flex flex-col gap-6 w-full items-center">
                    <button className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors">
                        <Home className="w-5 h-5" />
                    </button>
                    <button className="p-3 text-white bg-[#FF5722] rounded-xl shadow-sm shadow-orange-200 transition-colors">
                        <Calendar className="w-5 h-5" />
                    </button>
                    <button className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors">
                        <Folder className="w-5 h-5" />
                    </button>
                    <button className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors">
                        <Users className="w-5 h-5" />
                    </button>
                    <button className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors">
                        <FileText className="w-5 h-5" />
                    </button>
                    <button className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors">
                        <Clock className="w-5 h-5" />
                    </button>
                </nav>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                
                {/* Top Nav */}
                <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0 z-10">
                    <div className="flex-1"></div>
                    
                    {/* Center Pill Nav */}
                    <div className="hidden lg:flex items-center bg-gray-50/80 rounded-full px-1 py-1 border border-gray-100">
                        <button className="px-6 py-2 text-sm font-medium text-gray-900 bg-white rounded-full shadow-sm">Project</button>
                        <button className="px-6 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Task</button>
                        <button className="px-6 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Tools</button>
                        <button className="px-6 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Team</button>
                        <button className="px-6 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Analytics</button>
                    </div>

                    <div className="flex-1 flex justify-end items-center gap-4">
                        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full border border-gray-200">
                            <Mail className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full border border-gray-200 relative">
                            <Bell className="w-4 h-4" />
                            <span className="absolute top-1.5 right-2 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        </button>
                        <Avatar className="w-8 h-8 cursor-pointer ring-2 ring-gray-100">
                            <AvatarImage src="https://i.pravatar.cc/150?img=47" />
                            <AvatarFallback>JD</AvatarFallback>
                        </Avatar>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-8">
                    
                    {/* Page Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-semibold text-gray-900 mb-1">Schedule</h1>
                            <p className="text-gray-500 text-sm">Manage and track your scheduled uploads to ensure everything goes as planned</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative w-64">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <Input placeholder="Search ..." className="pl-9 bg-white border-gray-200 rounded-lg focus-visible:ring-[#FF5722]" />
                            </div>
                            <Button className="bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-lg flex items-center gap-2">
                                <Settings className="w-4 h-4" />
                                Post Setting
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-6 items-start">
                        
                        {/* Left Panel: Create Schedule */}
                        <div className="w-full lg:w-[400px] bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex-shrink-0">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-semibold text-gray-900">Create Schedule</h2>
                                <button className="text-gray-400 hover:text-gray-600"><MoreVertical className="w-5 h-5" /></button>
                            </div>

                            {/* Account Selector */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                    <Avatar className="w-6 h-6">
                                        <AvatarImage src="https://i.pravatar.cc/150?img=33" />
                                        <AvatarFallback>AT</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium text-gray-700">@AnjasTravel</span>
                                    <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">in</button>
                                    <button className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">ig</button>
                                    <button className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50">fb</button>
                                    <button className="w-7 h-7 rounded-full border border-orange-200 text-orange-500 flex items-center justify-center hover:bg-orange-50">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-gray-100 mb-5">
                                <button className="flex-1 pb-3 text-sm font-medium text-[#FF5722] border-b-2 border-[#FF5722]">Post</button>
                                <button className="flex-1 pb-3 text-sm font-medium text-gray-500 hover:text-gray-700">Story</button>
                                <button className="flex-1 pb-3 text-sm font-medium text-gray-500 hover:text-gray-700">Reel</button>
                            </div>

                            {/* Media Preview */}
                            <div className="relative rounded-xl overflow-hidden mb-5 bg-gray-100 aspect-video">
                                <img src="https://images.unsplash.com/photo-1541625602330-2277a4c46182?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" alt="Mountain Biking" className="w-full h-full object-cover" />
                            </div>

                            {/* Caption Textarea */}
                            <div className="mb-4">
                                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                                    Experience the ultimate thrill of mountain biking as you conquer rugged trails, enjoy breathtaking scenery, and tackle adrenaline-pumping descents. Challenge yourself, push your limits, and embrace the excitement of outdoor adventure on two wheels!
                                </p>
                                <p className="text-sm text-[#FF5722]">#MountainBiking #OutdoorAdventure #TrailRiding #AdrenalineRush</p>
                            </div>

                            {/* AI Actions */}
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-2">
                                    <button className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FF5722] text-[#FF5722] text-sm font-medium hover:bg-orange-50 transition-colors">
                                        <Edit3 className="w-4 h-4" />
                                        Rewrite With AI
                                    </button>
                                    <button className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">
                                        <ImageIcon className="w-4 h-4" />
                                        Continue
                                    </button>
                                </div>
                                <button className="text-gray-400 hover:text-gray-600"><Smile className="w-5 h-5" /></button>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <button className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg transition-colors">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    Sept 17, 12:22 PM
                                    <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
                                </button>
                                <div className="flex">
                                    <Button className="bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-r-none pr-3">
                                        Schedule
                                    </Button>
                                    <Button className="bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-l-none border-l border-orange-400/30 px-2">
                                        <ChevronRight className="w-4 h-4 rotate-90" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Right Panel: Calendar */}
                        <div className="flex-1 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 w-full overflow-hidden">
                            
                            {/* Calendar Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                                <h2 className="text-lg font-semibold text-gray-900">Your Schedule</h2>
                                <div className="flex items-center gap-4 text-sm font-medium text-gray-700">
                                    <button className="p-1 hover:bg-gray-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
                                    <span className="min-w-[120px] text-center">Today <span className="text-gray-400 mx-1">›</span> 19 Sept 2024</span>
                                    <button className="p-1 hover:bg-gray-100 rounded"><ChevronRight className="w-4 h-4" /></button>
                                </div>
                            </div>

                            {/* Calendar Filters */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-6">
                                    <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                                        Social Account <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
                                    </button>
                                    <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                                        Post Status <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-1 text-gray-400">
                                    <button className="p-1.5 text-gray-900 bg-gray-50 rounded"><CalendarIcon className="w-4 h-4" /></button>
                                    <button className="p-1.5 hover:text-gray-900 hover:bg-gray-50 rounded"><LayoutGrid className="w-4 h-4" /></button>
                                    <button className="p-1.5 hover:text-gray-900 hover:bg-gray-50 rounded"><List className="w-4 h-4" /></button>
                                </div>
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 border-t border-gray-100 pt-4">
                                {/* Days of Week */}
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                    <div key={day} className="text-xs font-medium text-gray-400 pb-4">
                                        {day}
                                    </div>
                                ))}

                                {/* Week 1 */}
                                {[
                                    { day: 1, posts: [1, 2], line: '#FF5722' },
                                    { day: 2, posts: [], line: 'transparent' },
                                    { day: 3, posts: [], line: 'transparent' },
                                    { day: 4, posts: [], line: 'transparent' },
                                    { day: 5, posts: [], line: 'transparent' },
                                    { day: 6, posts: [1, 2, 3], line: '#FF5722' },
                                    { day: 7, posts: [], line: 'transparent' },
                                ].map((d, i) => (
                                    <div key={`w1-${i}`} className="min-h-[100px] border-t border-gray-100 relative">
                                        <div className="absolute top-[-1px] left-0 right-0 h-0.5 bg-[#FF5722] opacity-0" style={{ opacity: d.line !== 'transparent' ? 1 : 0 }}></div>
                                        <div className="p-2">
                                            <span className="text-sm font-medium text-gray-900">{d.day}</span>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {d.posts.map(p => (
                                                    <div key={p} className="w-6 h-6 rounded bg-gray-200 overflow-hidden">
                                                        <img src={`https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=40&q=60`} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Week 2 */}
                                {[
                                    { day: 8, posts: [], line: 'transparent' },
                                    { day: 9, posts: [], line: 'transparent' },
                                    { day: 10, posts: [1], line: '#FF5722' },
                                    { day: 11, posts: [], line: 'transparent' },
                                    { day: 12, posts: [], line: 'transparent' },
                                    { day: 13, posts: [], line: 'transparent' },
                                    { day: 14, posts: [], line: 'transparent' },
                                ].map((d, i) => (
                                    <div key={`w2-${i}`} className="min-h-[100px] border-t border-gray-100 relative">
                                        <div className="absolute top-[-1px] left-0 right-0 h-0.5 bg-[#FF5722] opacity-0" style={{ opacity: d.line !== 'transparent' ? 1 : 0 }}></div>
                                        <div className="p-2">
                                            <span className="text-sm font-medium text-gray-900">{d.day}</span>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {d.posts.map(p => (
                                                    <div key={p} className="w-6 h-6 rounded bg-gray-200 overflow-hidden">
                                                        <img src={`https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=40&q=60`} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Week 3 (With active day) */}
                                {[
                                    { day: 15, posts: [1, 2], line: '#FF5722' },
                                    { day: 16, posts: [], line: 'transparent' },
                                    { day: 17, posts: [], line: 'transparent' },
                                    { day: 18, posts: [], line: 'transparent' },
                                    { day: 19, posts: [1, 2, 3], line: '#FF5722', active: true },
                                    { day: 20, posts: [], line: 'transparent' },
                                    { day: 21, posts: [], line: 'transparent' },
                                ].map((d, i) => (
                                    <div key={`w3-${i}`} className={`min-h-[100px] border-t border-gray-100 relative ${d.active ? 'bg-orange-50/50' : ''}`}>
                                        <div className="absolute top-[-1px] left-0 right-0 h-0.5 bg-[#FF5722] opacity-0" style={{ opacity: d.line !== 'transparent' ? 1 : 0 }}></div>
                                        <div className="p-2">
                                            <span className={`text-sm font-medium ${d.active ? 'text-[#FF5722]' : 'text-gray-900'}`}>{d.day}</span>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {d.posts.map(p => (
                                                    <div key={p} className="w-6 h-6 rounded bg-gray-200 overflow-hidden">
                                                        <img src={`https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=40&q=60`} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Week 4 */}
                                {[
                                    { day: 22, posts: [], line: 'transparent' },
                                    { day: 23, posts: [], line: 'transparent' },
                                    { day: 24, posts: [], line: 'transparent' },
                                    { day: 25, posts: [], line: 'transparent' },
                                    { day: 26, posts: [], line: 'transparent' },
                                    { day: 27, posts: [], line: 'transparent' },
                                    { day: 28, posts: [1, 2], line: '#FF5722' },
                                ].map((d, i) => (
                                    <div key={`w4-${i}`} className="min-h-[100px] border-t border-gray-100 relative">
                                        <div className="absolute top-[-1px] left-0 right-0 h-0.5 bg-[#FF5722] opacity-0" style={{ opacity: d.line !== 'transparent' ? 1 : 0 }}></div>
                                        <div className="p-2">
                                            <span className="text-sm font-medium text-gray-900">{d.day}</span>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {d.posts.map(p => (
                                                    <div key={p} className="w-6 h-6 rounded bg-gray-200 overflow-hidden">
                                                        <img src={`https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=40&q=60`} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Week 5 */}
                                {[
                                    { day: 29, posts: [], line: 'transparent' },
                                    { day: 30, posts: [], line: 'transparent' },
                                ].map((d, i) => (
                                    <div key={`w5-${i}`} className="min-h-[100px] border-t border-gray-100 relative">
                                        <div className="absolute top-[-1px] left-0 right-0 h-0.5 bg-[#FF5722] opacity-0" style={{ opacity: d.line !== 'transparent' ? 1 : 0 }}></div>
                                        <div className="p-2">
                                            <span className="text-sm font-medium text-gray-900">{d.day}</span>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {d.posts.map(p => (
                                                    <div key={p} className="w-6 h-6 rounded bg-gray-200 overflow-hidden">
                                                        <img src={`https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&w=40&q=60`} className="w-full h-full object-cover" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
