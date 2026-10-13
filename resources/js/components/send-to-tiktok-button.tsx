import { ChevronDown, Loader2, Music2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { csrfHeaders } from '@/lib/csrf';
import { cn } from '@/lib/utils';

export interface TikTokAccount {
    id: number;
    handle: string | null;
    avatar: string | null;
}

export interface TikTokDraftStatus {
    id: number;
    status: 'pending' | 'publishing' | 'published' | 'failed';
    error: string | null;
}

interface SendToTikTokButtonProps {
    accounts: TikTokAccount[];
    /** Starts the send and resolves with the Schedule the server queued. */
    send: (accountId: number) => Promise<TikTokDraftStatus>;
    disabled?: boolean;
    className?: string;
}

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * POSTs a draft request and returns the queued Schedule, throwing with the
 * server's message on failure.
 */
export async function requestTikTokDraft(url: string, body: FormData | Record<string, unknown>): Promise<TikTokDraftStatus> {
    const isForm = body instanceof FormData;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            ...csrfHeaders(),
            Accept: 'application/json',
            ...(isForm ? {} : { 'Content-Type': 'application/json' }),
        },
        body: isForm ? body : JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data?.message || `HTTP ${response.status}`);
    }

    return data as TikTokDraftStatus;
}

async function waitForOutcome(scheduleId: number): Promise<TikTokDraftStatus> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

        const response = await fetch(`/tiktok-drafts/${scheduleId}`, { headers: { Accept: 'application/json' } });
        const data = (await response.json().catch(() => null)) as TikTokDraftStatus | null;

        if (data && (data.status === 'published' || data.status === 'failed')) {
            return data;
        }
    }

    throw new Error('timeout');
}

/**
 * "Enviar pro TikTok": sends the content to the creator's TikTok inbox as a
 * draft and follows the queued upload until TikTok accepts or refuses it.
 * With no account connected it links to the TikTok connect flow instead.
 */
export function SendToTikTokButton({ accounts, send, disabled, className }: SendToTikTokButtonProps) {
    const { t } = useTranslation();
    const [sending, setSending] = useState(false);

    const buttonClass = cn(
        'flex items-center gap-1.5 rounded-lg bg-[#1A1A1A] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50',
        className,
    );

    if (accounts.length === 0) {
        return (
            <a href="/social-accounts/tiktok/connect" className={buttonClass}>
                <Music2 className="h-4 w-4" /> {t('tiktokDraft.connect')}
            </a>
        );
    }

    async function sendTo(account: TikTokAccount) {
        if (sending) {
return;
}

        setSending(true);
        const toastId = toast.loading(t('tiktokDraft.sending'));

        try {
            const queued = await send(account.id);
            const outcome = await waitForOutcome(queued.id);

            if (outcome.status === 'failed') {
                toast.error(outcome.error || t('tiktokDraft.failed'), { id: toastId });
            } else {
                toast.success(t('tiktokDraft.sent'), {
                    id: toastId,
                    description: t('tiktokDraft.sentDescription', { handle: account.handle ?? 'TikTok' }),
                    duration: 8000,
                });
            }
        } catch (error) {
            const message = error instanceof Error && error.message !== 'timeout' ? error.message : t('tiktokDraft.stillSending');
            toast.error(message, { id: toastId });
        } finally {
            setSending(false);
        }
    }

    const icon = sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Music2 className="h-4 w-4" />;

    if (accounts.length === 1) {
        return (
            <button type="button" onClick={() => sendTo(accounts[0])} disabled={disabled || sending} className={buttonClass}>
                {icon} {t('tiktokDraft.send')}
            </button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button type="button" disabled={disabled || sending} className={buttonClass}>
                    {icon} {t('tiktokDraft.send')} <ChevronDown className="h-3.5 w-3.5" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {accounts.map((account) => (
                    <DropdownMenuItem key={account.id} onSelect={() => sendTo(account)}>
                        {account.avatar && <img src={account.avatar} alt="" className="h-5 w-5 rounded-full" />}
                        @{account.handle ?? account.id}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
