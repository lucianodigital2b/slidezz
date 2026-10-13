/**
 * The caption styles TikTok's own text editor offers.
 *
 * Mirrors `App\Enums\SlideTextPreset` — the `value`s are what the API accepts, and
 * `preview` describes each style so the picker can show it rather than name it.
 */
export const TEXT_PRESETS = [
    { value: 'classic', label: 'Classic', preview: 'font-black tracking-tight' },
    { value: 'typewriter', label: 'Typewriter', preview: 'font-mono font-bold tracking-tight' },
    { value: 'handwriting', label: 'Handwriting', preview: 'font-semibold italic' },
    { value: 'serif', label: 'Serif', preview: 'font-serif font-bold' },
    { value: 'neon', label: 'Neon', preview: 'font-medium tracking-wide text-[#00F2EA]' },
] as const;

export type TextPreset = (typeof TEXT_PRESETS)[number]['value'];
