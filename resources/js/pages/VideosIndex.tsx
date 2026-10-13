import { Head, Link, router } from '@inertiajs/react';
import { Clapperboard, Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { csrfHeaders } from '@/lib/csrf';

interface VideoSummary {
    id: number;
    title: string;
    format: 'stories' | 'post';
    status: 'draft' | 'rendering' | 'ready' | 'failed';
    clip_count: number;
    cover: { type: 'image' | 'video'; src: string } | null;
    updated_at: string;
}

const STATUS_CLASS: Record<VideoSummary['status'], string> = {
    draft: 'bg-gray-100 text-gray-600',
    rendering: 'bg-amber-100 text-amber-700',
    ready: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
};

export default function VideosIndex({ videos }: { videos: VideoSummary[] }) {
    const { t } = useTranslation();
    const [creating, setCreating] = useState(false);

    async function createVideo() {
        setCreating(true);

        try {
            const response = await fetch('/videos', {
                method: 'POST',
                headers: { ...csrfHeaders(), Accept: 'application/json' },
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.message);
            }

            router.visit(`/videos/${data.id}`);
        } catch {
            toast.error(t('slideEditor.alerts.videoFailed'));
            setCreating(false);
        }
    }

    function deleteVideo(video: VideoSummary) {
        if (!window.confirm(t('videos.confirmDelete'))) {
            return;
        }

        router.delete(`/videos/${video.id}`, { preserveScroll: true });
    }

    return (
        <div className="mx-auto w-full max-w-6xl p-6">
            <Head title={t('videos.title')} />

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">{t('videos.title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('videos.subtitle')}</p>
                </div>
                <button
                    onClick={createVideo}
                    disabled={creating}
                    className="flex items-center gap-1.5 rounded-lg bg-[#FFE156] px-4 py-2 text-sm font-medium text-[#1A1A1A] hover:bg-[#E6CB4D] disabled:opacity-60"
                >
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {t('videos.new')}
                </button>
            </div>

            {videos.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center text-sm text-muted-foreground">
                    <Clapperboard className="h-8 w-8" />
                    {t('videos.empty')}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {videos.map((video) => (
                        <div key={video.id} className="group relative overflow-hidden rounded-2xl border bg-card">
                            <Link href={`/videos/${video.id}`} className="block">
                                <div className="aspect-[9/16] bg-black">
                                    {video.cover?.type === 'image' && (
                                        <img src={video.cover.src} alt="" className="h-full w-full object-cover" />
                                    )}
                                    {video.cover?.type === 'video' && (
                                        <video src={video.cover.src} muted preload="metadata" className="h-full w-full object-cover" />
                                    )}
                                </div>
                                <div className="p-3">
                                    <p className="truncate text-sm font-medium">{video.title || t('videos.untitled')}</p>
                                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{t('videos.clips', { count: video.clip_count })} · {video.updated_at}</span>
                                        <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_CLASS[video.status]}`}>
                                            {t(`videos.status.${video.status}`)}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                            <button
                                onClick={() => deleteVideo(video)}
                                title={t('videos.delete')}
                                className="absolute top-2 right-2 hidden rounded-lg bg-black/60 p-1.5 text-white hover:bg-red-600 group-hover:block"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
