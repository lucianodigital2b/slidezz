import { Head, Link } from '@inertiajs/react';
import { Player } from '@remotion/player';
import {
    ArrowLeft, ChevronLeft, ChevronRight, Download, Film, Image as ImageIcon, Loader2, Music, Plus, Trash2, X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { requestTikTokDraft, SendToTikTokButton } from '@/components/send-to-tiktok-button';
import type { TikTokAccount } from '@/components/send-to-tiktok-button';
import { csrfHeaders } from '@/lib/csrf';
import { SlidezzVideo } from '@/remotion/SlidezzVideo';
import {
    CLIP_TRANSITIONS, makeClip, MAX_CLIP_SECONDS, MIN_CLIP_SECONDS, timelineFrames, VIDEO_FORMATS, VIDEO_FPS,
} from '@/remotion/timeline';
import type { TextPosition, VideoClip, VideoFormat, VideoTimeline } from '@/remotion/timeline';

type RenderStatus = 'draft' | 'rendering' | 'ready' | 'failed';

interface VideoProjectProps {
    id: number;
    title: string;
    format: VideoFormat;
    timeline: VideoTimeline;
    status: RenderStatus;
    render_progress: number;
    video_url: string | null;
    render_error: string | null;
}

interface RenderState {
    status: RenderStatus;
    progress: number;
    videoUrl: string | null;
    error: string | null;
}

const TEXT_POSITIONS: TextPosition[] = ['top', 'center', 'bottom'];

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
    const response = await fetch(url, {
        ...init,
        headers: { ...csrfHeaders(), Accept: 'application/json', ...init.headers },
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data?.message || `HTTP ${response.status}`);
    }

    return data as T;
}

/** Reads a local video's length before upload so the clip starts at its real duration. */
function videoDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        const url = URL.createObjectURL(file);
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            URL.revokeObjectURL(url);
            resolve(Number.isFinite(video.duration) ? video.duration : 5);
        };
        video.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(5);
        };
        video.src = url;
    });
}

function clampSeconds(value: number): number {
    return Math.min(MAX_CLIP_SECONDS, Math.max(MIN_CLIP_SECONDS, Math.round(value * 10) / 10));
}

