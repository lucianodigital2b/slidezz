import { ArrowRight, ChevronLeft, ChevronRight, KeyRound, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SlideThumbnail } from '@/components/SlideEditor/SlideThumbnail';
import { FORMATS, Slide } from '@/components/SlideEditor/types';
import { fitTextFontSize } from '@/components/SlideEditor/utils';
import { SLIDE_TEMPLATES, resolveTemplateForBrand } from '@/components/SlideEditor/templates';
import { generateLayoutSequenceFromContent, slotToBox, TitleFitter } from '@/components/SlideEditor/layouts';
import { BuildContext, SlideData, buildSlideFromData } from '@/components/SlideEditor/slideBuilders';
import { loadGoogleFont } from '@/utils/google-fonts';

const ACCENT = '#FFE156';
const ACCENT_DARK = '#E6CB4D';
const BORDER = '#E8E7E2';

interface Deck {
    title: string;
    slides: Slide[];
}

interface Props {
    brandName: string;
    brand: { color: string; accent: string };
    /** Whether a Gemini key is connected — drives whether we generate photos. */
    hasKey: boolean;
    language: string;
    onContinue: () => void;
}

const csrfToken = () => (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

function postJson(url: string, body: Record<string, unknown>): Promise<Response> {
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken(), Accept: 'application/json' },
        body: JSON.stringify(body),
    });
}

/** Slugify a brand name into an @handle used by the editorial header/badge. */
function slugHandle(name: string): string {
    return name
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '')
        .slice(0, 30);
}

// ─── Single carousel (one slide at a time, prev/next + dots) ──────────────────

