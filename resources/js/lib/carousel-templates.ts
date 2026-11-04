/** Carousel templates offered by the AI wizard (labels live in createCarousel.templates.<id>). */
export const TEMPLATE_IDS = [
    'editorial-press',
    'noir-manifesto',
    'dark-cards',
    'pop-magazine',
    'twitter-x',
    'acid-brutalist',
    'documentary',
    'ticket',
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

/** Template pre-selected when the workspace has no saved choice. */
export const DEFAULT_TEMPLATE_ID: TemplateId = 'editorial-press';

export function isTemplateId(value: unknown): value is TemplateId {
    return typeof value === 'string' && (TEMPLATE_IDS as readonly string[]).includes(value);
}
