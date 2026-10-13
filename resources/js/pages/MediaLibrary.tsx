import { Head, router } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { Download, ImagePlus, Loader2, Search, Sparkles, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface MediaItem {
    id: number;
    url: string;
    width: number;
    height: number;
    orientation: 'portrait' | 'landscape' | 'square';
    source: string;
    description: string | null;
    keywords: string[];
    colors: string[];
    mood: string | null;
    described: boolean;
    embedded: boolean;
    used_count: number;
}

interface Props {
    items: MediaItem[];
    stats: { total: number; described: number; embedded: number };
}

function csrfToken(): string {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}

export default function MediaLibrary({ items, stats }: Props) {
    const [selected, setSelected] = useState<MediaItem | null>(null);

    return (
        <>
            <Head title="Biblioteca de mídias" />

            <div className="px-6 py-6">
                <header className="mb-8 flex items-start justify-between gap-6">
                    <div>
                        <h1 className="mb-1 text-xl font-semibold text-gray-900">Biblioteca de mídias</h1>
                        <p className="max-w-2xl text-sm text-gray-500">
                            As fotos ficam salvas aqui, com descrição e palavras-chave. É essa metadata que
                            decide qual imagem combina com cada hook na hora de montar os slides.
                        </p>
                    </div>
                    <div className="shrink-0 text-right">
                        <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
                        <p className="text-xs text-gray-500">
                            {stats.described} descritas, {stats.embedded} vetorizadas
                        </p>
                    </div>
                </header>

                <div className="mb-10 grid gap-4 lg:grid-cols-3">
                    <UploadCard />
                    <ImportCard />
                    <HookCsvCard />
                </div>

                {items.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                        {items.map((item) => (
                            <MediaCard key={item.id} item={item} onOpen={() => setSelected(item)} />
                        ))}
                    </div>
                )}
            </div>

            {selected && <DetailsPanel item={selected} onClose={() => setSelected(null)} />}
        </>
    );
}

function MediaCard({ item, onOpen }: { item: MediaItem; onOpen: () => void }) {
    return (
        <button
            type="button"
            onClick={onOpen}
            className="group relative aspect-[9/16] overflow-hidden rounded-xl border border-gray-200 bg-gray-100 text-left"
        >
            <img src={item.url} alt={item.description ?? ''} className="h-full w-full object-cover" loading="lazy" />

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="line-clamp-2 text-[11px] leading-snug text-white">
                    {item.description ?? 'Ainda sem descrição'}
                </p>
            </div>

            {!item.described && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] text-gray-600">
                    descrevendo
                </span>
            )}

            {item.used_count > 0 && (
                <span className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                    {item.used_count}x
                </span>
            )}
        </button>
    );
}

