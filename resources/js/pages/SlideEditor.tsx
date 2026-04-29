import { Head } from '@inertiajs/react';
import { Layers, Plus } from 'lucide-react';

export default function SlideEditor() {
    return (
        <>
            <Head title="Editor de Slideshow" />

            <div className="px-6 py-6">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 mb-1">Editor de Slideshow</h1>
                        <p className="text-sm text-gray-500">Crie e edite slideshows para suas redes sociais</p>
                    </div>
                    <button className="flex items-center gap-2 bg-[#E8440A] hover:bg-[#D13D09] text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                        <Plus className="w-4 h-4" />
                        Novo Slideshow
                    </button>
                </div>

                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-400">Nenhum slideshow criado ainda. Crie seu primeiro slideshow para começar.</p>
                </div>
            </div>
        </>
    );
}
