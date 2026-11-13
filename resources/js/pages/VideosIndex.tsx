import { Head, Link, router } from '@inertiajs/react';
import { Clapperboard, Loader2, Plus, Trash2, UploadCloud, Wand2, X } from 'lucide-react';
import { useRef, useState } from 'react';
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
    rendering: 'bg-[#EEF1F3] text-[#1A2023]',
    ready: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
};

export default function VideosIndex({ videos }: { videos: VideoSummary[] }) {
    const { t } = useTranslation();
    const [creating, setCreating] = useState(false);
    const [autoEditOpen, setAutoEditOpen] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [captionStyle, setCaptionStyle] = useState<'bold' | 'clean'>('bold');
    const [language, setLanguage] = useState<'pt' | 'en'>('pt');
    const [format, setFormat] = useState<'stories' | 'post'>('stories');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    function handleFileDrop(event: React.DragEvent<HTMLDivElement>) {
        event.preventDefault();
        const dropped = event.dataTransfer.files?.[0];

        if (dropped) {
            setFile(dropped);
        }
    }

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const selected = event.target.files?.[0];

        if (selected) {
            setFile(selected);
        }
    }

    function closeAutoEdit() {
        setAutoEditOpen(false);
        setFile(null);
        setUploadProgress(0);
        setUploading(false);
    }

    function submitAutoEdit() {
        if (!file) {
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/videos/auto-edit');
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('X-CSRF-TOKEN', csrfHeaders()['X-XSRF-TOKEN'] || csrfHeaders()['X-CSRF-TOKEN'] || '');

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                setUploadProgress(Math.round((event.loaded / event.total) * 100));
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    closeAutoEdit();
                    router.visit(data.edit_url || `/videos/${data.id}`);
                } catch {
                    toast.error(t('autoEdit.uploadFailed'));
                }
            } else {
                let message = t('autoEdit.uploadFailed');

                try {
                    const data = JSON.parse(xhr.responseText);
                    message = data.message || message;
                } catch {
                    // ignore
                }

                toast.error(message);
            }

            setUploading(false);
        };

        xhr.onerror = () => {
            toast.error(t('autoEdit.uploadFailed'));
            setUploading(false);
        };

        const form = new FormData();
        form.append('file', file);
        form.append('caption_style', captionStyle);
        form.append('language', language);
        form.append('format', format);
        xhr.send(form);
    }

    return (
        <div className="mx-auto w-full max-w-6xl p-6">
            <Head title={t('videos.title')} />

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">{t('videos.title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('videos.subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setAutoEditOpen(true)}
                        className="flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <Wand2 className="h-4 w-4" />
                        {t('autoEdit.button')}
                    </button>
                    <button
                        onClick={createVideo}
                        disabled={creating}
                        className="flex items-center gap-1.5 rounded-full bg-[#1A2023] px-4 py-2 text-sm font-medium text-white hover:bg-[#2A3438] disabled:opacity-60"
                    >
                        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        {t('videos.new')}
                    </button>
                </div>
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

            {autoEditOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeAutoEdit}>
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold">{t('autoEdit.dialogTitle')}</h2>
                            <button onClick={closeAutoEdit} className="rounded p-1 text-gray-400 hover:bg-gray-100">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleFileDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className="mb-4 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center hover:border-gray-400"
                        >
                            <UploadCloud className="h-8 w-8 text-gray-400" />
                            <p className="text-sm text-gray-600">{file ? file.name : t('autoEdit.uploadHint')}</p>
                            {file && <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB</p>}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="video/mp4,video/quicktime,video/webm"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>

                        <div className="mb-4 grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-500">{t('autoEdit.captionStyle')}</label>
                                <div className="grid grid-cols-2 gap-1">
                                    <button
                                        onClick={() => setCaptionStyle('bold')}
                                        className={`rounded-lg border px-3 py-2 text-sm ${captionStyle === 'bold' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        {t('autoEdit.styleBold')}
                                    </button>
                                    <button
                                        onClick={() => setCaptionStyle('clean')}
                                        className={`rounded-lg border px-3 py-2 text-sm ${captionStyle === 'clean' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        {t('autoEdit.styleClean')}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-500">{t('autoEdit.language')}</label>
                                <select value={language} onChange={(e) => setLanguage(e.target.value as 'pt' | 'en')} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none">
                                    <option value="pt">Português (Brasil)</option>
                                    <option value="en">English</option>
                                </select>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="mb-1 block text-xs font-medium text-gray-500">{t('autoEdit.format')}</label>
                            <select value={format} onChange={(e) => setFormat(e.target.value as 'stories' | 'post')} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none">
                                <option value="stories">{t('autoEdit.formats.stories')}</option>
                                <option value="post">{t('autoEdit.formats.post')}</option>
                            </select>
                        </div>

                        {uploading && (
                            <div className="mb-4 h-2 w-full rounded-full bg-gray-100">
                                <div className="h-2 rounded-full bg-[#1A2023]" style={{ width: `${uploadProgress}%` }} />
                            </div>
                        )}

                        <button
                            onClick={submitAutoEdit}
                            disabled={!file || uploading}
                            className="w-full rounded-full bg-[#1A2023] px-4 py-2 text-sm font-medium text-white hover:bg-[#2A3438] disabled:opacity-60"
                        >
                            {uploading ? t('autoEdit.uploading', { progress: uploadProgress }) : t('autoEdit.upload')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
