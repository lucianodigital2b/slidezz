/* eslint-disable curly */
import { Head, router, usePage } from '@inertiajs/react';
import Konva from 'konva';
import { Highlighter, Loader2, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import CarouselGenerationController from '@/actions/App/Http/Controllers/CarouselGenerationController';
import SlideProjectController from '@/actions/App/Http/Controllers/SlideProjectController';
import SlideTemplateController from '@/actions/App/Http/Controllers/SlideTemplateController';
import { loadGoogleFont } from '@/utils/google-fonts';

import {
    SLIDE_W, FORMATS, Format, Tool,
    SlideEl, Slide, TextEl, ImageEl, CornerKey, SlideCorners, ProfileBadge,
} from '@/components/SlideEditor/types';
import { uid, makeSlide, SHADOW_DEFAULTS, getSafeAreaBounds, getSafeAreaPadding, preserveSingleHighlightRichText } from '@/components/SlideEditor/utils';

import { useUndoRedo } from '@/components/SlideEditor/hooks/useUndoRedo';
import { useSlideManager } from '@/components/SlideEditor/hooks/useSlideManager';
import { useAiGeneration, ImageMode } from '@/components/SlideEditor/hooks/useAiGeneration';

import { ShapeDef } from '@/components/SlideEditor/shapes';
import { createZip } from '@/components/SlideEditor/zip';
import { SLIDE_TEMPLATES, TemplateContent, TemplatePreview } from '@/components/SlideEditor/templates';

import { EditorToolbar } from '@/components/SlideEditor/EditorToolbar';
import { CanvasArea, SLIDE_GAP, slideOffsetX } from '@/components/SlideEditor/CanvasArea';
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
    template?: string | null;
    slideCount: number;
    imageMode: ImageMode;
    wordHighlight: boolean;
    language?: string;
    saveAsTemplate?: boolean;
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
    // Mirror of projectId readable synchronously inside saveProject so chained
    // autosaves can't fire a duplicate POST /store before the state updates.
    const projectIdRef = useRef<number | null>(slideProject?.id ?? null);
    const saveInFlightRef = useRef<Promise<number | null> | null>(null);
    // Guards the wizard auto-generation against React StrictMode's double-invoke.
    const wizardStartedRef = useRef(false);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
    const [templateStatus, setTemplateStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [igAccountId] = useState<number | null>(instagramAccounts?.[0]?.id ?? null);
    const [igPosting, setIgPosting] = useState(false);
    const [exportingZip, setExportingZip] = useState(false);
    const [elementsOpen, setElementsOpen] = useState(false);
    const [publishAt, setPublishAt] = useState<Date | undefined>(undefined);
    const [selectedCornerId, setSelectedCornerId] = useState<CornerKey | null>(null);

    // ── AI carousel generation ──────────────────────────────────────────────
    const {
        aiModalOpen, setAiModalOpen,
        aiTopic, setAiTopic,
        aiStyle, setAiStyle,
        aiSlideCount, setAiSlideCount,
        aiImageMode, setAiImageMode,
        aiWordHighlight, setAiWordHighlight,
        aiLanguage, setAiLanguage,
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
    // `displayW` describes a single slide; the row is laid out from it plus
    // SLIDE_GAP. We size so up to 3 slides fit across the visible width (and
    // within the height); any beyond that scroll horizontally.
    useEffect(() => {
        const recalc = () => {
            if (!containerRef.current) return;
            const { width, height } = containerRef.current.getBoundingClientRect();
            const pad = 96;
            const fmt = FORMATS[format];
            const visible = Math.min(Math.max(1, slides.length), 3);
            const visibleRowW = fmt.w * visible + SLIDE_GAP * (visible - 1);
            const scaleByH = (height - pad) / fmt.h;
            const scaleByW = (width - pad) / visibleRowW;
            const s = Math.min(scaleByH, scaleByW);
            setDisplayW(Math.max(80, Math.round(fmt.w * s)));
        };
        const obs = new ResizeObserver(recalc);
        if (containerRef.current) obs.observe(containerRef.current);
        recalc();
        return () => obs.disconnect();
    }, [format, slides.length]);

    // ── Transformer sync ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!trRef.current || !stageRef.current) return;
        if (!selectedId) { trRef.current.nodes([]); trRef.current.getLayer()?.batchDraw(); return; }
        const node = stageRef.current.findOne(`#${selectedId}`);
        if (node) { trRef.current.nodes([node]); trRef.current.getLayer()?.batchDraw(); }
        else { trRef.current.nodes([]); trRef.current.getLayer()?.batchDraw(); }
    }, [selectedId, slides]);

    // ── Keyboard shortcuts ───────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const isEditableTarget = !!target && (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target instanceof HTMLSelectElement ||
                target.isContentEditable ||
                target.closest('[contenteditable="true"]') !== null
            );

            if (isEditableTarget) return;
            if (editingId) return;
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCornerId) {
                handleCornerElDelete();
            } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
                deleteElement(selectedId);
            }
            if (e.key === 'Escape') { setSelectedId(null); setEditingId(null); setSelectedCornerId(null); }
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
        // Chain onto any in-flight save so a second autosave waits for the first
        // to assign a project id, instead of racing it into a duplicate POST /store.
        const previous = saveInFlightRef.current;
        const run = (async (): Promise<number | null> => {
            if (previous) {
                await previous.catch(() => {});
            }
            setSaveStatus('saving');
            const body = { title, caption, format, slides };
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
            try {
                const existingId = projectIdRef.current;
                if (existingId) {
                    await fetch(SlideProjectController.update(existingId).url, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                        body: JSON.stringify(body),
                    });
                    setSaveStatus('saved');
                    return existingId;
                }
                const res = await fetch(SlideProjectController.store().url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                    body: JSON.stringify(body),
                });
                const data = await res.json();
                projectIdRef.current = data.id ?? null;
                setProjectId(data.id);
                router.visit(SlideProjectController.edit(data.id).url, { replace: true, preserveState: true });
                setSaveStatus('saved');
                return data.id ?? null;
            } catch {
                setSaveStatus('error');
                return null;
            }
        })();
        saveInFlightRef.current = run;
        try {
            return await run;
        } finally {
            if (saveInFlightRef.current === run) {
                saveInFlightRef.current = null;
            }
        }
    }

    // ─── Save as reusable template ───────────────────────────────────────────
    async function saveAsTemplate(slidesOverride?: Slide[]): Promise<void> {
        const templateSlides = slidesOverride ?? slides;
        if (templateSlides.length === 0) return;
        setTemplateStatus('saving');

        let thumbnail: string | null = null;
        try {
            thumbnail = stageRef.current
                ? renderSlideDataURL(0, { mimeType: 'image/jpeg', quality: 0.7, pixelRatio: 0.35 / scale })
                : null;
        } catch { /* thumbnail is best-effort */ }

        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
        try {
            const res = await fetch(SlideTemplateController.store().url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                body: JSON.stringify({ title, format, slides: templateSlides, thumbnail }),
            });
            if (!res.ok) throw new Error('save template failed');
            setTemplateStatus('saved');
            setTimeout(() => setTemplateStatus('idle'), 2500);
        } catch {
            setTemplateStatus('error');
            setTimeout(() => setTemplateStatus('idle'), 2500);
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
        if (wizardStartedRef.current) return;
        wizardStartedRef.current = true;
        setAiTopic(wizardConfig.topic);
        setAiStyle(wizardConfig.style);
        setAiSlideCount(wizardConfig.slideCount);
        const mode: ImageMode = wizardConfig.imageMode ?? 'background';
        setAiImageMode(mode);
        const hl = wizardConfig.wordHighlight ?? true;
        setAiWordHighlight(hl);
        const lang = wizardConfig.language ?? 'Portuguese (Brazil)';
        setAiLanguage(lang);
        const templateId = wizardConfig.template ?? null;
        setAiTemplateId(templateId);
        setAiModalOpen(true);
        const shouldSaveTemplate = wizardConfig.saveAsTemplate ?? false;
        generateCarousel(wizardConfig.topic, wizardConfig.style, wizardConfig.slideCount, mode, hl, true, templateId, lang)
            .then((generated) => {
                if (shouldSaveTemplate && generated && generated.length > 0) {
                    // Let the canvas paint the generated slides before snapshotting the thumbnail.
                    setTimeout(() => saveAsTemplate(generated), 400);
                }
            });
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
        const updates: Partial<Slide> = {
            background: scene.background,
            elements: [...preservedBackgroundImages, ...scene.elements],
        };
        if (tpl.id !== 'twitter-x' && scene.badgeX !== undefined && scene.badgeY !== undefined) {
            updates.profileBadge = {
                enabled: true,
                handle: instagramAccounts?.[0]?.handle ?? '',
                photoUrl: instagramAccounts?.[0]?.avatar ?? '',
                size: 60,
                ...slide.profileBadge,
                style: scene.badgeStyle ?? slide.profileBadge?.style ?? 'glass',
                x: scene.badgeX,
                y: scene.badgeY,
            };
        }
        updateSlide(updates);
    }

    // ─── Stage click ──────────────────────────────────────────────────────────

    function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
        if (elementsOpen) { setElementsOpen(false); return; }
        const target = e.target;
        const targetId = target.id?.() ?? '';
        const groupId = (target.parent as Konva.Node | null)?.id?.() ?? '';
        const isBackgroundImage = slides.some(
            (s) => s.elements.some((el): el is ImageEl => el.type === 'image' && el.isBackground && el.id === groupId),
        );
        const clickedOnEmpty =
            target === target.getStage() ||
            (target.getClassName() === 'Rect' && targetId.startsWith('bg-')) ||
            (isBackgroundImage && tool !== 'select');
        if (tool === 'select') { if (clickedOnEmpty) { setSelectedId(null); setSelectedCornerId(null); } return; }
        if (!clickedOnEmpty) return;

        // Map the pointer to a slide in the row and to that slide's local coords.
        const pos = stageRef.current!.getPointerPosition()!;
        const worldX = pos.x / scale;
        const span = SLIDE_W + SLIDE_GAP;
        const idx = Math.max(0, Math.min(slides.length - 1, Math.floor(worldX / span)));
        const x = worldX - slideOffsetX(idx);
        const y = pos.y / scale;
        if (x < 0 || x > SLIDE_W) return; // clicked in the gap between slides
        setCurrentIdx(idx);

        if (tool === 'text') {
            addElement({
                id: uid(), type: 'text', x, y, width: 400, height: 80, rotation: 0, opacity: 1,
                text: 'Text', fontSize: 48, fontFamily: 'Space Mono', fill: '#111111',
                fontStyle: '', align: 'left', verticalAlign: 'top',
                lineHeight: 1.2, letterSpacing: 0, textDecoration: '', stroke: '#000000',
                strokeWidth: 0, padding: 12, wrap: 'word',
                accentEnabled: false, accentColor: '#E8440A', accentThickness: 6, accentSide: 'left', accentGap: 12,
                ...SHADOW_DEFAULTS,
            }, idx);
            loadGoogleFont('Space Mono');
        } else if (tool === 'rect') {
            addElement({
                id: uid(), type: 'rect', x: x - 100, y: y - 60, width: 200, height: 120,
                rotation: 0, opacity: 1, fill: '#E8440A', stroke: '#000000', strokeWidth: 0,
                cornerRadius: 0, borderStyle: 'solid', dashEnabled: false,
                ...SHADOW_DEFAULTS,
            }, idx);
        } else if (tool === 'circle') {
            addElement({
                id: uid(), type: 'circle', x: x - 60, y: y - 60, width: 120, height: 120,
                rotation: 0, opacity: 1, fill: '#E8440A', stroke: '#000000', strokeWidth: 0,
                cornerRadius: 0, borderStyle: 'solid', dashEnabled: false,
                ...SHADOW_DEFAULTS,
            }, idx);
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
            }, idx);
            loadGoogleFont('Space Mono');
        }
    }

    function handleStageDragStart(e: Konva.KonvaEventObject<DragEvent>) {
        const target = e.target;
        const targetId = target.id();
        const parentId = target.parent?.id?.() ?? '';
        const isElementDrag = slides.some((s) => s.elements.some((el) => el.id === targetId || el.id === parentId));
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

    /**
     * Render a single slide from the overview row to a data URL at full
     * resolution. Crops the slide's region out of the wide stage and hides the
     * slide frames / selection handles so they never bleed into the export.
     */
    function renderSlideDataURL(
        idx: number,
        opts: { mimeType?: string; quality?: number; pixelRatio?: number } = {},
    ): string {
        const stage = stageRef.current!;
        const frames = stage.find('.slide-frame');
        frames.forEach((n) => n.hide());
        trRef.current?.nodes([]);
        stage.batchDraw();
        try {
            return stage.toDataURL({
                x: slideOffsetX(idx) * scale,
                y: 0,
                width: SLIDE_W * scale,
                height: slideH * scale,
                pixelRatio: opts.pixelRatio ?? (1 / scale),
                mimeType: opts.mimeType,
                quality: opts.quality,
            });
        } finally {
            frames.forEach((n) => n.show());
            stage.batchDraw();
        }
    }

    function exportPNG() {
        if (!stageRef.current) return;
        setSelectedId(null);
        setTimeout(() => {
            const uri = renderSlideDataURL(safeIdx);
            const link = document.createElement('a');
            link.download = `slide-${safeIdx + 1}.png`;
            link.href = uri;
            link.click();
        }, 50);
    }

    async function exportAllSlidesJpeg(): Promise<Blob[]> {
        if (!stageRef.current) return [];
        setSelectedId(null);
        await new Promise((r) => setTimeout(r, 60));
        const blobs: Blob[] = [];
        for (let i = 0; i < slides.length; i++) {
            const dataUrl = renderSlideDataURL(i, { mimeType: 'image/jpeg', quality: 0.92 });
            const blob = await fetch(dataUrl).then((res) => res.blob());
            blobs.push(blob);
        }
        return blobs;
    }

    // Dev-only: dump the full carousel state for debugging — typography (fonts,
    // sizes, styles, richText, spacing, alignment), images (all props + overlay,
    // base64 stripped to keep the file shareable), backgrounds, the resolved
    // template, and the generation prompt/style/params. Everything needed to
    // reproduce a slide without a screenshot.
    function exportMetadata() {
        const resolvedTemplate = aiTemplateId ? SLIDE_TEMPLATES.find((tpl) => tpl.id === aiTemplateId) ?? null : null;

        const sanitizedSlides = slides.map((s, slideIndex) => ({
            index: slideIndex,
            background: s.background,
            elements: s.elements.map((el) =>
                el.type === 'image'
                    ? {
                        ...el,
                        src: el.src ? `[base64 omitted, ${el.src.length} chars]` : el.src,
                        hasImage: Boolean(el.src),
                    }
                    : el,
            ),
        }));

        const payload = {
            exportedAt: new Date().toISOString(),
            app: 'slidezz-editor',
            project: { id: projectId, title, caption, format, slideW: SLIDE_W, slideH, slideCount: slides.length },
            generation: {
                topic: aiTopic,
                style: aiStyle,
                templateId: aiTemplateId,
                template: resolvedTemplate
                    ? {
                        id: resolvedTemplate.id,
                        name: resolvedTemplate.name,
                        font: resolvedTemplate.font,
                        bodyFont: resolvedTemplate.bodyFont,
                        captionFont: resolvedTemplate.captionFont,
                        background: resolvedTemplate.background,
                        backgroundAlt: resolvedTemplate.backgroundAlt,
                        textColor: resolvedTemplate.textColor,
                        accentColor: resolvedTemplate.accentColor,
                        align: resolvedTemplate.align,
                        letterSpacing: resolvedTemplate.letterSpacing,
                    }
                    : null,
                slideCount: aiSlideCount,
                imageMode: aiImageMode,
                wordHighlight: aiWordHighlight,
                language: aiLanguage,
                wizardConfig: wizardConfig ?? null,
            },
            slides: sanitizedSlides,
        };

        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a');
        link.download = `carousel-metadata-${Date.now()}.json`;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function exportAllSlidesZip() {
        if (!stageRef.current || exportingZip) return;
        setExportingZip(true);
        try {
            const blobs = await exportAllSlidesJpeg();
            if (blobs.length === 0) throw new Error(t('slideEditor.alerts.exportFailed'));
            const files = await Promise.all(blobs.map(async (blob, i) => ({
                name: `slide-${String(i + 1).padStart(2, '0')}.jpg`,
                data: new Uint8Array(await blob.arrayBuffer()),
            })));
            const zipName = (title.trim().replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '') || 'carousel') + '.zip';
            const url = URL.createObjectURL(createZip(files));
            const link = document.createElement('a');
            link.download = zipName;
            link.href = url;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (e) {
            window.alert(e instanceof Error ? e.message : t('slideEditor.alerts.exportFailed'));
        } finally {
            setExportingZip(false);
        }
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

    // ─── Layout rearrangement ─────────────────────────────────────────────────

    function applySlideLayout(elements: SlideEl[], height: number, layoutId: string): SlideEl[] {
        const H = height;
        const PAD = 80;

        const cloned = elements.map((el) => ({ ...el }));

        const imgEl = cloned.find((el): el is ImageEl => el.type === 'image') ?? null;
        const textEls = cloned
            .filter((el): el is TextEl => el.type === 'text')
            .sort((a, b) => (b as TextEl).fontSize - (a as TextEl).fontSize);
        const titleEl = textEls[0] ?? null;
        const descEl  = textEls[1] ?? null;

        const pImg   = (p: Partial<ImageEl>) => { if (imgEl)   Object.assign(imgEl,   p); };
        const pTitle = (p: Partial<TextEl>)  => { if (titleEl) Object.assign(titleEl, p); };
        const pDesc  = (p: Partial<TextEl>)  => { if (descEl)  Object.assign(descEl,  p); };

        switch (layoutId) {
            case 'bg_photo':
                pImg({ x: 0, y: 0, width: SLIDE_W, height: H, isBackground: true, bgSize: 'cover', opacity: 1, cornerRadius: 0 });
                pTitle({ x: PAD, y: Math.round(H * 0.52), width: SLIDE_W - PAD * 2, height: Math.round(H * 0.28), opacity: 1 });
                pDesc({ x: PAD, y: Math.round(H * 0.82), width: SLIDE_W - PAD * 2, height: Math.round(H * 0.13), opacity: 1 });
                break;
            case 'photo_top':
                pImg({ x: PAD, y: PAD, width: SLIDE_W - PAD * 2, height: Math.round(H * 0.40), isBackground: false, cornerRadius: 40, bgSize: 'cover', opacity: 1 });
                pTitle({ x: PAD, y: Math.round(H * 0.46), width: SLIDE_W - PAD * 2, height: Math.round(H * 0.24), opacity: 1 });
                pDesc({ x: PAD, y: Math.round(H * 0.73), width: SLIDE_W - PAD * 2, height: Math.round(H * 0.20), opacity: 1 });
                break;
            case 'photo_bottom':
                pTitle({ x: PAD, y: PAD, width: SLIDE_W - PAD * 2, height: Math.round(H * 0.22), opacity: 1 });
                pDesc({ x: PAD, y: Math.round(H * 0.28), width: SLIDE_W - PAD * 2, height: Math.round(H * 0.22), opacity: 1 });
                pImg({ x: PAD, y: Math.round(H * 0.55), width: SLIDE_W - PAD * 2, height: Math.round(H * 0.38), isBackground: false, cornerRadius: 40, bgSize: 'cover', opacity: 1 });
                break;
            case 'text_photo_text':
                pTitle({ x: PAD, y: PAD, width: SLIDE_W - PAD * 2, height: Math.round(H * 0.16), opacity: 1 });
                pImg({ x: PAD, y: Math.round(H * 0.22), width: SLIDE_W - PAD * 2, height: Math.round(H * 0.38), isBackground: false, cornerRadius: 40, bgSize: 'cover', opacity: 1 });
                pDesc({ x: PAD, y: Math.round(H * 0.64), width: SLIDE_W - PAD * 2, height: Math.round(H * 0.28), opacity: 1 });
                break;
            case 'photo_left':
                pImg({ x: 0, y: 0, width: Math.round(SLIDE_W * 0.48), height: H, isBackground: false, cornerRadius: 0, bgSize: 'cover', opacity: 1 });
                pTitle({ x: Math.round(SLIDE_W * 0.54), y: Math.round(H * 0.28), width: Math.round(SLIDE_W * 0.42), height: Math.round(H * 0.24), opacity: 1 });
                pDesc({ x: Math.round(SLIDE_W * 0.54), y: Math.round(H * 0.56), width: Math.round(SLIDE_W * 0.42), height: Math.round(H * 0.26), opacity: 1 });
                break;
            case 'text_only':
                pImg({ opacity: 0 });
                pTitle({ x: PAD, y: Math.round(H * 0.20), width: SLIDE_W - PAD * 2, height: Math.round(H * 0.28), opacity: 1 });
                pDesc({ x: PAD, y: Math.round(H * 0.52), width: SLIDE_W - PAD * 2, height: Math.round(H * 0.32), opacity: 1 });
                break;
            case 'image_only':
                pImg({ x: 0, y: 0, width: SLIDE_W, height: H, isBackground: true, bgSize: 'cover', opacity: 1, cornerRadius: 0 });
                pTitle({ opacity: 0 });
                pDesc({ opacity: 0 });
                break;
        }

        return cloned;
    }

    function handleLayoutApply(layoutId: string) {
        updateSlide({ elements: applySlideLayout(slide.elements, slideH, layoutId) });
    }

    // ─── Corner element editing ───────────────────────────────────────────────

    const CORNER_FS = 28;

    function makeCornerTextEl(key: CornerKey, corners: NonNullable<Slide['corners']>): TextEl {
        const cfg = corners[key];
        return {
            id: `corner-${key}`,
            type: 'text',
            x: 0, y: 0, width: 600, height: 80,
            rotation: 0, opacity: 1,
            text: cfg.text,
            fontSize: cfg.fontSize ?? CORNER_FS,
            fontFamily: cfg.fontFamily ?? 'Poppins',
            fill: cfg.color,
            fontStyle: cfg.fontStyle ?? '',
            align: 'left', verticalAlign: 'top',
            lineHeight: 1.2, letterSpacing: cfg.letterSpacing ?? 0,
            textDecoration: '',
            stroke: '#000000', strokeWidth: 0, padding: 0, wrap: 'word',
            accentEnabled: false, accentColor: '#E8440A', accentThickness: 6, accentSide: 'left', accentGap: 12,
            ...SHADOW_DEFAULTS,
        };
    }

    function handleCornerElChange(patch: Partial<SlideEl>) {
        if (!selectedCornerId) return;
        const corners: NonNullable<SlideCorners> = slide.corners ?? {
            topLeft: { text: '', enabled: false, color: '#111111' },
            topRight: { text: '', enabled: false, color: '#111111' },
            bottomLeft: { text: '', enabled: false, color: '#111111' },
            bottomRight: { text: '', enabled: false, color: '#111111' },
            show: true, showDots: false, bottomRightIcon: 'none',
        };
        const tp = patch as Partial<TextEl>;
        const cp: Partial<typeof corners[CornerKey]> = {};
        if (tp.text !== undefined) cp.text = tp.text;
        if (tp.fill !== undefined) cp.color = tp.fill;
        if (tp.fontFamily !== undefined) cp.fontFamily = tp.fontFamily;
        if (tp.fontSize !== undefined) cp.fontSize = tp.fontSize;
        if (tp.fontStyle !== undefined) cp.fontStyle = tp.fontStyle;
        if (tp.letterSpacing !== undefined) cp.letterSpacing = tp.letterSpacing;
        updateSlide({ corners: { ...corners, [selectedCornerId]: { ...corners[selectedCornerId], ...cp } } });
    }

    function handleCornerElDelete() {
        if (!selectedCornerId || !slide.corners) return;
        updateSlide({
            corners: { ...slide.corners, [selectedCornerId]: { ...slide.corners[selectedCornerId], text: '', enabled: false } },
        });
        setSelectedCornerId(null);
    }

    function selectCorner(key: CornerKey) {
        setSelectedCornerId(key);
        setSelectedId(null);
    }

    // ─── Derived ──────────────────────────────────────────────────────────────

    const selectedEl = selectedCornerId && slide.corners
        ? makeCornerTextEl(selectedCornerId, slide.corners)
        : (slide.elements.find((el) => el.id === selectedId) ?? null);

    function cloneCorners(corners: Slide['corners']): Slide['corners'] {
        if (!corners) return undefined;
        return {
            ...corners,
            topLeft: { ...corners.topLeft },
            topRight: { ...corners.topRight },
            bottomLeft: { ...corners.bottomLeft },
            bottomRight: { ...corners.bottomRight },
        };
    }

    function applyCornersToAll(corners: NonNullable<Slide['corners']>) {
        setSlides((prev) => prev.map((slideItem) => ({
            ...slideItem,
            corners: cloneCorners(corners),
        })));
    }

    function applyBadgeToAll(badge: ProfileBadge) {
        setSlides((prev) => prev.map((slideItem) => ({
            ...slideItem,
            profileBadge: { ...badge },
        })));
    }

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
                    templateStatus={templateStatus}
                    onSaveAsTemplate={() => saveAsTemplate()}
                    format={format}
                    onFormatChange={setFormat}
                    onExportPNG={exportPNG}
                    onExportAllZip={exportAllSlidesZip}
                    onExportMetadata={exportMetadata}
                    exportingZip={exportingZip}
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
                            slideIdx={safeIdx}
                            onBackgroundChange={(color) => updateSlide({ background: color })}
                            onAddText={addDefaultTextElement}
                            onSelectElement={(id) => { setTool('select'); setSelectedId(id); setSelectedCornerId(null); }}
                            onDeleteElement={(id) => deleteElement(id)}
                            onCornersChange={(c) => updateSlide({ corners: c })}
                            onApplyCornersToAll={applyCornersToAll}
                            caption={caption}
                            onCaptionChange={setCaption}
                            selectedCornerId={selectedCornerId}
                            onCornerSelect={selectCorner}
                            defaultHandle={instagramAccounts?.[0]?.handle ?? null}
                            onProfileBadgeChange={(badge: ProfileBadge) => updateSlide({ profileBadge: badge })}
                            onApplyBadgeToAll={applyBadgeToAll}
                            onLayoutApply={handleLayoutApply}
                        />
                    </div>

                    {/* Center: Canvas — every slide in a row, all editable */}
                    <CanvasArea
                        slides={slides}
                        currentIdx={safeIdx}
                        slideH={slideH}
                        scale={scale}
                        containerRef={containerRef}
                        stageRef={stageRef}
                        trRef={trRef}
                        tool={tool}
                        onToolChange={setTool}
                        selectedId={selectedId}
                        onSelectElement={(idx, id) => { setCurrentIdx(idx); setSelectedId(id); setSelectedCornerId(null); }}
                        editingId={editingId}
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
                        onBadgeMove={(idx, x, y) => {
                            setSlides((prev) => prev.map((s, i) => (
                                i === idx && s.profileBadge ? { ...s, profileBadge: { ...s.profileBadge, x, y } } : s
                            )));
                        }}
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
                            onElementChange={(patch) => {
                                if (selectedCornerId) { handleCornerElChange(patch); }
                                else if (selectedId) { updateElement(selectedId, patch); }
                            }}
                            onElementDelete={() => {
                                if (selectedCornerId) { handleCornerElDelete(); }
                                else if (selectedId) { deleteElement(selectedId); }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* ── AI Generation status bar ─────────────────────────────────── */}
            <AnimatePresence>
                {aiModalOpen && (aiStatus === 'generating' || aiStatus === 'imaging') && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-80 bg-gray-900/95 border border-white/10 rounded-xl px-4 py-3 shadow-xl backdrop-blur-sm flex flex-col gap-2"
                    >
                        <div className="flex items-center gap-2.5">
                            <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin shrink-0" />
                            <span className="text-sm font-medium text-gray-200 truncate flex-1">
                                {aiStatus === 'generating'
                                    ? 'Generating carousel...'
                                    : `Slide ${aiProgress.length} of ${aiSlideCount} — generating images`}
                            </span>
                            {aiStatus === 'imaging' && (
                                <span className="text-xs font-medium text-gray-500 shrink-0">
                                    {Math.round((aiProgress.length / aiSlideCount) * 100)}%
                                </span>
                            )}
                        </div>
                        {aiStatus === 'imaging' && (
                            <>
                                <div className="h-px bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-violet-500 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.round((aiProgress.length / aiSlideCount) * 100)}%` }}
                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                    />
                                </div>
                                <p className="text-xs font-medium text-gray-600">Images appear in the canvas as they're ready</p>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── AI Modal (idle / error) ──────────────────────────────────── */}
            <AnimatePresence>
            {aiModalOpen && (aiStatus === 'idle' || aiStatus === 'error') && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.93, y: 24 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.93, y: 24 }}
                        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-indigo-50">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-violet-600" />
                                <h2 className="text-base font-medium text-gray-800">{t('slideEditor.ai.modalTitle')}</h2>
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
                                            <p className="text-[10px] font-medium text-gray-700 leading-tight">{tpl.name}</p>
                                            {tpl.description && (
                                                <p className="text-[9px] font-medium text-gray-400 mt-0.5 leading-tight line-clamp-2">{tpl.description}</p>
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
                                    <span className="text-sm font-medium text-violet-700 w-6 text-center">{aiSlideCount}</span>
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
                            <motion.button
                                onClick={() => generateCarousel()}
                                disabled={!aiTopic.trim()}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-medium hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                                <Sparkles className="w-4 h-4" /> {t('slideEditor.ai.generateBtn')}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
            </AnimatePresence>
        </>
    );
}
