import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Sprout } from 'lucide-react';

export default function Dashboard() {
    const [tab, setTab] = useState<'slideshows' | 'ugc'>('slideshows');

    return (
        <>
            <Head title="Início" />

            <div className="flex flex-col items-center justify-center pt-20 pb-10">
                <div className="w-[60px] h-[60px] bg-[#1A1A1A] rounded-2xl flex items-center justify-center mb-6 shadow-md">
                    <Sprout className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-[22px] font-bold text-gray-900 mb-5">O que você está criando hoje?</h1>
                <button
                    onClick={() => router.visit('/database')}
                    className="flex items-center gap-2 border border-gray-300 bg-white/60 hover:bg-white rounded-full px-4 py-2 text-sm text-gray-700 transition-colors shadow-sm"
                >
                    Banco de Dados de Slideshow
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            <div className="px-6">
                <div className="flex items-center justify-between border-b border-gray-200 pb-0">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => setTab('slideshows')}
                            className={`text-sm font-semibold pb-3 border-b-2 transition-colors -mb-px ${
                                tab === 'slideshows'
                                    ? 'border-gray-900 text-gray-900'
                                    : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            Slideshows (0)
                        </button>
                        <button
                            onClick={() => setTab('ugc')}
                            className={`text-sm font-semibold pb-3 border-b-2 transition-colors -mb-px ${
                                tab === 'ugc'
                                    ? 'border-gray-900 text-gray-900'
                                    : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                        >
                            Vídeos UGC (0)
                        </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 pb-3">
                        <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span>Página 1 de 1</span>
                        <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-center py-24">
                    <p className="text-sm text-gray-400">
                        Você ainda não tem vídeos. Crie seu primeiro vídeo para começar!
                    </p>
                </div>
            </div>
        </>
    );
}
