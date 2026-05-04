/* eslint-disable curly */
import { Head, router, usePage } from '@inertiajs/react';

import Konva from 'konva';
import {
    Circle,
    Download,
    Image as ImageIcon,
    Loader2,
    MousePointer,
    Plus,
    Save,
    Shapes,
    Sparkles,
    Square,
    Trash2,
    Type,
    Undo2,
    Redo2,
    X,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    ChevronsUp,
    ChevronsDown,
} from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import CarouselGenerationController from '@/actions/App/Http/Controllers/CarouselGenerationController';
import SlideProjectController from '@/actions/App/Http/Controllers/SlideProjectController';
import { loadGoogleFont } from '@/utils/google-fonts';
import {
    Circle as KonvaCircle,
    Group,
    Layer,
    Path as KonvaPath,
    Rect,
    Stage,
    Transformer,
} from 'react-konva';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { format as formatFns } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

import {
    SLIDE_W, PANEL_LEFT, PANEL_RIGHT, FORMATS, Format, Tool,
    SlideEl, Slide, TextEl, ImageEl, ShapeEl, GradientEl, PathEl, RichSpan
} from '@/components/SlideEditor/types';
import { uid, makeSlide, SHADOW_DEFAULTS, borderStyleToDash, gradientLinearProps, preserveSingleHighlightRichText } from '@/components/SlideEditor/utils';
import { KonvaTextEl, KonvaImageEl } from '@/components/SlideEditor/KonvaElements';
import { PropertiesPanel } from '@/components/SlideEditor/PropertiesPanel';
import { SlideThumbnail } from '@/components/SlideEditor/SlideThumbnail';

import { useUndoRedo } from '@/components/SlideEditor/hooks/useUndoRedo';
import { useSlideManager } from '@/components/SlideEditor/hooks/useSlideManager';
import { useAiGeneration } from '@/components/SlideEditor/hooks/useAiGeneration';

import { ShapeDef, SHAPE_CATEGORIES } from '@/components/SlideEditor/shapes';
import { SLIDE_TEMPLATES, TemplateContent, TemplatePreview } from '@/components/SlideEditor/templates';

// ─── Main Component ───────────────────────────────────────────────────────────

interface SlideProjectProp {
    id: number;
    title: string;
    format: Format;
    slides: Slide[];
}

interface WizardConfig {
    topic: string;
    style: string;
    slideCount: number;
    generateImages: boolean;
}

const STORAGE_KEY = 'slidezz_editor_v1';

