import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Slide, SlideEl, Format } from './types';
import { SlideThumbnail } from './SlideThumbnail';
import { PropertiesPanel } from './PropertiesPanel';

interface SlideRightPanelProps {
    slides: Slide[];
    currentIdx: number;
    format: Format;
    selectedEl: SlideEl | null;
    onSelectSlide: (idx: number) => void;
    onAddSlide: () => void;
    onDuplicateSlide: (idx: number) => void;
    onDeleteSlide: (idx: number) => void;
    onElementChange: (patch: Partial<SlideEl>) => void;
    onElementDelete: () => void;
}

export function SlideRightPanel({
    slides, currentIdx, format, selectedEl,
    onSelectSlide, onAddSlide, onDuplicateSlide, onDeleteSlide,
    onElementChange, onElementDelete,
}: SlideRightPanelProps) {
    return (
        <div className="flex flex-col h-full overflow-hidden bg-gray-50">

            {/* Thumbnail filmstrip */}
            <div className="shrink-0 p-2.5 border-b border-gray-100">
                <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
                    {slides.map((s, idx) => (
                        <div
                            key={s.id}
                            onClick={() => onSelectSlide(idx)}
                            className={`relative group cursor-pointer rounded-lg overflow-hidden shrink-0 transition-all border-2 ${idx === currentIdx ? 'border-[#FFE156]' : 'border-transparent ring-1 ring-black/10'}`}
                            style={{
                                width: 52,
                                height: format === 'stories' ? 76 : 60,
                            }}
                        >
                            <SlideThumbnail slide={s} format={format} />
                            <span className="absolute top-0.5 left-0.5 text-[8px] font-bold text-white rounded px-0.5 leading-4 bg-black/50">
                                {idx + 1}
                            </span>
                            <div className="absolute top-0.5 right-0.5 hidden group-hover:flex gap-0.5">
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDuplicateSlide(idx); }}
                                    className="p-0.5 rounded text-white bg-black/60"
                                >
                                    <Plus className="w-2 h-2" />
                                </button>
                                {slides.length > 1 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDeleteSlide(idx); }}
                                        className="p-0.5 rounded text-white bg-black/60 hover:bg-red-500 transition-colors"
                                    >
                                        <X className="w-2 h-2" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Add slide */}
                    <button
                        onClick={onAddSlide}
                        className="shrink-0 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
                        style={{
                            width: 52,
                            height: format === 'stories' ? 76 : 60,
                        }}
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Editing Layer */}
            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
                {selectedEl ? (
                    <div className="p-2.5">
                        <div className="overflow-hidden bg-white" style={{ borderRadius: '1.35rem' }}>
                            <div className="px-3 py-2.5 border-b border-gray-100">
                                <p className="text-sm font-semibold text-gray-900">Editing Layer</p>
                            </div>
                            <PropertiesPanel
                                el={selectedEl}
                                onChange={onElementChange}
                                onDelete={onElementDelete}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-28 px-4">
                        <p className="text-xs text-center text-gray-300">
                            Select an element to edit its properties
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
