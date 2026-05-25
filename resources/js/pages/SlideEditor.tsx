/* eslint-disable curly */
import { Head, router, usePage } from '@inertiajs/react';
import Konva from 'konva';
import { Grid2X2, Highlighter, ImageOff, Image as ImageIcon, Layers, Loader2, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import CarouselGenerationController from '@/actions/App/Http/Controllers/CarouselGenerationController';
import SlideProjectController from '@/actions/App/Http/Controllers/SlideProjectController';
import { loadGoogleFont } from '@/utils/google-fonts';

import {
    SLIDE_W, FORMATS, Format, Tool,
    SlideEl, Slide, TextEl, ImageEl,
} from '@/components/SlideEditor/types';
import { uid, makeSlide, SHADOW_DEFAULTS, getSafeAreaBounds, getSafeAreaPadding, preserveSingleHighlightRichText } from '@/components/SlideEditor/utils';

import { useUndoRedo } from '@/components/SlideEditor/hooks/useUndoRedo';
import { useSlideManager } from '@/components/SlideEditor/hooks/useSlideManager';
import { useAiGeneration, ImageMode } from '@/components/SlideEditor/hooks/useAiGeneration';

import { ShapeDef } from '@/components/SlideEditor/shapes';
import { SLIDE_TEMPLATES, TemplateContent, TemplatePreview } from '@/components/SlideEditor/templates';

import { EditorToolbar } from '@/components/SlideEditor/EditorToolbar';
import { CanvasArea } from '@/components/SlideEditor/CanvasArea';
import { SlideGlobalPanel } from '@/components/SlideEditor/SlideGlobalPanel';
import { SlideRightPanel } from '@/components/SlideEditor/SlideRightPanel';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SlideProjectProp {
    id: number;
    title: string;
    caption?: string | null;
    format: Format;
    slides: Slide[];
}

interface WizardConfig {
    topic: string;
    style: string;
    slideCount: number;
    imageMode: ImageMode;
    wordHighlight: boolean;
}

interface InstagramAccount {
    id: number;
    provider: string;
    handle: string | null;
    avatar: string | null;
    expires_at: string | null;
}

const STORAGE_KEY = 'slidezz_editor_v1';
const LEFT_PANEL_W = 240;
const RIGHT_PANEL_W = 280;

function loadSavedState(): { slides: Slide[]; currentIdx: number; format: Format } | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SlideEditor() {
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
    const { t } = useTranslation();
    const [title, setTitle] = useState(slideProject?.title ?? t('slideEditor.toolbar.untitled'));
    const [caption, setCaption] = useState(slideProject?.caption ?? '');
    const [projectId, setProjectId] = useState<number | null>(slideProject?.id ?? null);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
    const [igAccountId] = useState<number | null>(instagramAccounts?.[0]?.id ?? null);
    const [igPosting, setIgPosting] = useState(false);
    const [elementsOpen, setElementsOpen] = useState(false);
    const [publishAt, setPublishAt] = useState<Date | undefined>(undefined);

    // ── AI carousel generation ──────────────────────────────────────────────
    const {
        aiModalOpen, setAiModalOpen,
        aiTopic, setAiTopic,
        aiStyle, setAiStyle,
        aiSlideCount, setAiSlideCount,
        aiImageMode, setAiImageMode,
        aiWordHighlight, setAiWordHighlight,
        aiTemplateId, setAiTemplateId,
        aiStatus,
        aiProgress, aiError,
        closeAiModal,
        generateCarousel,
    } = useAiGeneration(slides, setSlides, setCurrentIdx, setSelectedId, format);

    // ── Refs ────────────────────────────────────────────────────────────────
    const stageRef = useRef<Konva.Stage>(null);
    const trRef = useRef<Konva.Transformer>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [displayW, setDisplayW] = useState(600);
    const [displayH, setDisplayH] = useState(600);
    const [showSafeAreaGuide, setShowSafeAreaGuide] = useState(false);

    const safeIdx = Math.max(0, Math.min(currentIdx, slides.length - 1));
    useEffect(() => {
        if (currentIdx !== safeIdx) setCurrentIdx(safeIdx);
    }, [currentIdx, safeIdx]);

    const {
        slide, updateSlide,
        addSlide, deleteSlide, duplicateSlide,
        bringToFront, bringForward, sendBackward, sendToBack,
        addElement, updateElement, deleteElement,
    } = useSlideManager(slides, setSlides, safeIdx, setCurrentIdx, setSelectedId, setTool);

    const slideH = FORMATS[format].h;
    const scale = displayW / SLIDE_W;
    const safeAreaBounds = useMemo(() => getSafeAreaBounds(format), [format]);
    const safeAreaPadding = useMemo(() => getSafeAreaPadding(format), [format]);

    // ── Canvas sizing ────────────────────────────────────────────────────────
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

    // ── Transformer sync ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!trRef.current || !stageRef.current) return;
        if (!selectedId) { trRef.current.nodes([]); trRef.current.getLayer()?.batchDraw(); return; }
        const node = stageRef.current.findOne(`#${selectedId}`);
        if (node) { trRef.current.nodes([node]); trRef.current.getLayer()?.batchDraw(); }
    }, [selectedId, slide.elements]);

    // ── Keyboard shortcuts ───────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (editingId) return;
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
                updateSlide({ elements: slide.elements.filter((el) => el.id !== selectedId) });
                setSelectedId(null);
            }
            if (e.key === 'Escape') { setSelectedId(null); setEditingId(null); }
            if (e.ctrlKey || e.metaKey) {
                if (e.key.toLowerCase() === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) { redo(); } else { undo(); }
                } else if (e.key.toLowerCase() === 'y') {
                    e.preventDefault();
                    redo();
                }
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [selectedId, editingId, slide, undo, redo]);

    // ─── Save ────────────────────────────────────────────────────────────────

    async function saveProject(): Promise<number | null> {
        setSaveStatus('saving');
        const body = { title, caption, format, slides };
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

    // ─── Auto-save ───────────────────────────────────────────────────────────
    useEffect(() => {
        setSaveStatus('saving');
        const timer = setTimeout(() => { saveProject(); }, 1500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slides, format, title]);

    // ─── Auto-open AI modal from wizard ─────────────────────────────────────
    useEffect(() => {
        if (!wizardConfig) return;
        setAiTopic(wizardConfig.topic);
        setAiStyle(wizardConfig.style);
        setAiSlideCount(wizardConfig.slideCount);
        const mode: ImageMode = wizardConfig.imageMode ?? 'background';
        setAiImageMode(mode);
        const hl = wizardConfig.wordHighlight ?? true;
        setAiWordHighlight(hl);
        setAiModalOpen(true);
        generateCarousel(wizardConfig.topic, wizardConfig.style, wizardConfig.slideCount, mode, hl);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ─── Helpers ─────────────────────────────────────────────────────────────

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
        updateSlide({ background: scene.background, elements: [...preservedBackgroundImages, ...scene.elements] });
    }

    // ─── Stage click ──────────────────────────────────────────────────────────

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
                text: 'Text', fontSize: 48, fontFamily: 'Space Mono', fill: '#111111',
                fontStyle: '', align: 'left', verticalAlign: 'top',
                lineHeight: 1.2, letterSpacing: 0, textDecoration: '', stroke: '#000000',
                strokeWidth: 0, padding: 12, wrap: 'word',
                accentEnabled: false, accentColor: '#E8440A', accentThickness: 6, accentSide: 'left', accentGap: 12,
                ...SHADOW_DEFAULTS,
            });
            loadGoogleFont('Space Mono');
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
        } else if (tool === 'button') {
            addElement({
                id: uid(), type: 'button',
                x: x - 240, y: y - 52, width: 480, height: 104,
                rotation: 0, opacity: 1,
                text: 'Follow Now',
                fontSize: 48, fontFamily: 'Space Mono', fontStyle: 'bold', letterSpacing: 0,
                fill: '#111111', bgColor: '#f2f2f2', bgEnabled: true, bgOpacity: 1,
                stroke: '#d9d9d9', strokeWidth: 2, cornerRadius: 16, borderStyle: 'solid', dashEnabled: false,
                paddingX: 60, paddingY: 0, align: 'center',
                iconEnabled: false, icon: '→', iconPosition: 'right',
                ...SHADOW_DEFAULTS,
            });
            loadGoogleFont('Space Mono');
        }
    }

    function handleStageDragStart(e: Konva.KonvaEventObject<DragEvent>) {
        const target = e.target;
        const targetId = target.id();
        const parentId = target.parent?.id?.() ?? '';
        const isElementDrag = slide.elements.some((el) => el.id === targetId || el.id === parentId);
        setShowSafeAreaGuide(isElementDrag);
    }

    function handleStageDragEnd() {
        setShowSafeAreaGuide(false);
    }

    // ─── Add elements ─────────────────────────────────────────────────────────

    function addGradientElement() {
        addElement({
            id: uid(), type: 'gradient',
            x: 0, y: Math.round(slideH / 2),
            width: SLIDE_W, height: Math.round(slideH / 2),
            rotation: 0, opacity: 1, color: '#000000', direction: 'bottom',
            ...SHADOW_DEFAULTS,
        });
    }

    function addDefaultTextElement() {
        addElement({
            id: uid(), type: 'text',
            x: Math.round(SLIDE_W / 2 - 200), y: Math.round(slideH / 2 - 40),
            width: 400, height: 80, rotation: 0, opacity: 1,
            text: 'Text', fontSize: 48, fontFamily: 'Space Mono', fill: '#111111',
            fontStyle: '', align: 'center', verticalAlign: 'top',
            lineHeight: 1.2, letterSpacing: 0, textDecoration: '', stroke: '#000000',
            strokeWidth: 0, padding: 12, wrap: 'word',
            accentEnabled: false, accentColor: '#E8440A', accentThickness: 6, accentSide: 'left', accentGap: 12,
            ...SHADOW_DEFAULTS,
        });
        loadGoogleFont('Space Mono');
        setTool('select');
    }

    function addPathElement(def: ShapeDef) {
        const cx = Math.round(SLIDE_W / 2 - def.initW / 2);
        const cy = Math.round(slideH / 2 - def.initH / 2);
        addElement({
            id: uid(), type: 'path',
            x: cx, y: cy, width: def.initW, height: def.initH,
            rotation: 0, opacity: 1,
            data: def.data, dataW: def.dataW, dataH: def.dataH,
            fill: def.fill, stroke: def.stroke, strokeWidth: def.strokeWidth,
            borderStyle: 'solid', dashEnabled: def.dashEnabled ?? false,
            ...SHADOW_DEFAULTS,
        });
        setElementsOpen(false);
    }

    // ─── Image upload ─────────────────────────────────────────────────────────

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
                overlayEnabled: false, overlayColor: '#000000', overlayOpacity: 1, overlayPreset: 'none',
                isBackground: false, bgSize: 'cover', bgPositionX: 50, bgPositionY: 50,
                ...SHADOW_DEFAULTS,
            });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }

    // ─── Text inline editing ──────────────────────────────────────────────────

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
        textarea.addEventListener('keydown', (ev) => {
            if (ev.key === 'Escape') { document.body.removeChild(textarea); setEditingId(null); }
        });
    }

    // ─── Export ───────────────────────────────────────────────────────────────

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
        if (format !== 'post') { window.alert(t('slideEditor.alerts.switchFormat')); return; }
        setIgPosting(true);
        try {
            const id = (await saveProject()) ?? projectId;
            if (!id) throw new Error('Could not save slideshow before publishing.');
            const blobs = await exportAllSlidesJpeg();
            if (blobs.length !== slides.length) throw new Error('Failed to export slides.');
            const form = new FormData();
            form.append('social_account_id', String(igAccountId));
            form.append('caption', caption);
            if (publishAt) form.append('publish_at', publishAt.toISOString());
            blobs.forEach((blob, idx) => form.append('images[]', blob, `slide-${idx + 1}.jpg`));
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
            const res = await fetch(`/slideshow-editor/${id}/publish/instagram`, {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrfToken },
                body: form,
            });
            let data: any = {};
            try { data = await res.json(); } catch { /* not JSON */ }
            if (!res.ok) throw new Error(data?.message || `Server error: ${res.status}`);
            window.alert(data?.message || 'Posted to Instagram.');
            setPublishAt(undefined);
        } catch (e) {
            window.alert(e instanceof Error ? e.message : 'Failed to publish to Instagram.');
        } finally {
            setIgPosting(false);
        }
    }

    // ─── Derived ──────────────────────────────────────────────────────────────

    const selectedEl = slide.elements.find((el) => el.id === selectedId) ?? null;

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <>
            <Head title={t('slideEditor.pageTitle')} />
            <div className="flex flex-col overflow-hidden" style={{ height: '100vh' }}>

                <EditorToolbar
                    pastLength={past.length}
                    futureLength={future.length}
                    onUndo={undo}
                    onRedo={redo}
                    selectedId={selectedId}
                    onBringToFront={() => selectedId && bringToFront(selectedId)}
                    onBringForward={() => selectedId && bringForward(selectedId)}
                    onSendBackward={() => selectedId && sendBackward(selectedId)}
                    onSendToBack={() => selectedId && sendToBack(selectedId)}
                    onImageUpload={handleImageUpload}
                    onAddGradient={addGradientElement}
                    title={title}
                    onTitleChange={setTitle}
                    saveStatus={saveStatus}
                    onSave={saveProject}
                    format={format}
                    onFormatChange={setFormat}
                    onExportPNG={exportPNG}
                    instagramAccounts={instagramAccounts}
                    igPosting={igPosting}
                    slidesCount={slides.length}
                    publishAt={publishAt}
                    onPublishAtChange={setPublishAt}
                    onPublishToInstagram={publishCarouselToInstagram}
                />

                <div className="flex flex-1 overflow-hidden">

                    {/* Left: Slide global properties */}
                    <div className="shrink-0 overflow-hidden" style={{ width: LEFT_PANEL_W }}>
                        <SlideGlobalPanel
                            slide={slide}
                            onBackgroundChange={(color) => updateSlide({ background: color })}
                            onAddText={addDefaultTextElement}
                            onSelectElement={(id) => { setTool('select'); setSelectedId(id); }}
                            onDeleteElement={(id) => deleteElement(id)}
                            onCornersChange={(c) => updateSlide({ corners: c })}
                        />
                    </div>

                    {/* Center: Canvas */}
                    <CanvasArea
                        slide={slide}
                        slideH={slideH}
                        scale={scale}
                        displayW={displayW}
                        displayH={displayH}
                        containerRef={containerRef}
                        stageRef={stageRef}
                        trRef={trRef}
                        tool={tool}
                        onToolChange={setTool}
                        selectedId={selectedId}
                        onSelectElement={setSelectedId}
                        editingId={editingId}
                        safeIdx={safeIdx}
                        slidesCount={slides.length}
                        showSafeAreaGuide={showSafeAreaGuide}
                        safeAreaBounds={safeAreaBounds}
                        safeAreaPadding={safeAreaPadding}
                        elementsOpen={elementsOpen}
                        onElementsOpenChange={setElementsOpen}
                        onStageClick={handleStageClick}
                        onStageDragStart={handleStageDragStart}
                        onStageDragEnd={handleStageDragEnd}
                        onAddPath={addPathElement}
                        onStartEditing={startEditing}
                        onElementChange={(id, patch) => updateElement(id, patch)}
                        onPrevSlide={() => { if (safeIdx > 0) { setCurrentIdx(safeIdx - 1); setSelectedId(null); } }}
                        onNextSlide={() => { if (safeIdx < slides.length - 1) { setCurrentIdx(safeIdx + 1); setSelectedId(null); } }}
                        corners={slide.corners}
                    />

                    {/* Right: Thumbnails + Editing Layer */}
                    <div className="shrink-0 overflow-hidden" style={{ width: RIGHT_PANEL_W }}>
                        <SlideRightPanel
                            slides={slides}
                            currentIdx={safeIdx}
                            format={format}
                            selectedEl={selectedEl}
                            onSelectSlide={(idx) => { setCurrentIdx(idx); setSelectedId(null); }}
                            onAddSlide={addSlide}
                            onDuplicateSlide={duplicateSlide}
                            onDeleteSlide={deleteSlide}
                            onElementChange={(patch) => selectedId && updateElement(selectedId, patch)}
                            onElementDelete={() => selectedId && deleteElement(selectedId)}
                        />
                    </div>
                </div>
            </div>

            {/* ── AI Generation status bar ─────────────────────────────────── */}
            {aiModalOpen && (aiStatus === 'generating' || aiStatus === 'imaging') && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-80 bg-gray-900/95 border border-white/10 rounded-xl px-4 py-3 shadow-xl backdrop-blur-sm flex flex-col gap-2">
                    <div className="flex items-center gap-2.5">
                        <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin shrink-0" />
                        <span className="text-sm text-gray-200 truncate flex-1">
                            {aiStatus === 'generating'
                                ? 'Generating carousel...'
                                : `Slide ${aiProgress.length} of ${aiSlideCount} — generating images`}
                        </span>
                        {aiStatus === 'imaging' && (
                            <span className="text-xs text-gray-500 shrink-0">
                                {Math.round((aiProgress.length / aiSlideCount) * 100)}%
                            </span>
                        )}
                    </div>
                    {aiStatus === 'imaging' && (
                        <>
                            <div className="h-px bg-white/10 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-violet-500 rounded-full transition-all duration-500"
                                    style={{ width: `${Math.round((aiProgress.length / aiSlideCount) * 100)}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-600">Images appear in the canvas as they're ready</p>
                        </>
                    )}
                </div>
            )}

            {/* ── AI Modal (idle / error) ──────────────────────────────────── */}
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
                                <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('slideEditor.ai.visualStyleLabel')}</label>
                                <div className="grid grid-cols-2 gap-1.5 max-h-60 overflow-y-auto pr-0.5">
                                    {SLIDE_TEMPLATES.map((tpl) => (
                                        <button
                                            key={tpl.id}
                                            type="button"
                                            onClick={() => setAiTemplateId(aiTemplateId === tpl.id ? null : tpl.id)}
                                            className={`text-left rounded-xl border-2 p-2 transition-all ${aiTemplateId === tpl.id ? 'border-violet-500 bg-violet-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                                        >
                                            <div className="relative w-full rounded-lg overflow-hidden mb-1.5" style={{ aspectRatio: '1' }}>
                                                <TemplatePreview id={tpl.id} />
                                            </div>
                                            <p className="text-[10px] font-semibold text-gray-700 leading-tight">{tpl.name}</p>
                                            {tpl.description && (
                                                <p className="text-[9px] text-gray-400 mt-0.5 leading-tight line-clamp-2">{tpl.description}</p>
                                            )}
                                        </button>
                                    ))}
                                </div>
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
                                <p className="text-xs font-medium text-gray-500 mb-2">{t('slideEditor.ai.generateImagesLabel')}</p>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {([
                                        { id: 'none' as ImageMode, label: t('slideEditor.ai.imageMode.none'), Icon: ImageOff },
                                        { id: 'background' as ImageMode, label: t('slideEditor.ai.imageMode.backgroundShort'), Icon: ImageIcon },
                                        { id: 'grid' as ImageMode, label: t('slideEditor.ai.imageMode.gridShort'), Icon: Grid2X2 },
                                        { id: 'alternate' as ImageMode, label: t('slideEditor.ai.imageMode.alternateShort'), Icon: Layers },
                                    ]).map(({ id, label, Icon }) => (
                                        <button key={id} type="button" onClick={() => setAiImageMode(id)}
                                            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-all ${aiImageMode === id ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                            <Icon className="h-3.5 w-3.5 shrink-0" />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Highlighter className="w-3.5 h-3.5 text-gray-500" />
                                    <span className="text-xs font-medium text-gray-600">{t('slideEditor.ai.wordHighlight')}</span>
                                </div>
                                <button type="button" onClick={() => setAiWordHighlight(!aiWordHighlight)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${aiWordHighlight ? 'bg-violet-600' : 'bg-gray-200'}`}>
                                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${aiWordHighlight ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
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