export default function VideoEditor({ videoProject, tiktokAccounts }: { videoProject: VideoProjectProps; tiktokAccounts: TikTokAccount[] }) {
    const { t } = useTranslation();
    const [title, setTitle] = useState(videoProject.title);
    const [format, setFormat] = useState<VideoFormat>(videoProject.format);
    const [timeline, setTimeline] = useState<VideoTimeline>(videoProject.timeline);
    const [selectedId, setSelectedId] = useState<string | null>(videoProject.timeline.clips[0]?.id ?? null);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
    const [uploading, setUploading] = useState(0);
    const [render, setRender] = useState<RenderState>({
        status: videoProject.status,
        progress: videoProject.render_progress,
        videoUrl: videoProject.video_url,
        error: videoProject.render_error,
    });
    const mediaInputRef = useRef<HTMLInputElement>(null);
    const musicInputRef = useRef<HTMLInputElement>(null);
    const isFirstRender = useRef(true);
    const pendingSave = useRef<Promise<void> | null>(null);

    const projectUrl = `/videos/${videoProject.id}`;
    const { w, h } = VIDEO_FORMATS[format];
    const durationInFrames = timelineFrames(timeline);
    const selectedIndex = timeline.clips.findIndex((clip) => clip.id === selectedId);
    const selectedClip = selectedIndex >= 0 ? timeline.clips[selectedIndex] : null;

    function save(): Promise<void> {
        setSaveStatus('saving');
        const request = requestJson(projectUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, format, timeline }),
        })
            .then(() => setSaveStatus('saved'))
            .catch((error: Error) => {
                setSaveStatus('error');
                toast.error(error.message);

                throw error;
            });
        pendingSave.current = request;

        return request;
    }

    // Autosave a moment after the last edit.
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;

            return;
        }

        setSaveStatus('saving');
        const timer = setTimeout(() => save().catch(() => undefined), 800);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, format, timeline]);

    // Follow a render that is running (also one already running when the page opened).
    useEffect(() => {
        if (render.status !== 'rendering') {
            return;
        }

        const timer = setInterval(async () => {
            try {
                const data = await requestJson<{
                    status: RenderStatus; render_progress: number; video_url: string | null; render_error: string | null;
                }>(`${projectUrl}/status`, { method: 'GET' });
                setRender({ status: data.status, progress: data.render_progress, videoUrl: data.video_url, error: data.render_error });

                if (data.status === 'failed') {
                    toast.error(t('videoEditor.renderFailed', { error: data.render_error ?? '' }));
                }
            } catch {
                // A dropped poll is retried on the next tick.
            }
        }, 2500);

        return () => clearInterval(timer);
    }, [render.status, projectUrl, t]);

    function updateClips(update: (clips: VideoClip[]) => VideoClip[]) {
        setTimeline((current) => ({ ...current, clips: update(current.clips) }));
    }

    function patchSelected(patch: Partial<VideoClip>) {
        updateClips((clips) => clips.map((clip) => (clip.id === selectedId ? { ...clip, ...patch } : clip)));
    }

    function moveClip(index: number, direction: -1 | 1) {
        updateClips((clips) => {
            const target = index + direction;

            if (target < 0 || target >= clips.length) {
                return clips;
            }

            const next = [...clips];
            [next[index], next[target]] = [next[target], next[index]];

            return next;
        });
    }

    function removeClip(id: string) {
        updateClips((clips) => clips.filter((clip) => clip.id !== id));
        setSelectedId((current) => (current === id ? null : current));
    }

    async function uploadMedia(file: File): Promise<{ type: 'image' | 'video' | 'audio'; url: string }> {
        const form = new FormData();
        form.append('file', file);

        return requestJson(`${projectUrl}/media`, { method: 'POST', body: form });
    }

    async function addMedia(files: FileList | null) {
        for (const file of Array.from(files ?? [])) {
            setUploading((count) => count + 1);

            try {
                const seconds = file.type.startsWith('video/') ? await videoDuration(file) : null;
                const media = await uploadMedia(file);

                if (media.type === 'audio') {
                    continue;
                }

                const clip = makeClip(media.type, media.url, seconds ? { duration: clampSeconds(seconds) } : {});
                updateClips((clips) => [...clips, clip]);
                setSelectedId(clip.id);
            } catch {
                toast.error(t('videoEditor.uploadFailed', { name: file.name }));
            } finally {
                setUploading((count) => count - 1);
            }
        }
    }

    async function addMusic(file: File | undefined) {
        if (!file) {
            return;
        }

        setUploading((count) => count + 1);

        try {
            const media = await uploadMedia(file);
            setTimeline((current) => ({ ...current, audio: { src: media.url, volume: current.audio?.volume ?? 0.8 } }));
        } catch {
            toast.error(t('videoEditor.uploadFailed', { name: file.name }));
        } finally {
            setUploading((count) => count - 1);
        }
    }

    async function exportVideo() {
        try {
            await (saveStatus === 'saved' && pendingSave.current ? pendingSave.current : save());
            const data = await requestJson<{ status: RenderStatus }>(`${projectUrl}/render`, { method: 'POST' });
            setRender({ status: data.status, progress: 0, videoUrl: null, error: null });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t('videoEditor.renderFailed', { error: '' }));
        }
    }

    const fieldClass = 'w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none';
    const labelClass = 'mb-1 block text-xs font-medium text-gray-500';

    return (
        <div className="flex h-screen flex-col bg-gray-50 text-gray-900">
            <Head title={title || t('videos.untitled')} />

            {/* Top bar */}
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4">
                <Link href="/videos" className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('videoEditor.back')}</span>
                </Link>
                <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={t('videos.untitled')}
                    className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-sm font-semibold hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                />
                <span className="hidden text-xs text-gray-400 sm:inline">
                    {t(`videoEditor.${saveStatus === 'error' ? 'saveError' : saveStatus}`)}
                </span>

                {render.status === 'ready' && render.videoUrl && (
                    <a
                        href={render.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
                    >
                        <Download className="h-4 w-4" /> {t('videoEditor.download')}
                    </a>
                )}
                {render.status === 'ready' && render.videoUrl && (
                    <SendToTikTokButton
                        accounts={tiktokAccounts}
                        send={(accountId) => requestTikTokDraft(`${projectUrl}/publish/tiktok`, { social_account_id: accountId })}
                    />
                )}
                <button
                    onClick={exportVideo}
                    disabled={render.status === 'rendering' || timeline.clips.length === 0}
                    className="flex items-center gap-1.5 rounded-lg bg-[#FFE156] px-3 py-1.5 text-sm text-[#1A1A1A] transition-colors hover:bg-[#E6CB4D] disabled:opacity-60"
                >
                    {render.status === 'rendering' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
                    {render.status === 'rendering'
                        ? t('videoEditor.rendering', { progress: render.progress })
                        : t('videoEditor.export')}
                </button>
            </header>

            <div className="flex min-h-0 flex-1">
                {/* Preview */}
                <main className="flex min-w-0 flex-1 flex-col">
                    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
                        <div className="h-full max-w-full overflow-hidden rounded-2xl bg-black shadow-sm" style={{ aspectRatio: `${w} / ${h}` }}>
                            {timeline.clips.length > 0 ? (
                                <Player
                                    component={SlidezzVideo}
                                    inputProps={{ format, timeline }}
                                    durationInFrames={durationInFrames}
                                    fps={VIDEO_FPS}
                                    compositionWidth={w}
                                    compositionHeight={h}
                                    style={{ width: '100%', height: '100%' }}
                                    controls
                                    acknowledgeRemotionLicense
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-gray-400">
                                    {t('videoEditor.emptyTimeline')}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="shrink-0 border-t border-gray-200 bg-white p-3">
                        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                            <span>{t('videoEditor.totalDuration', { seconds: (durationInFrames / VIDEO_FPS).toFixed(1) })}</span>
                            {uploading > 0 && (
                                <span className="flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" /> {t('videoEditor.uploading')}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {timeline.clips.map((clip, index) => (
                                <button
                                    key={clip.id}
                                    onClick={() => setSelectedId(clip.id)}
                                    className={`group relative h-24 shrink-0 overflow-hidden rounded-lg border-2 bg-black ${clip.id === selectedId ? 'border-[#FFE156]' : 'border-transparent ring-1 ring-black/10'}`}
                                    style={{ width: Math.max(56, Math.min(160, clip.duration * 22)) }}
                                >
                                    {clip.type === 'image' ? (
                                        <img src={clip.src} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                        <video src={clip.src} muted preload="metadata" className="h-full w-full object-cover" />
                                    )}
                                    <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[10px] leading-4 text-white">
                                        {clip.duration}s
                                    </span>
                                    <span className="absolute top-0.5 left-0.5 rounded bg-black/60 px-1 text-[10px] leading-4 text-white">
                                        {index + 1}
                                    </span>
                                </button>
                            ))}
                            <button
                                onClick={() => mediaInputRef.current?.click()}
                                className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-200 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600"
                            >
                                <Plus className="h-4 w-4" />
                                {t('videoEditor.addMedia')}
                            </button>
                            <input
                                ref={mediaInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
                                multiple
                                className="hidden"
                                onChange={(event) => {
                                    addMedia(event.target.files);
                                    event.target.value = '';
                                }}
                            />
                        </div>
                    </div>
                </main>

                {/* Properties */}
                <aside className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-gray-200 bg-white p-4 md:flex">
                    <div>
                        <label className={labelClass}>{t('videoEditor.format')}</label>
                        <select value={format} onChange={(event) => setFormat(event.target.value as VideoFormat)} className={fieldClass}>
                            {(Object.keys(VIDEO_FORMATS) as VideoFormat[]).map((key) => (
                                <option key={key} value={key}>{t(`videoEditor.formats.${key}`)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="h-px bg-gray-100" />

                    {selectedClip ? (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <p className="flex items-center gap-1.5 text-sm font-semibold">
                                    {selectedClip.type === 'image' ? <ImageIcon className="h-4 w-4" /> : <Film className="h-4 w-4" />}
                                    {t('videoEditor.clip', { index: selectedIndex + 1 })}
                                </p>
                                <div className="flex gap-1">
                                    <button onClick={() => moveClip(selectedIndex, -1)} disabled={selectedIndex === 0} title={t('videoEditor.moveLeft')} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => moveClip(selectedIndex, 1)} disabled={selectedIndex === timeline.clips.length - 1} title={t('videoEditor.moveRight')} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30">
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => removeClip(selectedClip.id)} title={t('videoEditor.remove')} className="rounded p-1 text-gray-500 hover:bg-red-50 hover:text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className={labelClass}>{t('videoEditor.duration')}</label>
                                    <input
                                        type="number"
                                        min={MIN_CLIP_SECONDS}
                                        max={MAX_CLIP_SECONDS}
                                        step={0.1}
                                        value={selectedClip.duration}
                                        onChange={(event) => patchSelected({ duration: clampSeconds(Number(event.target.value) || MIN_CLIP_SECONDS) })}
                                        className={fieldClass}
                                    />
                                </div>
                                {selectedClip.type === 'video' && (
                                    <div>
                                        <label className={labelClass}>{t('videoEditor.trimStart')}</label>
                                        <input
                                            type="number"
                                            min={0}
                                            step={0.1}
                                            value={selectedClip.trimStart}
                                            onChange={(event) => patchSelected({ trimStart: Math.max(0, Number(event.target.value) || 0) })}
                                            className={fieldClass}
                                        />
                                    </div>
                                )}
                            </div>

                            {selectedIndex > 0 && (
                                <div>
                                    <label className={labelClass}>{t('videoEditor.transition')}</label>
                                    <select
                                        value={selectedClip.transition}
                                        onChange={(event) => patchSelected({ transition: event.target.value as VideoClip['transition'] })}
                                        className={fieldClass}
                                    >
                                        {CLIP_TRANSITIONS.map((transition) => (
                                            <option key={transition} value={transition}>{t(`videoEditor.transitions.${transition}`)}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className={labelClass}>{t('videoEditor.text')}</label>
                                <textarea
                                    value={selectedClip.text}
                                    onChange={(event) => patchSelected({ text: event.target.value })}
                                    placeholder={t('videoEditor.textPlaceholder')}
                                    rows={3}
                                    maxLength={300}
                                    className={fieldClass}
                                />
                            </div>

                            <div>
                                <label className={labelClass}>{t('videoEditor.textPosition')}</label>
                                <div className="grid grid-cols-3 gap-1">
                                    {TEXT_POSITIONS.map((position) => (
                                        <button
                                            key={position}
                                            onClick={() => patchSelected({ textPosition: position })}
                                            className={`rounded-lg border px-2 py-1 text-xs ${selectedClip.textPosition === position ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                        >
                                            {t(`videoEditor.positions.${position}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                {selectedClip.type === 'image' ? (
                                    <input type="checkbox" checked={selectedClip.zoom} onChange={(event) => patchSelected({ zoom: event.target.checked })} />
                                ) : (
                                    <input type="checkbox" checked={selectedClip.muted} onChange={(event) => patchSelected({ muted: event.target.checked })} />
                                )}
                                {t(selectedClip.type === 'image' ? 'videoEditor.zoom' : 'videoEditor.muted')}
                            </label>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400">{t('videoEditor.selectClip')}</p>
                    )}

                    <div className="h-px bg-gray-100" />

                    <div className="flex flex-col gap-2">
                        <p className="flex items-center gap-1.5 text-sm font-semibold">
                            <Music className="h-4 w-4" /> {t('videoEditor.music')}
                        </p>
                        {timeline.audio ? (
                            <>
                                <audio src={timeline.audio.src} controls className="w-full" />
                                <label className={labelClass}>{t('videoEditor.volume')}</label>
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={timeline.audio.volume}
                                    onChange={(event) => setTimeline((current) => (current.audio
                                        ? { ...current, audio: { ...current.audio, volume: Number(event.target.value) } }
                                        : current))}
                                />
                                <button
                                    onClick={() => setTimeline((current) => ({ ...current, audio: null }))}
                                    className="flex items-center gap-1 self-start text-xs text-gray-500 hover:text-red-600"
                                >
                                    <X className="h-3 w-3" /> {t('videoEditor.removeMusic')}
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => musicInputRef.current?.click()}
                                className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-500 hover:border-gray-400"
                            >
                                <Plus className="h-3.5 w-3.5" /> {t('videoEditor.addMusic')}
                            </button>
                        )}
                        <input
                            ref={musicInputRef}
                            type="file"
                            accept="audio/mpeg,audio/mp4,audio/wav,audio/x-m4a,audio/aac"
                            className="hidden"
                            onChange={(event) => {
                                addMusic(event.target.files?.[0]);
                                event.target.value = '';
                            }}
                        />
                    </div>
                </aside>
            </div>
        </div>
    );
}