function DetailsPanel({ item, onClose }: { item: MediaItem; onClose: () => void }) {
    function remove() {
        router.delete(`/media-library/${item.id}`, {
            headers: { 'X-CSRF-TOKEN': csrfToken() },
            preserveScroll: true,
            onSuccess: onClose,
        });
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
            <aside
                className="flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto bg-white p-5"
                onClick={(event) => event.stopPropagation()}
            >
                <img src={item.url} alt="" className="w-full rounded-xl border border-gray-200 object-cover" />

                <div>
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Descrição</p>
                    <p className="text-sm text-gray-800">{item.description ?? 'Ainda sendo gerada pela IA.'}</p>
                </div>

                <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Palavras-chave</p>
                    <div className="flex flex-wrap gap-1.5">
                        {item.keywords.length === 0 && <span className="text-sm text-gray-400">Nenhuma ainda.</span>}
                        {item.keywords.map((keyword) => (
                            <span key={keyword} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                                {keyword}
                            </span>
                        ))}
                    </div>
                </div>

                {item.colors.length > 0 && (
                    <div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Cores</p>
                        <div className="flex gap-2">
                            {item.colors.map((color) => (
                                <span
                                    key={color}
                                    className="h-6 w-6 rounded-full border border-gray-200"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <dl className="grid grid-cols-2 gap-y-2 text-sm">
                    <dt className="text-gray-500">Dimensões</dt>
                    <dd className="text-gray-900">{item.width} x {item.height}</dd>
                    <dt className="text-gray-500">Formato</dt>
                    <dd className="text-gray-900">{item.orientation}</dd>
                    <dt className="text-gray-500">Origem</dt>
                    <dd className="text-gray-900">{item.source}</dd>
                    <dt className="text-gray-500">Clima</dt>
                    <dd className="text-gray-900">{item.mood ?? '—'}</dd>
                    <dt className="text-gray-500">Busca por significado</dt>
                    <dd className="text-gray-900">{item.embedded ? 'ativa' : 'pendente'}</dd>
                    <dt className="text-gray-500">Usada em</dt>
                    <dd className="text-gray-900">{item.used_count} carrossel(éis)</dd>
                </dl>

                <div className="mt-auto flex gap-2 pt-4">
                    <Button variant="outline" className="flex-1" asChild>
                        <a href={item.url} target="_blank" rel="noreferrer">
                            <Download className="h-4 w-4" />
                            Abrir
                        </a>
                    </Button>
                    <Button variant="outline" onClick={remove} className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                        Remover
                    </Button>
                </div>
            </aside>
        </div>
    );
}

function UploadCard() {
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);

    function upload(files: FileList | null) {
        if (!files || files.length === 0) return;

        const data = new FormData();
        Array.from(files).forEach((file) => data.append('files[]', file));

        setBusy(true);
        router.post('/media-library', data, {
            headers: { 'X-CSRF-TOKEN': csrfToken() },
            preserveScroll: true,
            onFinish: () => {
                setBusy(false);
                if (input.current) input.current.value = '';
            },
        });
    }

    return (
        <Panel
            icon={<Upload className="h-4 w-4" />}
            title="Subir suas fotos"
            hint="JPG, PNG ou WebP, até 12 MB cada. A IA descreve cada uma depois do upload."
        >
            <input
                ref={input}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => upload(event.target.files)}
            />
            <Button
                onClick={() => input.current?.click()}
                disabled={busy}
                className="w-full bg-[#FFE156] text-[#1A1A1A] hover:bg-[#E6CB4D]"
            >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                Escolher arquivos
            </Button>
        </Panel>
    );
}

function ImportCard() {
    const [query, setQuery] = useState('');
    const [busy, setBusy] = useState(false);

    function submit(event: React.FormEvent) {
        event.preventDefault();
        if (query.trim() === '') return;

        setBusy(true);
        router.post(
            '/media-library/import',
            { query, limit: 20 },
            {
                headers: { 'X-CSRF-TOKEN': csrfToken() },
                preserveScroll: true,
                onFinish: () => {
                    setBusy(false);
                    setQuery('');
                },
            },
        );
    }

    return (
        <Panel
            icon={<Search className="h-4 w-4" />}
            title="Importar do Pinterest"
            hint="Busque em inglês. As 20 melhores fotos verticais entram na biblioteca."
        >
            <form onSubmit={submit} className="space-y-2">
                <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="korean skincare shelfie"
                />
                <Button type="submit" disabled={busy || query.trim() === ''} variant="outline" className="w-full">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    Importar
                </Button>
            </form>
        </Panel>
    );
}

function HookCsvCard() {
    const file = useRef<HTMLInputElement>(null);
    const [hooks, setHooks] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    async function submit(event: React.FormEvent) {
        event.preventDefault();

        const data = new FormData();
        const chosen = file.current?.files?.[0];

        if (chosen) {
            data.append('file', chosen);
        } else if (hooks.trim() !== '') {
            data.append('hooks', hooks);
        } else {
            return;
        }

        setBusy(true);
        setResult(null);

        try {
            const response = await fetch('/hooks/csv', {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrfToken(), Accept: 'application/json' },
                body: data,
            });
            const payload = await response.json();

            setResult(
                response.ok
                    ? `${payload.queued} carrossel(éis) na fila. Acompanhe em TikTok.`
                    : (payload.message ?? 'Não deu para importar.'),
            );

            if (response.ok) {
                setHooks('');
                if (file.current) file.current.value = '';
            }
        } finally {
            setBusy(false);
        }
    }

    return (
        <Panel
            icon={<Sparkles className="h-4 w-4" />}
            title="Montar slides a partir de hooks"
            hint="Um hook por linha, ou um CSV com a coluna hook. Cada linha vira um carrossel usando as fotos que mais combinam."
        >
            <form onSubmit={submit} className="space-y-2">
                <Textarea
                    value={hooks}
                    onChange={(event) => setHooks(event.target.value)}
                    placeholder={'Estudei 4 anos na Coreia e testei tudo\nTestei 30 protetores solares'}
                    rows={3}
                />
                <div>
                    <Label htmlFor="hooks-csv" className="mb-1 block text-xs text-gray-500">
                        ou envie um CSV
                    </Label>
                    <Input id="hooks-csv" ref={file} type="file" accept=".csv,text/csv" />
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-[#1A1A1A] text-white hover:bg-black">
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    Gerar carrosséis
                </Button>
                {result && <p className="text-xs text-gray-600">{result}</p>}
            </form>
        </Panel>
    );
}

function Panel({
    icon,
    title,
    hint,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    hint: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-1 flex items-center gap-2 text-gray-900">
                {icon}
                <h2 className="text-sm font-semibold">{title}</h2>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-gray-500">{hint}</p>
            {children}
        </section>
    );
}

function EmptyState() {
    return (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
            <p className="mb-1 text-sm font-medium text-gray-900">Biblioteca vazia</p>
            <p className="text-sm text-gray-500">
                Suba suas fotos ou importe uma busca. Todo carrossel que você gerar também deixa as fotos aqui.
            </p>
        </div>
    );
}
