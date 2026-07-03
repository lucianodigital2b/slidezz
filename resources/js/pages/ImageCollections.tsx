import { Head } from '@inertiajs/react';
import { Images, Plus } from 'lucide-react';

export default function ImageCollections() {
    return (
        <>
            <Head title="Coleções de Imagens" />

            <div className="px-6 py-6">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 mb-1">Coleções de Imagens</h1>
                        <p className="text-sm text-gray-500">Organize suas imagens em coleções para usar nos seus slideshows</p>
                    </div>
                    <button className="flex items-center gap-2 bg-[#FFE156] hover:bg-[#E6CB4D] text-[#1A1A1A] rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                        <Plus className="w-4 h-4" />
                        Nova Coleção
                    </button>
                </div>

                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                        <Images className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-400">Nenhuma coleção criada ainda. Crie sua primeira coleção de imagens para começar.</p>
                </div>
            </div>
        </>
    );
}
