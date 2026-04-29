import { Head, router, usePage } from '@inertiajs/react';
import { index as socialAccountsIndex, connect, destroy } from '@/routes/social-accounts';
import { schedule } from '@/routes';
import {
    Home, Calendar, Folder, Users, FileText, Clock,
    Mail, Bell, Plus, Trash2, CheckCircle, AlertCircle, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SocialAccount {
    id: number;
    workspace_id: number;
    provider: string;
    handle: string;
    avatar: string | null;
    expires_at: string | null;
    created_at: string;
}

interface Props {
    accounts: SocialAccount[];
}

const PROVIDERS = [
    { key: 'tiktok', label: 'TikTok', color: '#010101', textColor: '#fff' },
    { key: 'instagram', label: 'Instagram', color: '#E1306C', textColor: '#fff' },
    { key: 'youtube', label: 'YouTube', color: '#FF0000', textColor: '#fff' },
];

function providerLabel(provider: string): string {
    return PROVIDERS.find((p) => p.key === provider)?.label ?? provider;
}

function isExpired(expiresAt: string | null): boolean {
    if (!expiresAt) { return false; }
    return new Date(expiresAt) < new Date();
}

export default function SocialAccountsIndex({ accounts }: Props) {
    const { props } = usePage<{ flash?: { success?: string; error?: string } }>();
    const flash = props.flash;

    const handleConnect = (provider: string) => {
        window.location.href = connect.url(provider);
    };

    const handleDisconnect = (account: SocialAccount) => {
        if (!confirm(`Desconectar @${account.handle} de ${providerLabel(account.provider)}?`)) { return; }
        router.delete(destroy.url(account.id), { preserveScroll: true });
    };

    const connectedProviders = new Set(accounts.map((a) => a.provider));

    return (
        <div className="min-h-screen bg-[#F8F9FB] text-neutral-900 font-sans flex flex-col md:flex-row overflow-hidden">
            <Head title="Contas Conectadas" />

            {/* Sidebar */}
            <aside className="hidden md:flex flex-col items-center py-6 w-20 bg-white border-r border-gray-100 flex-shrink-0">
                <div className="mb-10 text-orange-500">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
                    </svg>
                </div>
                <nav className="flex flex-col gap-6 w-full items-center">
                    <button className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"><Home className="w-5 h-5" /></button>
                    <button onClick={() => router.visit(schedule.url())} className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"><Calendar className="w-5 h-5" /></button>
                    <button className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"><Folder className="w-5 h-5" /></button>
                    <button className="p-3 text-white bg-[#FF5722] rounded-xl shadow-sm shadow-orange-200"><Users className="w-5 h-5" /></button>
                    <button className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"><FileText className="w-5 h-5" /></button>
                    <button className="p-3 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-colors"><Clock className="w-5 h-5" /></button>
                </nav>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 flex-shrink-0">
                    <div className="flex-1" />
                    <div className="flex-1 flex justify-end items-center gap-4">
                        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full border border-gray-200"><Mail className="w-4 h-4" /></button>
                        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full border border-gray-200 relative">
                            <Bell className="w-4 h-4" />
                            <span className="absolute top-1.5 right-2 w-1.5 h-1.5 bg-red-500 rounded-full" />
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-semibold text-gray-900 mb-1">Contas Conectadas</h1>
                        <p className="text-gray-500 text-sm">Conecte suas contas de redes sociais para começar a agendar publicações</p>
                    </div>

                    {flash?.success && (
                        <div className="mb-6 flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 rounded-xl px-4 py-3 text-sm">
                            <CheckCircle className="w-4 h-4 flex-shrink-0" />
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-6 flex items-center gap-2 bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {flash.error}
                        </div>
                    )}

                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 mb-10">
                        {PROVIDERS.map((provider) => {
                            const connected = accounts.filter((a) => a.provider === provider.key);
                            return (
                                <div key={provider.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-base font-semibold text-gray-900">{provider.label}</span>
                                        {!connectedProviders.has(provider.key) && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleConnect(provider.key)}
                                                className="bg-[#FF5722] hover:bg-[#E64A19] text-white rounded-lg flex items-center gap-1.5 text-xs"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                Conectar
                                            </Button>
                                        )}
                                    </div>

                                    {connected.length === 0 ? (
                                        <p className="text-sm text-gray-400">Nenhuma conta conectada</p>
                                    ) : (
                                        <div className="flex flex-col gap-3">
                                            {connected.map((account) => (
                                                <div key={account.id} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <Avatar className="w-9 h-9 flex-shrink-0">
                                                            <AvatarImage src={account.avatar ?? undefined} />
                                                            <AvatarFallback>{account.handle.slice(0, 2).toUpperCase()}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-gray-900 truncate">@{account.handle}</p>
                                                            {isExpired(account.expires_at) ? (
                                                                <p className="text-xs text-red-500 flex items-center gap-1">
                                                                    <AlertCircle className="w-3 h-3" /> Token expirado
                                                                </p>
                                                            ) : (
                                                                <p className="text-xs text-green-600 flex items-center gap-1">
                                                                    <CheckCircle className="w-3 h-3" /> Ativo
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        {isExpired(account.expires_at) && (
                                                            <button
                                                                onClick={() => handleConnect(provider.key)}
                                                                title="Reconectar"
                                                                className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                                                            >
                                                                <RefreshCw className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDisconnect(account)}
                                                            title="Desconectar"
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => handleConnect(provider.key)}
                                                className="text-xs text-[#FF5722] hover:underline flex items-center gap-1 mt-1"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Adicionar outra conta {provider.label}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </main>
            </div>
        </div>
    );
}
