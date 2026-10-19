import { Head, Link, router } from '@inertiajs/react';
import { Bot, ChevronDown, Download, Loader2, PanelLeftClose, PanelLeftOpen, Plus, SendHorizonal, Wrench } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { csrfHeaders } from '@/lib/csrf';

// ─── Contract types ────────────────────────────────────────────────────────────

type ConversationListItem = {
    id: number;
    title: string;
    updated_at: string;
};

type Tool = {
    name: string;
    label: string;
};

type DisplayMessage = {
    id: number;
    role: 'user' | 'assistant';
    text: string;
    images: string[];
    tools: Tool[];
};

type Slide = {
    index: number;
    url: string;
    text: string;
};

type PublishRequest = {
    id: number;
    status: 'pending' | 'confirmed' | 'cancelled';
    account: {
        id: number;
        provider: string;
        name: string;
    };
    publish_at: string;
    caption: string;
};

type AgentState = {
    status: 'idle' | 'running' | 'error';
    error: string | null;
    title: string;
    messages: DisplayMessage[];
    slides: Slide[];
    publish_requests: PublishRequest[];
};

type AgentConversation = {
    id: number;
} & AgentState;

type Props = {
    conversations: ConversationListItem[];
    conversation: AgentConversation | null;
    hasAnthropicKey: boolean;
    credits: number;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function linkify(text: string): ReactNode[] {
    const urlRe = /(https?:\/\/[^\s<]+)/g;
    const nodes: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = urlRe.exec(text))) {
        if (match.index > lastIndex) {
            nodes.push(text.slice(lastIndex, match.index));
        }

        nodes.push(
            <a
                key={match.index}
                href={match[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#1A1A1A] underline underline-offset-2 transition-colors hover:text-[#888880]"
            >
                {match[0]}
            </a>,
        );

        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        nodes.push(text.slice(lastIndex));
    }

    return nodes;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatPublishAt(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

// ─── Preview panel ──────────────────────────────────────────────────────────────

function PreviewPanel({
    slides,
    publishRequests,
    busyPublishId,
    expandedCaption,
    setExpandedCaption,
    onConfirm,
    onCancel,
}: {
    slides: Slide[];
    publishRequests: PublishRequest[];
    busyPublishId: number | null;
    expandedCaption: number | null;
    setExpandedCaption: (id: number | null) => void;
    onConfirm: (request: PublishRequest) => void;
    onCancel: (request: PublishRequest) => void;
}) {
    const { t } = useTranslation();

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-[#E8E7E2] px-4 py-3 text-xs font-bold tracking-[0.18em] text-[#888880] uppercase">
                {t('agent.preview.title')}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {slides.length > 0 ? (
                    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
                        {slides.map((slide) => (
                            <div key={slide.index} className="w-44 shrink-0 snap-center">
                                <div className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-[#E8E7E2] bg-white">
                                    <img
                                        src={slide.url}
                                        alt={t('agent.preview.slide', { index: slide.index + 1 })}
                                        className="h-full w-full object-cover"
                                    />
                                    <span className="absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                                        {slide.index + 1}
                                    </span>
                                </div>

                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <span className="truncate text-xs font-semibold text-[#555550]">
                                        {t('agent.preview.slide', { index: slide.index + 1 })}
                                    </span>
                                    <a
                                        href={slide.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex shrink-0 items-center gap-1 text-xs font-bold text-[#1A1A1A] underline underline-offset-2 transition-colors hover:text-[#888880]"
                                    >
                                        <Download className="h-3 w-3" />
                                        {t('agent.preview.download')}
                                    </a>
                                </div>

                                {slide.text && (
                                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#888880]">{slide.text}</p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm leading-relaxed text-[#888880]">{t('agent.preview.empty')}</p>
                )}

                {publishRequests.length > 0 && (
                    <div className="mt-6 space-y-3">
                        <h3 className="text-xs font-bold tracking-[0.18em] text-[#888880] uppercase">
                            {t('agent.preview.publishRequests')}
                        </h3>

                        {publishRequests.map((request) => {
                            const expanded = expandedCaption === request.id;

                            return (
                                <div key={request.id} className="rounded-2xl border border-[#E8E7E2] bg-[#F9F6F4] p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-[#1A1A1A]">{request.account.name}</span>
                                            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#555550] uppercase">
                                                {request.account.provider}
                                            </span>
                                        </div>

                                        {request.status === 'confirmed' && (
                                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                                                {t('agent.preview.scheduled')}
                                            </span>
                                        )}

                                        {request.status === 'cancelled' && (
                                            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                                                {t('agent.preview.cancelled')}
                                            </span>
                                        )}
                                    </div>

                                    <p className="mt-1 text-xs font-medium text-[#888880]">{formatPublishAt(request.publish_at)}</p>

                                    <div className="mt-3">
                                        <p className={`text-sm leading-relaxed text-[#1A1A1A] ${expanded ? '' : 'line-clamp-3'}`}>
                                            {request.caption}
                                        </p>
                                        {request.caption.length > 120 && (
                                            <button
                                                type="button"
                                                onClick={() => setExpandedCaption(expanded ? null : request.id)}
                                                className="mt-1 text-xs font-bold text-[#555550] underline underline-offset-2 hover:text-[#1A1A1A]"
                                            >
                                                {expanded ? t('agent.preview.collapseCaption') : t('agent.preview.expandCaption')}
                                            </button>
                                        )}
                                    </div>

                                    {request.status === 'pending' && (
                                        <div className="mt-4 flex items-center gap-2">
                                            <button
                                                type="button"
                                                disabled={busyPublishId === request.id}
                                                onClick={() => onConfirm(request)}
                                                className="flex-1 rounded-full bg-[#1A1A1A] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
                                            >
                                                {t('agent.preview.confirm')}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={busyPublishId === request.id}
                                                onClick={() => onCancel(request)}
                                                className="flex-1 rounded-full border border-[#E8E7E2] bg-white px-4 py-2 text-sm font-bold text-[#1A1A1A] transition-colors hover:border-[#1A1A1A] disabled:opacity-50"
                                            >
                                                {t('agent.preview.cancel')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Agent({ conversations, conversation: initialConversation, hasAnthropicKey, credits }: Props) {
    const { t } = useTranslation();
    const [conversation, setConversation] = useState<AgentConversation | null>(initialConversation);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
    const [outOfCredits, setOutOfCredits] = useState(false);
    const [busyPublishId, setBusyPublishId] = useState<number | null>(null);
    const [expandedCaption, setExpandedCaption] = useState<number | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        setConversation(initialConversation);
        setSending(false);
    }, [initialConversation]);

    // Poll while the agent is running.
    useEffect(() => {
        if (!conversation || conversation.status !== 'running') {
            return;
        }

        let cancelled = false;
        const interval = window.setInterval(async () => {
            try {
                const res = await fetch(`/agent/${conversation.id}/state`, {
                    headers: { Accept: 'application/json', ...csrfHeaders() },
                });

                if (!res.ok) {
                    return;
                }

                const state = (await res.json()) as AgentState;

                if (!cancelled) {
                    setConversation((prev) => (prev ? { ...prev, ...state } : prev));
                }
            } catch {
                // Keep polling on transient network errors.
            }
        }, 1500);

        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [conversation?.id, conversation?.status]);

    // Auto-scroll to the latest message / typing indicator.
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversation?.messages.length, conversation?.status]);

    async function sendMessage() {
        const trimmed = message.trim();

        if (!trimmed || sending || conversation?.status === 'running') {
            return;
        }

        // Brand-new conversation -> Inertia POST /agent, then redirect to /agent/{id}.
        if (!conversation) {
            setSending(true);
            router.post(
                '/agent',
                { message: trimmed },
                {
                    onError: (errors) => {
                        setMessage(trimmed);

                        if (errors.message === 'no_credits') {
                            setOutOfCredits(true);
                        }
                    },
                    onFinish: () => setSending(false),
                },
            );
            setMessage('');
            return;
        }

        const previous = conversation;
        const optimisticMessage: DisplayMessage = {
            id: Date.now(),
            role: 'user',
            text: trimmed,
            images: [],
            tools: [],
        };

        setConversation({
            ...previous,
            status: 'running',
            error: null,
            messages: [...previous.messages, optimisticMessage],
        });
        setMessage('');
        setSending(true);
        setOutOfCredits(false);

        try {
            const res = await fetch(`/agent/${previous.id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...csrfHeaders(),
                },
                body: JSON.stringify({ message: trimmed }),
            });

            if (res.status === 402) {
                setConversation(previous);
                setMessage(trimmed);
                setOutOfCredits(true);
                return;
            }

            if (res.status === 409) {
                // Already running: let polling pick it up.
                setConversation(previous);
                return;
            }

            if (!res.ok) {
                setConversation((prev) => (prev ? { ...prev, status: 'error', error: t('agent.error.generic') } : prev));
            }
            // 202: accepted. Polling updates the state.
        } catch {
            setConversation((prev) => (prev ? { ...prev, status: 'error', error: t('agent.error.generic') } : prev));
        } finally {
            setSending(false);
        }
    }

    async function handlePublishAction(request: PublishRequest, action: 'confirm' | 'cancel') {
        setBusyPublishId(request.id);
        setActionError(null);

        try {
            const res = await fetch(`/agent/publish-requests/${request.id}/${action}`, {
                method: 'POST',
                headers: { Accept: 'application/json', ...csrfHeaders() },
            });

            if (!res.ok) {
                throw new Error();
            }

            const state = (await res.json()) as AgentState;
            setConversation((prev) => (prev ? { ...prev, ...state } : prev));
        } catch {
            setActionError(t(action === 'confirm' ? 'agent.error.confirmFailed' : 'agent.error.cancelFailed'));
        } finally {
            setBusyPublishId(null);
        }
    }

    const examplePrompts = useMemo(
        () => [t('agent.examplePrompts.tiktok'), t('agent.examplePrompts.pricing'), t('agent.examplePrompts.sales')],
        [t],
    );

    const preview = (
        <PreviewPanel
            slides={conversation?.slides ?? []}
            publishRequests={conversation?.publish_requests ?? []}
            busyPublishId={busyPublishId}
            expandedCaption={expandedCaption}
            setExpandedCaption={setExpandedCaption}
            onConfirm={(request) => handlePublishAction(request, 'confirm')}
            onCancel={(request) => handlePublishAction(request, 'cancel')}
        />
    );

    const showMobilePreview = conversation && (conversation.slides.length > 0 || conversation.publish_requests.length > 0);
    const busy = sending || conversation?.status === 'running';

    return (
        <>
            <Head title={t('agent.pageTitle')} />

            <div className="flex h-[calc(100dvh-4rem)] w-full overflow-hidden bg-[#F9F6F4] text-[#1A1A1A]">
                {/* Conversation list: hidden on mobile, collapsible on desktop. */}
                {!sidebarCollapsed && (
                    <aside className="hidden w-64 shrink-0 flex-col border-r border-[#E8E7E2] bg-white lg:flex">
                        <div className="border-b border-[#E8E7E2] p-3">
                            <Link
                                href="/agent"
                                className="flex items-center justify-center gap-2 rounded-full bg-[#1A1A1A] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-black"
                            >
                                <Plus className="h-4 w-4" />
                                {t('agent.newConversation')}
                            </Link>
                        </div>

                        <nav className="min-h-0 flex-1 overflow-y-auto p-3">
                            <p className="px-2 pb-2 text-[10px] font-bold tracking-[0.18em] text-[#888880] uppercase">
                                {t('agent.conversations')}
                            </p>

                            <div className="space-y-1">
                                {conversations.map((item) => (
                                    <Link
                                        key={item.id}
                                        href={`/agent/${item.id}`}
                                        className={`block rounded-xl px-3 py-2 transition-colors ${
                                            conversation?.id === item.id ? 'bg-[#FFE156]/15 ring-1 ring-[#FFE156]' : 'hover:bg-[#F3F0EC]'
                                        }`}
                                    >
                                        <span className="block truncate text-sm font-semibold text-[#1A1A1A]">{item.title}</span>
                                        <span className="mt-0.5 block text-[10px] font-medium text-[#888880]">
                                            {formatDate(item.updated_at)}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </nav>
                    </aside>
                )}

                {/* Main conversation column. */}
                <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex shrink-0 items-center gap-2 border-b border-[#E8E7E2] bg-white px-4 py-3">
                        <button
                            type="button"
                            onClick={() => setSidebarCollapsed((prev) => !prev)}
                            className="hidden rounded-lg p-2 text-[#555550] transition-colors hover:bg-[#F3F0EC] hover:text-[#1A1A1A] lg:inline-flex"
                        >
                            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                        </button>

                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold tracking-[0.18em] text-[#888880] uppercase">{t('agent.pageTitle')}</p>
                            <h1 className="truncate text-sm font-bold text-[#1A1A1A]">
                                {conversation?.title || t('agent.newConversation')}
                            </h1>
                        </div>

                        <Link
                            href="/agent"
                            className="inline-flex rounded-lg p-2 text-[#555550] transition-colors hover:bg-[#F3F0EC] hover:text-[#1A1A1A] lg:hidden"
                            aria-label={t('agent.newConversation')}
                        >
                            <Plus className="h-4 w-4" />
                        </Link>
                    </div>

                    {conversation?.status === 'error' && conversation.error && (
                        <div className="mx-4 mt-4 shrink-0 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                            <p className="font-bold">{conversation.error}</p>
                            <p className="mt-1 text-xs text-red-700">{t('agent.message.tryAgain')}</p>
                        </div>
                    )}

                    {actionError && (
                        <div className="mx-4 mt-4 shrink-0 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-900">
                            {actionError}
                        </div>
                    )}

                    {/* Empty state. */}
                    {!conversation && (
                        <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-10">
                            <div className="w-full max-w-lg text-center">
                                <Bot className="mx-auto h-10 w-10 text-[#1A1A1A]" />
                                <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#1A1A1A]">{t('agent.emptyTitle')}</h2>
                                <p className="mt-2 text-lg leading-relaxed font-medium text-[#555550]">{t('agent.emptySubtitle')}</p>

                                <div className="mt-8 grid gap-3">
                                    {examplePrompts.map((prompt) => (
                                        <button
                                            key={prompt}
                                            type="button"
                                            onClick={() => {
                                                setMessage(prompt);
                                                textareaRef.current?.focus();
                                            }}
                                            className="rounded-2xl border border-[#E8E7E2] bg-white px-5 py-3 text-left text-sm leading-relaxed font-semibold text-[#1A1A1A] transition-all hover:-translate-y-0.5 hover:border-[#FFE156] hover:shadow-[0_16px_36px_rgba(232,68,10,0.10)]"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Messages. */}
                    {conversation && (
                        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                            <div className="mx-auto w-full max-w-3xl space-y-5">
                                {conversation.messages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div
                                            className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                                                msg.role === 'user'
                                                    ? 'bg-[#FFE156] text-[#1A1A1A]'
                                                    : 'border border-[#E8E7E2] bg-white text-[#1A1A1A]'
                                            }`}
                                        >
                                            {msg.role === 'assistant' && msg.tools.length > 0 && (
                                                <div className="mb-2 flex flex-wrap gap-1.5">
                                                    {msg.tools.map((tool, index) => (
                                                        <span
                                                            key={`${tool.name}-${index}`}
                                                            className="inline-flex items-center gap-1 rounded-full bg-[#F3F0EC] px-2 py-1 text-[10px] font-bold text-[#555550]"
                                                        >
                                                            <Wrench className="h-2.5 w-2.5" />
                                                            {tool.label}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {msg.text && (
                                                <div className="text-sm leading-relaxed break-words whitespace-pre-wrap">{linkify(msg.text)}</div>
                                            )}

                                            {msg.images.length > 0 && (
                                                <div className="mt-3 grid grid-cols-2 gap-2">
                                                    {msg.images.map((image, index) => (
                                                        <a
                                                            key={`${msg.id}-image-${index}`}
                                                            href={image}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="overflow-hidden rounded-xl border border-[#E8E7E2] bg-white"
                                                        >
                                                            <img src={image} alt="" className="h-full w-full object-cover" />
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {conversation.status === 'running' && (
                                    <div className="flex justify-start">
                                        <div className="rounded-2xl border border-[#E8E7E2] bg-white px-4 py-3">
                                            <div className="flex items-center gap-1.5">
                                                {[0, 150, 300].map((delay) => (
                                                    <span
                                                        key={delay}
                                                        className="h-2 w-2 animate-bounce rounded-full bg-[#1A1A1A]"
                                                        style={{ animationDelay: `${delay}ms` }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>
                        </div>
                    )}

                    {/* Mobile preview: collapsed between messages and composer. */}
                    {showMobilePreview && (
                        <div className="shrink-0 border-t border-[#E8E7E2] bg-white lg:hidden">
                            <button
                                type="button"
                                onClick={() => setMobilePreviewOpen((prev) => !prev)}
                                className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-[#1A1A1A]"
                            >
                                <span>{t('agent.preview.slidesCount', { count: conversation?.slides.length ?? 0 })}</span>
                                <ChevronDown
                                    className={`h-4 w-4 text-[#888880] transition-transform ${mobilePreviewOpen ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {mobilePreviewOpen && <div className="h-80 border-t border-[#E8E7E2]">{preview}</div>}
                        </div>
                    )}

                    {/* Composer. */}
                    <div className="shrink-0 border-t border-[#E8E7E2] bg-white px-4 py-3 sm:px-6">
                        <div className="mx-auto w-full max-w-3xl">
                            {outOfCredits && (
                                <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                    <p className="font-bold">{t('agent.composer.outOfCreditsTitle')}</p>
                                    <p className="mt-1">{t('agent.composer.outOfCreditsBody')}</p>
                                    <Link
                                        href="/settings/integrations"
                                        className="mt-2 inline-block font-bold underline underline-offset-2 hover:text-amber-950"
                                    >
                                        {t('agent.composer.outOfCreditsSettingsCta')}
                                    </Link>
                                </div>
                            )}

                            <div className="flex items-end gap-2">
                                <textarea
                                    ref={textareaRef}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            void sendMessage();
                                        }
                                    }}
                                    rows={1}
                                    maxLength={4000}
                                    placeholder={t('agent.composer.placeholder')}
                                    className="max-h-40 min-h-[44px] flex-1 resize-none rounded-2xl border border-[#E8E7E2] bg-white px-4 py-2.5 text-sm leading-relaxed text-[#1A1A1A] placeholder-[#AFACA4] transition-colors outline-none focus:border-[#FFE156] focus:ring-4 focus:ring-[#FFE156]/15"
                                />
                                <button
                                    type="button"
                                    onClick={() => void sendMessage()}
                                    disabled={!message.trim() || busy}
                                    aria-label={t('agent.composer.send')}
                                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FFE156] text-[#1A1A1A] transition-colors hover:bg-[#E6CB4D] disabled:opacity-40"
                                >
                                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
                                </button>
                            </div>

                            {!hasAnthropicKey && (
                                <p className="mt-2 text-xs font-medium text-[#888880]">
                                    {t('agent.composer.creditsLeftPrefix', { credits })}{' '}
                                    <Link
                                        href="/settings/integrations"
                                        className="font-bold text-[#555550] underline underline-offset-2 transition-colors hover:text-[#1A1A1A]"
                                    >
                                        {t('agent.composer.settingsLink')}
                                    </Link>
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Preview panel: desktop only. */}
                <aside className="hidden w-[24rem] shrink-0 flex-col border-l border-[#E8E7E2] bg-white lg:flex">{preview}</aside>
            </div>
        </>
    );
}