function loadSavedState(): { slides: Slide[]; currentIdx: number; format: Format } | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export default function SlideEditor() {
    interface InstagramAccount {
        id: number;
        provider: string;
        handle: string | null;
        avatar: string | null;
        expires_at: string | null;
    }

    const { slideProject, wizardConfig, instagramAccounts } = usePage<{
        slideProject: SlideProjectProp | null;
        wizardConfig?: WizardConfig | null;
        instagramAccounts: InstagramAccount[];
    }>().props;

    const saved = slideProject ?? loadSavedState();
    
    // ── Undo / Redo ─────────────────────────────────────────────────────────
    const { slides, setSlides, past, future, undo, redo } = useUndoRedo(saved?.slides ?? [makeSlide()]);

    const [currentIdx, setCurrentIdx] = useState(0);
    const [tool, setTool] = useState<Tool>('select');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [format, setFormat] = useState<Format>(saved?.format ?? 'post');
    const [leftPanelMode, setLeftPanelMode] = useState<'slides' | 'templates'>('slides');
    const { t } = useTranslation();
    const [title, setTitle] = useState(slideProject?.title ?? t('slideEditor.toolbar.untitled'));
    const [projectId, setProjectId] = useState<number | null>(slideProject?.id ?? null);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
    const [igAccountId, setIgAccountId] = useState<number | null>(instagramAccounts?.[0]?.id ?? null);
    const [igPosting, setIgPosting] = useState(false);
    const [elementsOpen, setElementsOpen] = useState(false);
    const [publishAt, setPublishAt] = useState<Date | undefined>(undefined);

    // ── AI carousel generation ──────────────────────────────────────────────
    const {
        aiModalOpen, setAiModalOpen,
        aiTopic, setAiTopic,
        aiStyle, setAiStyle,
        aiSlideCount, setAiSlideCount,
        aiGenerateImages, setAiGenerateImages,
        aiStatus, setAiStatus,
        aiProgress, aiError,
        openAiModal, closeAiModal,
        generateCarousel
    } = useAiGeneration(slides, setSlides, setCurrentIdx, setSelectedId, format);

    const stageRef = useRef<Konva.Stage>(null);
    const trRef = useRef<Konva.Transformer>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [displayW, setDisplayW] = useState(600);
    const [displayH, setDisplayH] = useState(600);

    const safeIdx = Math.max(0, Math.min(currentIdx, slides.length - 1));
    useEffect(() => {
        if (currentIdx !== safeIdx) setCurrentIdx(safeIdx);
    }, [currentIdx, safeIdx]);

    const {
        slide,
        updateSlide,
        addSlide,
        deleteSlide,
        duplicateSlide,
        bringToFront,
        bringForward,
        sendBackward,
        sendToBack,
        addElement,
        updateElement,
        deleteElement
    } = useSlideManager(slides, setSlides, safeIdx, setCurrentIdx, setSelectedId, setTool);

    const slideH = FORMATS[format].h;
    const scale = displayW / SLIDE_W;

    useEffect(() => {
        const recalc = () => {
            if (!containerRef.current) return;
            const { width, height } = containerRef.current.getBoundingClientRect();
            const pad = 64;
            const fmt = FORMATS[format];
            const scaleByW = (width - pad) / fmt.w;
            const scaleByH = (height - pad) / fmt.h;
            const s = Math.min(scaleByW, scaleByH, 720 / Math.max(fmt.w, fmt.h));
            setDisplayW(Math.max(200, Math.round(fmt.w * s)));
            setDisplayH(Math.max(200, Math.round(fmt.h * s)));
        };
        const obs = new ResizeObserver(recalc);
        if (containerRef.current) obs.observe(containerRef.current);
        recalc();
        return () => obs.disconnect();
    }, [format]);

    useEffect(() => {
        if (!trRef.current || !stageRef.current) return;
        if (!selectedId) { trRef.current.nodes([]); trRef.current.getLayer()?.batchDraw(); return; }
        const node = stageRef.current.findOne(`#${selectedId}`);
        if (node) { trRef.current.nodes([node]); trRef.current.getLayer()?.batchDraw(); }
    }, [selectedId, slide.elements]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (editingId) return;
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
                updateSlide({ elements: slide.elements.filter((el) => el.id !== selectedId) });
                setSelectedId(null);
            }
            if (e.key === 'Escape') { setSelectedId(null); setEditingId(null); }
            
            // Undo/Redo shortcuts
            if (e.ctrlKey || e.metaKey) {
                if (e.key.toLowerCase() === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        redo();
                    } else {
                        undo();
                    }
                } else if (e.key.toLowerCase() === 'y') {
                    e.preventDefault();
                    redo();
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [selectedId, editingId, slide, undo, redo]);

    // ─── Save ───────────────────────────────────────────────────────────────

    async function saveProject(): Promise<number | null> {
        setSaveStatus('saving');
        const body = { title, format, slides };
        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
        try {
            if (projectId) {
                await fetch(SlideProjectController.update(projectId).url, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                    body: JSON.stringify(body),
                });
                setSaveStatus('saved');
                return projectId;
            } else {
                const res = await fetch(SlideProjectController.store().url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                    body: JSON.stringify(body),
                });
                const data = await res.json();
                setProjectId(data.id);
                router.visit(SlideProjectController.edit(data.id).url, { replace: true, preserveState: true });
                setSaveStatus('saved');
                return data.id ?? null;
            }
        } catch {
            setSaveStatus('error');
            return null;
        }
    }

    // ─── Auto-save ──────────────────────────────────────────────────────────

    useEffect(() => {
        setSaveStatus('saving');
        const timer = setTimeout(() => { saveProject(); }, 1500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slides, format, title]);

    // ─── Auto-open AI modal when coming from wizard ──────────────────────────

    useEffect(() => {
        if (!wizardConfig) return;
        setAiTopic(wizardConfig.topic);
        setAiStyle(wizardConfig.style);
        setAiSlideCount(wizardConfig.slideCount);
        const shouldGen = wizardConfig.generateImages !== undefined ? wizardConfig.generateImages : true;
        setAiGenerateImages(shouldGen);
        setAiModalOpen(true);
        generateCarousel(wizardConfig.topic, wizardConfig.style, wizardConfig.slideCount, shouldGen);
        console.log('wizardConfig', wizardConfig)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── AI Carousel Generation ─────────────────────────────────────────────
    // Logic extracted to useAiGeneration hook

    // ─── Helpers ────────────────────────────────────────────────────────────
    
    function getTemplateContent(): TemplateContent {
        const textElements = [...slide.elements]
            .filter((el): el is TextEl => el.type === 'text')
            .sort((a, b) => a.y - b.y || a.x - b.x);

        return {
            eyebrow: textElements[2]?.text || t('slideEditor.elements.investigation'),
            title: textElements[0]?.text || t('slideEditor.elements.title'),
            subtitle: textElements[1]?.text || t('slideEditor.elements.subtitle'),
            caption: textElements[3]?.text || textElements[2]?.text || t('slideEditor.elements.slideDescription'),
        };
    }

    async function applyTemplate(tpl: (typeof SLIDE_TEMPLATES)[number]) {
        await Promise.all([...new Set(tpl.fonts)].map((font) => loadGoogleFont(font)));
        const scene = tpl.buildScene(getTemplateContent(), slideH);
        const preservedBackgroundImages = slide.elements
            .filter((el): el is ImageEl => el.type === 'image' && el.isBackground)
            .map((el) => ({ ...el }));
        setSelectedId(null);
        updateSlide({
            background: scene.background,
            elements: [...preservedBackgroundImages, ...scene.elements],
        });
    }

    // ─── Stage click ─────────────────────────────────────────────────────────

    function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
        if (elementsOpen) { setElementsOpen(false); return; }
        const target = e.target;
        const groupId = (target.parent as Konva.Node | null)?.id?.() ?? '';
        const isBackgroundImage = slide.elements.some(
            (el): el is ImageEl => el.type === 'image' && el.isBackground && el.id === groupId,
        );
        const clickedOnEmpty =
            target === target.getStage() ||
            (target.getClassName() === 'Rect' && target.id() === 'bg') ||
            (isBackgroundImage && tool !== 'select');
        if (tool === 'select') { if (clickedOnEmpty) setSelectedId(null); return; }
        if (!clickedOnEmpty) return;

        const pos = stageRef.current!.getPointerPosition()!;
        const x = pos.x / scale, y = pos.y / scale;

        if (tool === 'text') {
            addElement({
                id: uid(), type: 'text', x, y, width: 400, height: 80, rotation: 0, opacity: 1,
                text: 'Texto', fontSize: 48, fontFamily: 'Poppins', fill: '#111111',
                fontStyle: '', align: 'left', verticalAlign: 'top',
                lineHeight: 1.2, letterSpacing: 0, textDecoration: '', stroke: '#000000',
                strokeWidth: 0, padding: 0, wrap: 'word',
                accentEnabled: false, accentColor: '#E8440A', accentThickness: 6, accentSide: 'left', accentGap: 12,
                ...SHADOW_DEFAULTS,
            });
            loadGoogleFont('Poppins');
        } else if (tool === 'rect') {
            addElement({
                id: uid(), type: 'rect', x: x - 100, y: y - 60, width: 200, height: 120,
                rotation: 0, opacity: 1, fill: '#E8440A', stroke: '#000000', strokeWidth: 0,
                cornerRadius: 0, borderStyle: 'solid', dashEnabled: false,
                ...SHADOW_DEFAULTS,
            });
        } else if (tool === 'circle') {
            addElement({
                id: uid(), type: 'circle', x: x - 60, y: y - 60, width: 120, height: 120,
                rotation: 0, opacity: 1, fill: '#E8440A', stroke: '#000000', strokeWidth: 0,
                cornerRadius: 0, borderStyle: 'solid', dashEnabled: false,
                ...SHADOW_DEFAULTS,
            });
        }
    }

    // ─── Add gradient ────────────────────────────────────────────────────────

    function addGradientElement() {
        addElement({
            id: uid(), type: 'gradient',
            x: 0, y: Math.round(slideH / 2),
            width: SLIDE_W, height: Math.round(slideH / 2),
            rotation: 0, opacity: 1,
            color: '#000000',
            direction: 'bottom',
            ...SHADOW_DEFAULTS,
        });
    }

    // ─── Add path element from shape library ────────────────────────────────

    function addPathElement(def: ShapeDef) {
        const cx = Math.round(SLIDE_W / 2 - def.initW / 2);
        const cy = Math.round(slideH / 2 - def.initH / 2);
        addElement({
            id: uid(), type: 'path',
            x: cx, y: cy,
            width: def.initW, height: def.initH,
            rotation: 0, opacity: 1,
            data: def.data, dataW: def.dataW, dataH: def.dataH,
            fill: def.fill, stroke: def.stroke, strokeWidth: def.strokeWidth,
            borderStyle: 'solid', dashEnabled: def.dashEnabled ?? false,
            ...SHADOW_DEFAULTS,
        } as PathEl);
        setElementsOpen(false);
    }

    // ─── Image upload ────────────────────────────────────────────────────────

    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            addElement({
                id: uid(), type: 'image', src: reader.result as string,
                x: SLIDE_W / 2 - 200, y: slideH / 2 - 200, width: 400, height: 400,
                rotation: 0, opacity: 1,
                brightness: 0, contrast: 0, blurRadius: 0, grayscale: false, sepia: false,
                hue: 0, saturation: 0, luminance: 0, pixelSize: 1, noise: 0, enhance: 0,
                red: 255, green: 255, blue: 255,
                overlayEnabled: false, overlayColor: '#000000', overlayOpacity: 0.4,
                isBackground: false, bgSize: 'cover', bgPositionX: 50, bgPositionY: 50,
                ...SHADOW_DEFAULTS,
            });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }

    // ─── Text inline editing ─────────────────────────────────────────────────

    function startEditing(el: TextEl) {
        const stage = stageRef.current!;
        const node = stage.findOne(`#${el.id}`) as Konva.Text;
        if (!node) return;
        setEditingId(el.id);

        const absPos = node.getAbsolutePosition();
        const stageBox = stage.container().getBoundingClientRect();
        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);
        Object.assign(textarea.style, {
            position: 'fixed',
            top: `${stageBox.top + absPos.y}px`,
            left: `${stageBox.left + absPos.x}px`,
            width: `${el.width * scale}px`,
            minHeight: `${el.fontSize * scale}px`,
            fontSize: `${el.fontSize * scale}px`,
            fontFamily: el.fontFamily,
            fontStyle: el.fontStyle,
            textAlign: el.align,
            color: el.fill,
            lineHeight: String(el.lineHeight),
            letterSpacing: `${el.letterSpacing}px`,
            background: 'transparent',
            border: '1px dashed #E8440A',
            outline: 'none',
            resize: 'none',
            padding: '0',
            zIndex: '9999',
            overflow: 'hidden',
        });
        textarea.value = el.text;
        textarea.focus();

        const finish = () => {
            const nextText = textarea.value;
            const nextRichText = preserveSingleHighlightRichText(el.text, nextText, el.richText, el.fill);

            updateElement(el.id, { text: nextText, richText: nextRichText } as Partial<TextEl>);
            document.body.removeChild(textarea);
            setEditingId(null);
        };
        textarea.addEventListener('blur', finish);
        textarea.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { document.body.removeChild(textarea); setEditingId(null); } });
    }

    // ─── Export ──────────────────────────────────────────────────────────────

    function exportPNG() {
        if (!stageRef.current) return;
        setSelectedId(null);
        setTimeout(() => {
            const uri = stageRef.current!.toDataURL({ pixelRatio: SLIDE_W / displayW });
            const link = document.createElement('a');
            link.download = `slide-${currentIdx + 1}.png`;
            link.href = uri;
            link.click();
        }, 50);
    }

    async function exportAllSlidesJpeg(): Promise<Blob[]> {
        if (!stageRef.current) return [];
        const prevIdx = currentIdx;
        setSelectedId(null);

        const blobs: Blob[] = [];

        for (let i = 0; i < slides.length; i++) {
            setCurrentIdx(i);
            await new Promise((r) => setTimeout(r, 120));
            const dataUrl = stageRef.current.toDataURL({
                pixelRatio: SLIDE_W / displayW,
                mimeType: 'image/jpeg',
                quality: 0.92,
            });
            const blob = await fetch(dataUrl).then((res) => res.blob());
            blobs.push(blob);
        }

        setCurrentIdx(prevIdx);
        return blobs;
    }

    async function publishCarouselToInstagram() {
        if (!igAccountId) return;
        if (slides.length < 2 || slides.length > 10) return;
        if (format !== 'post') {
            window.alert('Switch format to Post (1:1) to publish a carousel to Instagram.');
            return;
        }
        setIgPosting(true);
        try {
            const id = (await saveProject()) ?? projectId;
            if (!id) throw new Error('Could not save slideshow before publishing.');

            const caption = window.prompt('Caption', '') ?? '';
            const blobs = await exportAllSlidesJpeg();
            if (blobs.length !== slides.length) throw new Error('Failed to export slides.');

            const form = new FormData();
            form.append('social_account_id', String(igAccountId));
            form.append('caption', caption);
            if (publishAt) {
                form.append('publish_at', publishAt.toISOString());
            }
            blobs.forEach((blob, idx) => {
                form.append('images[]', blob, `slide-${idx + 1}.jpg`);
            });

            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
            const res = await fetch(`/slideshow-editor/${id}/publish/instagram`, {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrfToken },
                body: form,
            });

            let data: any = {};
            try {
                data = await res.json();
            } catch (e) {
                // Not JSON
            }

            if (!res.ok) {
                console.error("Publish failed with status:", res.status, data);
                throw new Error(data?.message || `Server error: ${res.status} ${res.statusText}`);
            }

            window.alert(data?.message || 'Posted to Instagram.');
            setPublishAt(undefined);
        } catch (e) {
            console.error("Publish Exception:", e);
            window.alert(e instanceof Error ? e.message : 'Failed to publish to Instagram.');
        } finally {
            setIgPosting(false);
        }
    }

    // ─── Render ──────────────────────────────────────────────────────────────

    const selectedEl = slide.elements.find((el) => el.id === selectedId) ?? null;

    const toolBtn = (tool_: Tool, icon: React.ReactNode, label: string) => (
        <button title={label}
            onClick={() => { setTool(tool_); if (tool_ !== 'select') setSelectedId(null); }}
            className={`p-2.5 rounded-xl transition-all ${tool === tool_ ? 'bg-[#E8440A] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}>
            {icon}
        </button>
    );

    return (
        <>
            <Head title={t('slideEditor.pageTitle')} />
            <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-gray-50">

                {/* ── Toolbar ──────────────────────────────────────────────── */}
                <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-1">
                        <button
                            title="Undo (Ctrl+Z)"
                            onClick={undo}
                            disabled={past.length === 0}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <Undo2 className="w-4 h-4" />
                        </button>
                        <button
                            title="Redo (Ctrl+Y)"
                            onClick={redo}
                            disabled={future.length === 0}
                            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                        >
                            <Redo2 className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="w-px h-6 bg-gray-200 mx-1" />
                    {selectedId && (
                        <>
                            <div className="flex items-center gap-1">
                                <button title="Trazer para frente" onClick={() => bringToFront(selectedId)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"><ChevronsUp className="w-4 h-4" /></button>
                                <button title="Avançar camada" onClick={() => bringForward(selectedId)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"><ChevronUp className="w-4 h-4" /></button>
                                <button title="Recuar camada" onClick={() => sendBackward(selectedId)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"><ChevronDown className="w-4 h-4" /></button>
                                <button title="Enviar para trás" onClick={() => sendToBack(selectedId)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"><ChevronsDown className="w-4 h-4" /></button>
                            </div>
                            <div className="w-px h-6 bg-gray-200 mx-1" />
                        </>
                    )}
                    <button title={t('slideEditor.toolbar.image')} onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                        <ImageIcon className="w-4 h-4" /> {t('slideEditor.toolbar.image')}
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    <button title={t('slideEditor.toolbar.gradient')} onClick={addGradientElement}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0" aria-hidden="true">
                            <defs>
                                <linearGradient id="grad-btn" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0" stopColor="currentColor" stopOpacity="0" />
                                    <stop offset="1" stopColor="currentColor" stopOpacity="1" />
                                </linearGradient>
                            </defs>
                            <rect x="1" y="1" width="14" height="14" rx="2" fill="url(#grad-btn)" />
                        </svg>
                        {t('slideEditor.toolbar.gradient')}
                    </button>
                    <div className="w-px h-6 bg-gray-200 mx-1" />
                    <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">{t('slideEditor.toolbar.background')}</label>
                        <input type="color" value={slide.background}
                            onChange={(e) => updateSlide({ background: e.target.value })}
                            className="w-7 h-7 cursor-pointer rounded border border-gray-200" />
                    </div>
                    {/* Title */}
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="text-sm font-medium text-gray-700 border-b border-transparent hover:border-gray-300 focus:border-[#E8440A] focus:outline-none bg-transparent px-1 w-44 truncate"
                    />

                    <div className="flex-1" />

                    {/* Save status */}
                    <span className="text-[11px] text-gray-400 select-none">
                        {saveStatus === 'saving' ? t('slideEditor.toolbar.saving') : saveStatus === 'error' ? t('slideEditor.toolbar.saveError') : t('slideEditor.toolbar.saved')}
                    </span>

                    {/* Save button */}
                    <button onClick={saveProject}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                        <Save className="w-4 h-4" /> {t('slideEditor.toolbar.save')}
                    </button>

                    {/* AI Generate button */}
                    {/* <button onClick={openAiModal}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 transition-all shadow-sm">
                        <Sparkles className="w-4 h-4" /> {t('slideEditor.ai.generate')}
                    </button> */}

                    {/* Format switcher */}
                    <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5">
                        {(Object.entries(FORMATS) as [Format, typeof FORMATS[Format]][]).map(([key, fmt]) => (
                            <button
                                key={key}
                                onClick={() => setFormat(key)}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${format === key ? 'bg-[#E8440A] text-white' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <span className={`inline-flex items-center justify-center border-2 rounded-sm shrink-0 ${format === key ? 'border-white/70' : 'border-gray-400'}`}
                                    style={{ width: key === 'post' ? 12 : 9, height: key === 'post' ? 12 : 14 }} />
                                {t(`slideEditor.formats.${key}`)}
                                <span className={`text-[10px] ${format === key ? 'text-white/70' : 'text-gray-400'}`}>{fmt.ratio}</span>
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-6 bg-gray-200 mx-1" />

                    <button onClick={exportPNG}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-[#E8440A] text-white hover:bg-[#D13D09] transition-colors">
                        <Download className="w-4 h-4" /> {t('slideEditor.toolbar.exportPng')}
                    </button>

                    {instagramAccounts.length > 0 && (
                        <>
                            <div className="w-px h-6 bg-gray-200 mx-1" />
                            <TooltipProvider delayDuration={200}>
                                <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-0.5 bg-white">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${publishAt ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                                                <CalendarIcon className="w-3.5 h-3.5" />
                                                {publishAt ? formatFns(publishAt, 'MMM d, h:mm a') : 'Schedule'}
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="end">
                                            <Calendar
                                                mode="single"
                                                selected={publishAt}
                                                onSelect={(date) => {
                                                    if (date) {
                                                        // preserve time if we already had a date, or set to a default future time
                                                        const newDate = new Date(date);

                                                        if (publishAt) {
                                                            newDate.setHours(publishAt.getHours());
                                                            newDate.setMinutes(publishAt.getMinutes());
                                                        } else {
                                                            newDate.setHours(new Date().getHours() + 1);
                                                            newDate.setMinutes(0);
                                                        }

                                                        setPublishAt(newDate);
                                                    } else {
                                                        setPublishAt(undefined);
                                                    }
                                                }}
                                                initialFocus
                                                disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                                            />
                                            {publishAt && (
                                                <div className="p-3 border-t border-gray-100 flex items-center justify-between">
                                                    <span className="text-xs text-gray-500">Time</span>
                                                    <input
                                                        type="time"
                                                        value={formatFns(publishAt, 'HH:mm')}
                                                        onChange={(e) => {
                                                            const [h, m] = e.target.value.split(':');
                                                            const newDate = new Date(publishAt);
                                                            newDate.setHours(parseInt(h), parseInt(m));
                                                            setPublishAt(newDate);
                                                        }}
                                                        className="text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:border-indigo-500"
                                                    />
                                                </div>
                                            )}
                                        </PopoverContent>
                                    </Popover>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <button
                                                onClick={publishCarouselToInstagram}
                                                disabled={igPosting || slides.length < 2 || slides.length > 10}
                                                className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium text-white bg-[#E8440A] hover:bg-[#D13D09] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {igPosting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                {publishAt ? 'Schedule IG' : 'Post to IG'}
                                            </button>
                                        </TooltipTrigger>
                                        {(slides.length < 2 || slides.length > 10) && (
                                            <TooltipContent>
                                                <p>Instagram carousels require between 2 and 10 slides.</p>
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </div>
                            </TooltipProvider>
                        </>
                    )}
                </div>

                {/* ── Body ─────────────────────────────────────────────────── */}
                <div className="flex flex-1 overflow-hidden">

                    {/* Left: Slides / Templates */}
                    <div className="flex flex-col bg-white border-r border-gray-100 overflow-hidden shrink-0" style={{ width: leftPanelMode === 'templates' ? 200 : PANEL_LEFT }}>
                        {/* Panel mode tabs */}
                        <div className="flex shrink-0 border-b border-gray-100">
                            <button
                                type="button"
                                onClick={() => setLeftPanelMode('slides')}
                                className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors ${leftPanelMode === 'slides' ? 'text-[#E8440A]' : 'text-gray-400 hover:text-gray-500'}`}
                            >
                                {t('slideEditor.slides.panel')}
                            </button>
                            <div className="w-px bg-gray-100" />
                            <button
                                type="button"
                                onClick={() => setLeftPanelMode('templates')}
                                className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors ${leftPanelMode === 'templates' ? 'text-[#E8440A]' : 'text-gray-400 hover:text-gray-500'}`}
                            >
                                {t('slideEditor.templates.panel')}
                            </button>
                            {leftPanelMode === 'slides' && (
                                <button onClick={addSlide} className="px-2 hover:bg-gray-100 transition-colors text-gray-500 shrink-0">
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Slides list */}
                        {leftPanelMode === 'slides' && (
                            <div className="flex flex-col gap-2 p-2 overflow-y-auto flex-1">
                                {slides.map((s, idx) => (
                                    <div key={s.id} onClick={() => { setCurrentIdx(idx); setSelectedId(null); }}
                                        className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-colors ${idx === currentIdx ? 'border-[#E8440A]' : 'border-transparent hover:border-gray-200 bg-gray-100'}`}
                                    >
                                        <SlideThumbnail slide={s} format={format} />
                                        <span className="absolute top-1 left-1 text-[9px] font-bold text-white bg-black/40 rounded px-1 leading-4 z-10">{idx + 1}</span>
                                        <div className="absolute top-1 right-1 hidden group-hover:flex gap-0.5 z-10">
                                            <button onClick={(e) => { e.stopPropagation(); duplicateSlide(idx); }} className="p-0.5 rounded bg-black/40 text-white hover:bg-black/60" title={t('slideEditor.slides.duplicate')}><Plus className="w-2.5 h-2.5" /></button>
                                            {slides.length > 1 && <button onClick={(e) => { e.stopPropagation(); deleteSlide(idx); }} className="p-0.5 rounded bg-black/40 text-white hover:bg-red-500" title={t('slideEditor.slides.delete')}><X className="w-2.5 h-2.5" /></button>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Templates grid */}
                        {leftPanelMode === 'templates' && (
                            <div className="grid grid-cols-2 gap-2 p-2 overflow-y-auto flex-1 content-start">
                                {SLIDE_TEMPLATES.map((tpl) => (
                                    <button
                                        key={tpl.id}
                                        type="button"
                                        onClick={() => applyTemplate(tpl)}
                                        className="flex flex-col gap-1 text-left group"
                                    >
                                        <div className="relative w-full aspect-square rounded-lg overflow-hidden ring-1 ring-gray-200 group-hover:ring-[#E8440A] group-hover:ring-2 transition-all">
                                            <TemplatePreview id={tpl.id} />
                                        </div>
                                        <span className="text-[9px] font-semibold text-gray-600 text-center w-full leading-tight px-0.5">{tpl.name}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Center: Canvas */}
                    <div ref={containerRef} className="relative flex flex-1 items-center justify-center overflow-hidden bg-gray-100">
                        {/* Elements panel popup */}
                        {elementsOpen && (
                            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 w-72 max-h-[65vh] overflow-y-auto">
                                {SHAPE_CATEGORIES.map(({ labelKey, shapes }) => (
                                    <div key={labelKey} className="mb-4 last:mb-0">
                                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">{t(labelKey)}</p>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {shapes.map((shape) => {
                                                const isDotted = shape.id === 'line_dotted';
                                                const isDashed = shape.id === 'line_dashed';
                                                const isCurve = shape.id === 'arrow_ret';
                                                return (
                                                    <button
                                                        key={shape.id}
                                                        onClick={() => addPathElement(shape)}
                                                        className="aspect-square rounded-xl bg-gray-50 hover:bg-gray-100 flex items-center justify-center p-2.5 transition-colors"
                                                    >
                                                        <svg
                                                            viewBox={`0 0 ${shape.dataW} ${Math.max(shape.dataH, 1)}`}
                                                            className="w-full h-full text-gray-700"
                                                            fill="none"
                                                        >
                                                            <path
                                                                d={shape.data}
                                                                fill={shape.preview === 'fill' ? 'currentColor' : 'none'}
                                                                stroke={shape.preview === 'stroke' ? 'currentColor' : 'none'}
                                                                strokeWidth={isDotted || isDashed ? 6 : isCurve ? 6 : 5}
                                                                strokeDasharray={isDotted ? '6 10' : isDashed ? '18 8' : undefined}
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            />
                                                        </svg>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Floating tool palette */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 bg-white rounded-2xl shadow-xl border border-gray-200/80 px-1.5 py-1.5">
                            {toolBtn('select', <MousePointer className="w-4 h-4" />, t('slideEditor.toolbar.select'))}
                            {toolBtn('text', <Type className="w-4 h-4" />, t('slideEditor.toolbar.text'))}
                            {toolBtn('rect', <Square className="w-4 h-4" />, t('slideEditor.toolbar.rect'))}
                            {toolBtn('circle', <Circle className="w-4 h-4" />, t('slideEditor.toolbar.circle'))}
                            <div className="w-px h-4 bg-gray-200 mx-0.5" />
                            <button
                                title="Elementos"
                                onClick={() => setElementsOpen((o) => !o)}
                                className={`p-2.5 rounded-xl transition-all ${elementsOpen ? 'bg-[#E8440A] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-100'}`}
                            >
                                <Shapes className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="shadow-2xl rounded-sm overflow-hidden" style={{ width: displayW, height: displayH }}>
                            <Stage ref={stageRef} width={displayW} height={displayH} scaleX={scale} scaleY={scale}
                                onClick={handleStageClick} style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}>
                                <Layer>
                                    <Rect id="bg" x={0} y={0} width={SLIDE_W} height={slideH} fill={slide.background} listening={true} />

                                    {[...slide.elements].sort((a, b) => {
                                        const aIsBg = a.type === 'image' && a.isBackground ? -1 : 0;
                                        const bIsBg = b.type === 'image' && b.isBackground ? -1 : 0;
                                        return aIsBg - bIsBg;
                                    }).map((el) => {
                                        const common = {
                                            key: el.id, id: el.id,
                                            draggable: tool === 'select',
                                            onClick: () => { if (tool === 'select') setSelectedId(el.id); },
                                            onTap: () => { if (tool === 'select') setSelectedId(el.id); },
                                            shadowEnabled: el.shadowEnabled,
                                            shadowColor: el.shadowColor,
                                            shadowBlur: el.shadowBlur,
                                            shadowOffsetX: el.shadowOffsetX,
                                            shadowOffsetY: el.shadowOffsetY,
                                            shadowOpacity: el.shadowOpacity,
                                        };

                                        if (el.type === 'text') {
                                            return (
                                                <KonvaTextEl
                                                    key={el.id}
                                                    el={el}
                                                    hidden={editingId === el.id}
                                                    draggable={tool === 'select'}
                                                    onSelect={() => { if (tool === 'select') setSelectedId(el.id); }}
                                                    onDblClick={() => startEditing(el)}
                                                    onChange={(patch) => updateElement(el.id, patch as Partial<SlideEl>)}
                                                />
                                            );
                                        }

                                        if (el.type === 'rect') {
                                            const dash = borderStyleToDash(el.borderStyle, el.strokeWidth);
                                            return (
                                                <Rect {...common}
                                                    x={el.x} y={el.y} width={el.width} height={el.height}
                                                    rotation={el.rotation} opacity={el.opacity}
                                                    fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth}
                                                    cornerRadius={el.cornerRadius}
                                                    dash={dash.length ? dash : undefined}
                                                    dashEnabled={el.dashEnabled}
                                                    onDragEnd={(e) => updateElement(el.id, { x: e.target.x(), y: e.target.y() } as Partial<ShapeEl>)}
                                                    onTransformEnd={(e) => {
                                                        const node = e.target;
                                                        updateElement(el.id, { x: node.x(), y: node.y(), width: Math.max(10, node.width() * node.scaleX()), height: Math.max(10, node.height() * node.scaleY()), rotation: node.rotation() } as Partial<ShapeEl>);
                                                        node.scaleX(1); node.scaleY(1);
                                                    }}
                                                />
                                            );
                                        }

                                        if (el.type === 'circle') {
                                            const dash = borderStyleToDash(el.borderStyle, el.strokeWidth);
                                            return (
                                                <KonvaCircle {...common}
                                                    x={el.x + el.width / 2} y={el.y + el.height / 2}
                                                    radiusX={el.width / 2} radiusY={el.height / 2}
                                                    rotation={el.rotation} opacity={el.opacity}
                                                    fill={el.fill} stroke={el.stroke} strokeWidth={el.strokeWidth}
                                                    dash={dash.length ? dash : undefined}
                                                    dashEnabled={el.dashEnabled}
                                                    onDragEnd={(e) => updateElement(el.id, { x: e.target.x() - el.width / 2, y: e.target.y() - el.height / 2 } as Partial<ShapeEl>)}
                                                    onTransformEnd={(e) => {
                                                        const node = e.target;
                                                        const nw = Math.max(10, el.width * node.scaleX());
                                                        const nh = Math.max(10, el.height * node.scaleY());
                                                        updateElement(el.id, { x: node.x() - nw / 2, y: node.y() - nh / 2, width: nw, height: nh, rotation: node.rotation() } as Partial<ShapeEl>);
                                                        node.scaleX(1); node.scaleY(1);
                                                    }}
                                                />
                                            );
                                        }

                                        if (el.type === 'image') {
                                            return <KonvaImageEl key={el.id} el={el} slideW={SLIDE_W} slideH={slideH} draggable={tool === 'select'} onSelect={() => { if (tool === 'select') setSelectedId(el.id); }} onChange={(patch) => updateElement(el.id, patch as Partial<SlideEl>)} />;
                                        }

                                        if (el.type === 'gradient') {
                                            const gp = gradientLinearProps(el);
                                            return (
                                                <Rect {...common}
                                                    x={el.x} y={el.y} width={el.width} height={el.height}
                                                    rotation={el.rotation} opacity={el.opacity}
                                                    fillLinearGradientStartPoint={gp.start}
                                                    fillLinearGradientEndPoint={gp.end}
                                                    fillLinearGradientColorStops={gp.stops}
                                                    onDragEnd={(e) => updateElement(el.id, { x: e.target.x(), y: e.target.y() } as Partial<GradientEl>)}
                                                    onTransformEnd={(e) => {
                                                        const node = e.target;
                                                        updateElement(el.id, { x: node.x(), y: node.y(), width: Math.max(10, node.width() * node.scaleX()), height: Math.max(10, node.height() * node.scaleY()), rotation: node.rotation() } as Partial<GradientEl>);
                                                        node.scaleX(1); node.scaleY(1);
                                                    }}
                                                />
                                            );
                                        }

                                        if (el.type === 'path') {
                                            // Wrap in Group (same pattern as TextEl/ImageEl) so the Transformer
                                            // uses scaleX/scaleY=1 on the group and the path keeps its own scaling.
                                            return (
                                                <Group
                                                    key={el.id}
                                                    id={el.id}
                                                    x={el.x} y={el.y}
                                                    rotation={el.rotation} opacity={el.opacity}
                                                    draggable={tool === 'select'}
                                                    onClick={() => { if (tool === 'select') setSelectedId(el.id); }}
                                                    onTap={() => { if (tool === 'select') setSelectedId(el.id); }}
                                                    shadowEnabled={el.shadowEnabled} shadowColor={el.shadowColor}
                                                    shadowBlur={el.shadowBlur} shadowOffsetX={el.shadowOffsetX}
                                                    shadowOffsetY={el.shadowOffsetY} shadowOpacity={el.shadowOpacity}
                                                    onDragEnd={(e) => updateElement(el.id, { x: e.target.x(), y: e.target.y() } as Partial<PathEl>)}
                                                    onTransformEnd={(e) => {
                                                        const node = e.target;
                                                        updateElement(el.id, {
                                                            x: node.x(), y: node.y(),
                                                            width: Math.max(4, el.width * node.scaleX()),
                                                            height: Math.max(4, el.height * node.scaleY()),
                                                            rotation: node.rotation(),
                                                        } as Partial<PathEl>);
                                                        node.scaleX(1); node.scaleY(1);
                                                    }}
                                                >
                                                    <KonvaPath
                                                        data={el.data}
                                                        scaleX={el.width / el.dataW}
                                                        scaleY={el.height / el.dataH}
                                                        fill={el.fill === 'none' ? undefined : el.fill}
                                                        stroke={el.strokeWidth > 0 ? el.stroke : undefined}
                                                        strokeWidth={el.strokeWidth}
                                                        strokeScaleEnabled={false}
                                                    />
                                                </Group>
                                            );
                                        }

                                        return null;
                                    })}

                                    <Transformer ref={trRef} rotateEnabled={true}
                                        enabledAnchors={['top-left','top-center','top-right','middle-right','middle-left','bottom-left','bottom-center','bottom-right']}
                                        boundBoxFunc={(oldBox, newBox) => (Math.abs(newBox.width) < 2 || Math.abs(newBox.height) < 2 ? oldBox : newBox)}
                                        borderStroke="#E8440A" anchorStroke="#E8440A" anchorFill="#ffffff" anchorSize={8} />
                                </Layer>
                            </Stage>
                        </div>
                    </div>

                    {/* Right: Properties */}
                    <div className="bg-white border-l border-gray-100 shrink-0 overflow-hidden flex flex-col" style={{ width: PANEL_RIGHT }}>
                        <div className="px-4 py-2.5 border-b border-gray-100 shrink-0">
                            <p className="text-xs font-semibold text-gray-500">{t('slideEditor.properties.panel')}</p>
                        </div>
                        <PropertiesPanel
                            el={selectedEl}
                            onChange={(patch) => selectedId && updateElement(selectedId, patch as Partial<SlideEl>)}
                            onDelete={() => selectedId && deleteElement(selectedId)}
                        />
                    </div>
                </div>
            </div>

            {/* ── Full-screen generation loader ─────────────────────────────── */}
            {aiModalOpen && (aiStatus === 'generating' || aiStatus === 'imaging') && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950/95 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-8 max-w-sm w-full text-center px-6">
                        <div className="relative flex items-center justify-center">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-2xl">
                                <Sparkles className="w-10 h-10 text-white" />
                            </div>
                            <div className="absolute inset-0 rounded-2xl border-2 border-violet-400/40 animate-ping" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white mb-2">
                                {aiStatus === 'generating' ? t('slideEditor.ai.statusGenerating') : t('slideEditor.ai.statusImages')}
                            </h2>
                            <p className="text-sm text-gray-400">
                                {aiStatus === 'generating' ? t('slideEditor.ai.statusGeneratingHint') : t('slideEditor.ai.statusImagesHint')}
                            </p>
                        </div>
                        {aiStatus === 'imaging' && aiProgress.length > 0 ? (
                            <div className="w-full space-y-2">
                                {aiProgress.map((slideTitle, i) => (
                                    <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-2.5">
                                        <div className="w-2 h-2 rounded-full bg-violet-400 shrink-0 animate-pulse" />
                                        <span className="text-sm text-gray-300 truncate">{slideTitle}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                        )}
                    </div>
                </div>
            )}

            {/* ── AI Carousel Modal (idle / error) ──────────────────────────── */}
            {aiModalOpen && (aiStatus === 'idle' || aiStatus === 'error') && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-indigo-50">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-violet-600" />
                                <h2 className="text-base font-semibold text-gray-800">{t('slideEditor.ai.modalTitle')}</h2>
                            </div>
                            <button onClick={closeAiModal} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('slideEditor.ai.topicLabel')}</label>
                                <textarea
                                    value={aiTopic}
                                    onChange={(e) => setAiTopic(e.target.value)}
                                    placeholder={t('slideEditor.ai.topicPlaceholder')}
                                    rows={3}
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('slideEditor.ai.styleLabel')}</label>
                                <input
                                    value={aiStyle}
                                    onChange={(e) => setAiStyle(e.target.value)}
                                    placeholder={t('slideEditor.ai.stylePlaceholder')}
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('slideEditor.ai.slideCountLabel')}</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range" min={2} max={10} value={aiSlideCount}
                                        onChange={(e) => setAiSlideCount(Number(e.target.value))}
                                        className="flex-1 accent-violet-600"
                                    />
                                    <span className="text-sm font-semibold text-violet-700 w-6 text-center">{aiSlideCount}</span>
                                </div>
                            </div>
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={aiGenerateImages}
                                        onChange={(e) => setAiGenerateImages(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                    />
                                    <span className="text-xs font-medium text-gray-600">Gerar imagens de fundo com IA</span>
                                </label>
                            </div>
                            {aiStatus === 'error' && (
                                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{aiError}</p>
                            )}
                            <button
                                onClick={() => generateCarousel()}
                                disabled={!aiTopic.trim()}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                                <Sparkles className="w-4 h-4" /> {t('slideEditor.ai.generateBtn')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
