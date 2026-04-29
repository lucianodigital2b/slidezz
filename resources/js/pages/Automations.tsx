import { Head } from '@inertiajs/react';
import { Zap, Plus } from 'lucide-react';

export default function Automations() {
    return (
        <>
            <Head title="Automações" />

            <div className="px-6 py-6">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900 mb-1">Automações</h1>
                        <p className="text-sm text-gray-500">Crie fluxos automáticos para publicar conteúdo sem esforço</p>
                    </div>
                    <button className="flex items-center gap-2 bg-[#E8440A] hover:bg-[#D13D09] text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                        <Plus className="w-4 h-4" />
                        Nova Automação
                    </button>
                </div>

                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-400">Nenhuma automação criada ainda. Crie sua primeira automação para começar.</p>
                </div>
            </div>
        </>
    );
}
