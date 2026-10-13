import { Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ShapeDef } from './shapes';
import { FaIcon, POPULAR_FA_ICONS, faIconToShapeDef, loadFaSolidIcons } from './faIcons';

/** Max results rendered for a search so a broad query can't paint 2000 glyphs at once. */
const MAX_RESULTS = 60;

/**
 * Searchable Font Awesome (free solid) icon grid. Lives inside the editor's
 * elements popup; picking an icon inserts it as a recolorable path via `onPick`.
 */
export function IconLibrary({ onPick }: { onPick: (shape: ShapeDef) => void }) {
    const { t } = useTranslation();
    const [icons, setIcons] = useState<FaIcon[] | null>(null);
    const [query, setQuery] = useState('');

    useEffect(() => {
        let alive = true;
        loadFaSolidIcons().then((list) => {
            if (alive) {
                setIcons(list);
            }
        });
        return () => {
            alive = false;
        };
    }, []);

    const results = useMemo(() => {
        if (!icons) {
            return [];
        }
        const q = query.trim().toLowerCase();
        if (!q) {
            const byName = new Map(icons.map((i) => [i.name, i]));
            return POPULAR_FA_ICONS.map((name) => byName.get(name)).filter((i): i is FaIcon => Boolean(i));
        }
        return icons.filter((i) => i.terms.includes(q)).slice(0, MAX_RESULTS);
    }, [icons, query]);

    return (
        <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {t('slideEditor.shapes.icons')}
            </p>

            <div className="relative mb-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('slideEditor.shapes.searchIcons')}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-8 pr-2 text-xs text-gray-700 outline-none transition-colors focus:border-[#FFE156] focus:bg-white"
                />
            </div>

            {icons === null ? (
                <div className="flex items-center justify-center py-6 text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                </div>
            ) : results.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-400">{t('slideEditor.shapes.noIcons')}</p>
            ) : (
                <div className="grid grid-cols-5 gap-1.5">
                    {results.map((icon) => (
                        <button
                            key={icon.id}
                            onClick={() => onPick(faIconToShapeDef(icon))}
                            title={icon.name}
                            className="flex aspect-square items-center justify-center rounded-xl bg-gray-50 p-2.5 transition-colors hover:bg-gray-100"
                        >
                            <svg viewBox={`0 0 ${icon.dataW} ${icon.dataH}`} className="h-full w-full text-gray-700">
                                <path d={icon.data} fill="currentColor" />
                            </svg>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