function CarouselPreview({ deck }: { deck: Deck }) {
    const [idx, setIdx] = useState(0);
    const total = deck.slides.length;
    const go = (delta: number) => setIdx((i) => (i + delta + total) % total);

    return (
        <div className="space-y-3">
            <div className="relative overflow-hidden rounded-[20px] border shadow-sm" style={{ borderColor: BORDER }}>
                <SlideThumbnail slide={deck.slides[idx]} format="post" />

                {total > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={() => go(-1)}
                            className="absolute top-1/2 left-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#1A1A1A] shadow backdrop-blur transition-colors hover:bg-white"
                            aria-label="prev"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => go(1)}
                            className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#1A1A1A] shadow backdrop-blur transition-colors hover:bg-white"
                            aria-label="next"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </>
                )}
            </div>

            {total > 1 && (
                <div className="flex items-center justify-center gap-1.5">
                    {deck.slides.map((s, i) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => setIdx(i)}
                            className="h-2 rounded-full transition-all"
                            style={{ width: i === idx ? 20 : 8, background: i === idx ? ACCENT : BORDER }}
                            aria-label={`slide ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Skeleton while a deck is still generating ────────────────────────────────

function DeckSkeleton() {
    return (
        <div className="space-y-3">
            <div
                className="relative overflow-hidden rounded-[20px] border bg-white"
                style={{ borderColor: BORDER, aspectRatio: `${FORMATS.post.w} / ${FORMATS.post.h}` }}
            >
                <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-[#F3F1EC] to-[#E9E7E1]" />
                <div className="absolute inset-x-6 bottom-8 space-y-3">
                    <div className="h-6 w-3/4 animate-pulse rounded-full bg-[#DAD8D1]" />
                    <div className="h-6 w-1/2 animate-pulse rounded-full bg-[#DAD8D1]" />
                    <div className="h-3 w-5/6 animate-pulse rounded-full bg-[#E4E2DC]" />
                </div>
            </div>
            <div className="flex items-center justify-center gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="h-2 w-2 rounded-full bg-[#DAD8D1]" />
                ))}
            </div>
        </div>
    );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function OnboardingPreview({ brandName, brand, hasKey, language, onContinue }: Props) {
    const { t } = useTranslation();
    const [decks, setDecks] = useState<Deck[]>([]);
    const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
    const [missingKey, setMissingKey] = useState(false);
    const [selectedLang, setSelectedLang] = useState(language);
    const startedForLang = useRef<string | null>(null);

    useEffect(() => {
        // Re-run when the chosen language changes; guard React StrictMode's double-invoke
        // by keying on the language we last started generating for.
        if (startedForLang.current === selectedLang) return;
        startedForLang.current = selectedLang;

        let cancelled = false;
        const lang = selectedLang;
        const handle = slugHandle(brandName);

        setDecks([]);
        setMissingKey(false);
        setPhase('loading');

        async function buildDeck(topic: string, title: string): Promise<Deck | null> {
            const r = await postJson('/onboarding/preview/deck', { topic, lang });
            if (!r.ok) return null;
            const { ndjson } = (await r.json()) as { ndjson?: string };

            const parsed: SlideData[] = [];
            for (const line of (ndjson ?? '').split('\n')) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('{')) continue;
                try {
                    const s = JSON.parse(trimmed) as SlideData;
                    if (s.title) parsed.push(s);
                } catch {
                    /* skip malformed lines */
                }
            }
            if (parsed.length === 0) return null;

            const rawTemplate = SLIDE_TEMPLATES.find((tpl) => tpl.id === 'editorial-press');
            if (!rawTemplate) return null;
            const template = resolveTemplateForBrand(rawTemplate, brand.accent, brand.color);
            await Promise.all([...new Set(template.fonts)].map((f) => loadGoogleFont(f)));

            const slideH = FORMATS.post.h;
            const titleFont = template.font;
            const fitTitle: TitleFitter = (text, slot, slideIndex) => {
                const box = slotToBox(slot, slideH, slideIndex);
                const style = slot.fontStyleHint === 'normal' ? '' : slot.fontStyleHint === 'black' ? '900' : slot.fontStyleHint;
                return fitTextFontSize(text.toUpperCase(), titleFont, style, slot.maxFontSize, slot.lineHeight, slot.letterSpacing, box.width, box.height, 28);
            };

            const layoutSequence = generateLayoutSequenceFromContent(
                parsed.map((s) => ({ title: s.title, description: s.description, hasStat: Boolean(s.stat), hasImage: hasKey })),
                fitTitle,
            );

            let images: (string | null)[] = parsed.map(() => null);
            if (hasKey) {
                images = await Promise.all(
                    parsed.map(async (s) => {
                        if (!s.imagePrompt) return null;
                        try {
                            const ir = await postJson('/onboarding/preview/image', { prompt: s.imagePrompt, aspect_ratio: '4:5' });
                            if (ir.status === 402) {
                                if (!cancelled) setMissingKey(true);
                                return null;
                            }
                            if (!ir.ok) return null;
                            const d = (await ir.json()) as { base64?: string };
                            return d.base64 ?? null;
                        } catch {
                            return null;
                        }
                    }),
                );
            }

            const ctx: BuildContext = {
                format: 'post',
                badgeIdentity: { handle, photoUrl: '' },
                brand: { color: brand.color, accent: brand.accent, logoUrl: null },
            };

            const slides = parsed.map((s, i) =>
                buildSlideFromData(ctx, s, images[i], template, layoutSequence[i], i, parsed.length, 'mixed', topic, null),
            );

            return { title, slides };
        }

        (async () => {
            try {
                const tr = await postJson('/onboarding/preview/topics', { lang });
                const data = (await tr.json()) as { topics?: { topic: string; title: string }[]; error?: boolean };
                const topics = data.topics ?? [];
                if (cancelled) return;

                if (!tr.ok || data.error || topics.length === 0) {
                    setPhase('error');
                    return;
                }

                const results = await Promise.all(
                    topics.slice(0, 2).map(async (tp) => {
                        const deck = await buildDeck(tp.topic, tp.title);
                        if (deck && !cancelled) setDecks((prev) => [...prev, deck]);
                        return deck;
                    }),
                );

                if (cancelled) return;
                setPhase(results.some((d) => d !== null) ? 'ready' : 'error');
            } catch {
                if (!cancelled) setPhase('error');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [selectedLang, brandName, brand.accent, brand.color, hasKey]);

    const expectedDecks = 2;

    return (
        <div className="space-y-8">
            <div className="space-y-2 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-[#1A1A1A]" style={{ background: ACCENT, boxShadow: `0 0 0 10px ${ACCENT}14` }}>
                    <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="font-display text-4xl leading-none tracking-normal text-[#1A1A1A]">
                    {t('onboarding.preview.title', { brand: brandName })}
                </h2>
                <p className="text-lg font-medium text-[#666660]">
                    {phase === 'loading' ? t('onboarding.preview.loading') : t('onboarding.preview.subtitle')}
                </p>
            </div>

            <div className="flex items-center justify-center gap-2">
                <label htmlFor="preview-lang" className="text-xs font-semibold uppercase tracking-wide text-[#888880]">
                    {t('onboarding.preview.language')}
                </label>
                <select
                    id="preview-lang"
                    value={selectedLang}
                    onChange={(e) => setSelectedLang(e.target.value)}
                    disabled={phase === 'loading'}
                    className="rounded-lg border bg-white px-3 py-1.5 text-sm font-semibold text-[#1A1A1A] outline-none transition-colors focus:border-[#FFE156] disabled:opacity-50"
                    style={{ borderColor: BORDER }}
                >
                    <option value="Portuguese (Brazil)">Português (BR)</option>
                    <option value="English">English</option>
                </select>
            </div>

            {phase === 'error' && decks.length === 0 ? (
                <div className="flex flex-col items-center gap-4 rounded-2xl border bg-white px-6 py-12 text-center" style={{ borderColor: BORDER }}>
                    <p className="text-sm font-medium text-[#555550]">{t('onboarding.preview.error')}</p>
                    <button
                        type="button"
                        onClick={onContinue}
                        className="flex items-center gap-2 rounded-full px-7 py-3 text-base font-bold text-white transition-colors"
                        style={{ background: ACCENT }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = ACCENT_DARK)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = ACCENT)}
                    >
                        {t('onboarding.preview.viewPlans')} <ArrowRight className="h-4 w-4" />
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid gap-6 sm:grid-cols-2">
                        {decks.map((deck, i) => (
                            <div key={i} className="space-y-2">
                                <CarouselPreview deck={deck} />
                                <p className="line-clamp-2 px-1 text-center text-sm font-semibold text-[#666660]">{deck.title}</p>
                            </div>
                        ))}
                        {phase === 'loading' &&
                            Array.from({ length: Math.max(0, expectedDecks - decks.length) }).map((_, i) => (
                                <DeckSkeleton key={`sk-${i}`} />
                            ))}
                    </div>

                    {(missingKey || !hasKey) && (
                        <div className="flex items-start gap-3 rounded-2xl border bg-white px-5 py-4" style={{ borderColor: BORDER }}>
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: `${ACCENT}14` }}>
                                <KeyRound className="h-4 w-4" style={{ color: ACCENT }} />
                            </div>
                            <p className="text-sm font-medium text-[#666660]">{t('onboarding.preview.missingKey')}</p>
                        </div>
                    )}

                    <div className="flex flex-col items-center gap-3">
                        <button
                            type="button"
                            onClick={onContinue}
                            className="flex items-center gap-2 rounded-full px-8 py-3.5 text-lg font-bold text-white shadow-sm transition-colors"
                            style={{ background: ACCENT }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = ACCENT_DARK)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = ACCENT)}
                        >
                            {phase === 'loading' ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> {t('onboarding.preview.generating')}
                                </>
                            ) : (
                                <>
                                    {t('onboarding.preview.viewPlans')} <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
