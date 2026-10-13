import { Head } from '@inertiajs/react';
import { Play } from 'lucide-react';

export default function Library() {
    return (
        <>
            <Head title="Biblioteca" />

            <div className="px-6 py-6">
                <h1 className="text-xl font-semibold text-gray-900 mb-1">Biblioteca</h1>
                <p className="text-sm text-gray-500 mb-10">Gerencie todos os seus vídeos e conteúdos em um só lugar</p>

                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                        <Play className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-400">Sua biblioteca está vazia. Importe ou crie conteúdo para começar.</p>
                </div>
            </div>
        </>
    );
}
