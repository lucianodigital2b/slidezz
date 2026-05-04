import { Slide, SlideEl, ShapeEl, TextEl, PathEl, GradientEl } from '../types';
import { makeSlide, uid } from '../utils';

export function useSlideManager(
    slides: Slide[],
    setSlides: React.Dispatch<React.SetStateAction<Slide[]>>,
    currentIdx: number,
    setCurrentIdx: (idx: number) => void,
    setSelectedId: (id: string | null) => void,
    setTool: (tool: any) => void
) {
    const slide = slides[currentIdx] || makeSlide();

    function updateSlide(patch: Partial<Slide>) {
        setSlides((prev) => prev.map((s, i) => (i === currentIdx ? { ...s, ...patch } : s)));
    }

    function addSlide() {
        const next = makeSlide(slide.background);
        setSlides((prev) => [...prev.slice(0, currentIdx + 1), next, ...prev.slice(currentIdx + 1)]);
        setCurrentIdx(currentIdx + 1);
        setSelectedId(null);
    }

    function deleteSlide(idx: number) {
        if (slides.length === 1) return;
        setSlides((prev) => prev.filter((_, i) => i !== idx));
        setCurrentIdx(Math.min(idx, slides.length - 2));
        setSelectedId(null);
    }

    function duplicateSlide(idx: number) {
        const copy: Slide = { ...slides[idx], id: uid(), elements: slides[idx].elements.map((e) => ({ ...e, id: uid() } as unknown as SlideEl)) };
        setSlides((prev) => [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)]);
        setCurrentIdx(idx + 1);
    }

    function bringToFront(id: string) {
        updateSlide({ elements: (() => { const els = [...slide.elements]; const i = els.findIndex(e => e.id === id); if (i === -1) return els; const [el] = els.splice(i, 1); return [...els, el]; })() });
    }

    function bringForward(id: string) {
        updateSlide({ elements: (() => { const els = [...slide.elements]; const i = els.findIndex(e => e.id === id); if (i === -1 || i === els.length - 1) return els; [els[i], els[i + 1]] = [els[i + 1], els[i]]; return els; })() });
    }

    function sendBackward(id: string) {
        updateSlide({ elements: (() => { const els = [...slide.elements]; const i = els.findIndex(e => e.id === id); if (i <= 0) return els; [els[i], els[i - 1]] = [els[i - 1], els[i]]; return els; })() });
    }

    function sendToBack(id: string) {
        updateSlide({ elements: (() => { const els = [...slide.elements]; const i = els.findIndex(e => e.id === id); if (i === -1) return els; const [el] = els.splice(i, 1); return [el, ...els]; })() });
    }

    function addElement(el: SlideEl) {
        updateSlide({ elements: [...slide.elements, el] });
        setSelectedId(el.id);
        setTool('select');
    }

    function updateElement(id: string, patch: Partial<SlideEl>) {
        updateSlide({ elements: slide.elements.map((el) => (el.id === id ? ({ ...el, ...patch } as unknown as SlideEl) : el)) });
    }

    function deleteElement(id: string) {
        updateSlide({ elements: slide.elements.filter((el) => el.id !== id) });
        setSelectedId(null);
    }

    return {
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
    };
}
