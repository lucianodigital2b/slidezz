import { Link, usePage } from '@inertiajs/react';
import {
    Home, Play, Activity, CalendarDays,
    Zap, Layers, Images, Database,
    ChevronDown, Plus,
} from 'lucide-react';

interface Props {
    children: React.ReactNode;
    activeItem?: string;
}

const NAV_ITEMS = [
    { key: 'home', label: 'Início', icon: Home, href: '/dashboard' },
    { key: 'library', label: 'Biblioteca', icon: Play, href: '/library' },
    { key: 'analytics', label: 'Analytics', icon: Activity, href: '/analytics' },
    { key: 'schedule', label: 'Agenda', icon: CalendarDays, href: '/schedule' },
];

const SLIDESHOW_ITEMS = [
    { key: 'automations', label: 'Automações', icon: Zap, href: '/automations' },
    { key: 'slideshow-editor', label: 'Editor de Slideshow', icon: Layers, href: '/slideshow-editor' },
    { key: 'image-collections', label: 'Coleções de Imagens', icon: Images, href: '/image-collections' },
    { key: 'database', label: 'Banco de Dados', icon: Database, href: '/database' },
];

function NavLink({ item, active }: { item: typeof NAV_ITEMS[number]; active: boolean }) {
    return (
        <Link
            href={item.href}
            className={`flex items-center gap-2.5 px-3 py-[7px] rounded-md text-sm transition-colors mb-0.5 ${
                active
                    ? 'bg-[#E5E4DE] text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-[#E8E7E1] hover:text-gray-900'
            }`}
        >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {item.label}
        </Link>
    );
}

export default function SlidezzLayout({ children, activeItem }: Props) {
    return (
        <div className="min-h-screen flex" style={{ background: '#F2F1EB' }}>
            <aside
                className="flex flex-col flex-shrink-0 h-screen sticky top-0 overflow-y-auto"
                style={{ width: 210, background: '#F2F1EB', borderRight: '1px solid #E0DFD9' }}
            >
                <div className="p-3 pt-4">
                    <button className="w-full flex items-center gap-2 bg-[#FFE156] hover:bg-[#E6CB4D] text-[#1A1A1A] rounded-lg px-3 py-2 text-sm font-medium transition-colors">
                        <Plus className="w-4 h-4 flex-shrink-0" />
                        Nova Automação
                    </button>
                </div>

                <nav className="flex-1 px-2 py-1">
                    {NAV_ITEMS.map((item) => (
                        <NavLink key={item.key} item={item} active={activeItem === item.key} />
                    ))}

                    <p className="mt-4 mb-1 px-3 text-xs text-[#999993] font-medium tracking-wide">Slideshows</p>

                    {SLIDESHOW_ITEMS.map((item) => (
                        <NavLink key={item.key} item={item} active={activeItem === item.key} />
                    ))}
                </nav>

                <div className="p-2 pb-4">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-500 hover:bg-[#E8E7E1] transition-colors w-full">
                        Mais ferramentas
                        <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                </div>
            </aside>

            <main className="flex-1 overflow-auto" style={{ background: '#F2F1EB' }}>
                {children}
            </main>
        </div>
    );
}
