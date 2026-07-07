import type { ShapeDef } from './shapes';

/**
 * A single Font Awesome (free, solid) icon reduced to the data the editor needs:
 * its SVG path plus the natural viewBox size. Icons are inserted as `PathEl`s
 * (vector, recolorable) via the same code path as the built-in shapes.
 */
export interface FaIcon {
    id: string;
    name: string;
    /** Lowercased name + aliases, for substring search. */
    terms: string;
    data: string;
    dataW: number;
    dataH: number;
}

let cache: FaIcon[] | null = null;
let inflight: Promise<FaIcon[]> | null = null;

/**
 * Lazily load the Font Awesome free-solid icon set. The package is a data-only
 * dependency, dynamically imported so its ~1MB of path data lands in its own chunk
 * (loaded the first time the icon library opens, not in the initial bundle).
 */
export function loadFaSolidIcons(): Promise<FaIcon[]> {
    if (cache) {
        return Promise.resolve(cache);
    }
    if (inflight) {
        return inflight;
    }

    inflight = import('@fortawesome/free-solid-svg-icons').then((mod) => {
        const source = (mod as { fas?: Record<string, unknown> }).fas ?? (mod as Record<string, unknown>);
        const seen = new Set<string>();
        const icons: FaIcon[] = [];

        for (const key of Object.keys(source)) {
            const def = (source as Record<string, unknown>)[key] as
                | { iconName?: string; icon?: [number, number, string[], string, string | string[]] }
                | undefined;

            if (!def || typeof def !== 'object' || !def.iconName || !Array.isArray(def.icon)) {
                continue;
            }

            const [width, height, aliases, , path] = def.icon;
            // Solid icons carry a single path string; skip any that don't (e.g. duotone).
            if (typeof path !== 'string') {
                continue;
            }

            const name = def.iconName;
            if (seen.has(name)) {
                continue;
            }
            seen.add(name);

            const aliasText = Array.isArray(aliases) ? aliases.filter((a) => typeof a === 'string').join(' ') : '';

            icons.push({
                id: `fa-${name}`,
                name,
                terms: `${name} ${aliasText}`.toLowerCase(),
                data: path,
                dataW: width,
                dataH: height,
            });
        }

        icons.sort((a, b) => a.name.localeCompare(b.name));
        cache = icons;
        inflight = null;

        return icons;
    });

    return inflight;
}

/** Convert a Font Awesome icon into a `ShapeDef` so it inserts as a recolorable path. */
export function faIconToShapeDef(icon: FaIcon): ShapeDef {
    const targetH = 200;
    const initW = Math.max(1, Math.round(targetH * (icon.dataW / icon.dataH)));

    return {
        id: icon.id,
        data: icon.data,
        dataW: icon.dataW,
        dataH: icon.dataH,
        initW,
        initH: targetH,
        fill: '#4B5563',
        stroke: 'none',
        strokeWidth: 0,
        preview: 'fill',
    };
}

/**
 * A small, ordered set of broadly useful icons shown before the user searches, so
 * the library isn't an overwhelming wall of 2000 glyphs on open.
 */
export const POPULAR_FA_ICONS: string[] = [
    'heart', 'star', 'check', 'circle-check', 'xmark', 'circle-xmark',
    'arrow-right', 'arrow-left', 'arrow-up', 'arrow-down', 'arrow-right-long', 'chevron-right',
    'bolt', 'fire', 'crown', 'trophy', 'gift', 'bell',
    'envelope', 'phone', 'location-dot', 'calendar', 'clock', 'user',
    'users', 'thumbs-up', 'comment', 'share-nodes', 'magnifying-glass', 'lightbulb',
    'rocket', 'chart-line', 'chart-simple', 'dollar-sign', 'tag', 'cart-shopping',
    'lock', 'shield-halved', 'gear', 'play', 'quote-left', 'hashtag',
    'ban', 'triangle-exclamation', 'circle-info', 'graduation-cap', 'briefcase', 'handshake',
];
