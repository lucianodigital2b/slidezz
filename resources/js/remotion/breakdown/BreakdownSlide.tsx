import { Fragment, useMemo } from 'react';
import {
    AbsoluteFill,
    OffthreadVideo,
    spring,
    interpolate,
    useCurrentFrame,
    useVideoConfig,
} from 'remotion';
import { Backdrop } from './Backdrop';
import { MONO, SANS, useBreakdownFonts } from './fonts';
import type { BreakdownSlideProps } from './types';

type Word = BreakdownSlideProps['stage']['words'][number];
type PaginatedWord = { word: Word; originalIndex: number };

function formatTime(seconds: number): string {
    const safe = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safe / 60);
    const secs = safe % 60;

    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/** About 3 lines of 29px mono text; a note label takes a line of its own, so it costs a line's worth. */
const PAGE_CHARS = 160;
const NOTE_LINE_CHARS = 40;

function paginateWords(words: Word[], noteEnds: Set<number>): PaginatedWord[][] {
    const pages: PaginatedWord[][] = [];
    let current: PaginatedWord[] = [];
    let charCount = 0;

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const wordChars = word.text.length + 1 + (noteEnds.has(i) ? NOTE_LINE_CHARS : 0);

        if (current.length > 0 && charCount + wordChars > PAGE_CHARS) {
            pages.push(current);
            current = [];
            charCount = 0;
        }

        current.push({ word, originalIndex: i });
        charCount += wordChars;

        if (/[.?!]$/.test(word.text) && charCount >= 80) {
            pages.push(current);
            current = [];
            charCount = 0;
        }
    }

    if (current.length > 0) {
        pages.push(current);
    }

    return pages;
}

export function BreakdownSlide(props: BreakdownSlideProps) {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();
    const { accent, videoSrc, viewsLabel, sourceDuration, stage } = props;

    useBreakdownFonts(props.fontBaseUrl);

    const sourceTime = Math.min(stage.start + frame / fps, sourceDuration);

    const titleLength = stage.title.length;
    const titleFontSize =
        titleLength > 14 ? Math.max(64, (100 * 14) / titleLength) : 100;
    const titleWords = stage.title.split(' ');

    const titleSpring = spring({
        fps,
        frame,
        config: { damping: 200 },
        durationInFrames: 10,
    });
    const titleOpacity = titleSpring;
    const titleTranslate = interpolate(titleSpring, [0, 1], [24, 0]);

    const cardSpring = spring({
        fps,
        frame: Math.max(0, frame - 2),
        config: { damping: 200 },
        durationInFrames: 12,
    });
    const cardScale = interpolate(cardSpring, [0, 1], [0.94, 1]);
    const cardOpacity = cardSpring;

    const panelSpring = spring({
        fps,
        frame: Math.max(0, frame - 4),
        config: { damping: 200 },
        durationInFrames: 12,
    });
    const panelOpacity = panelSpring;
    const panelTranslate = interpolate(panelSpring, [0, 1], [20, 0]);

    const noteStartFrame = Math.round(0.2 * durationInFrames);
    const noteSpring = spring({
        fps,
        frame: Math.max(0, frame - noteStartFrame),
        config: { damping: 200 },
        durationInFrames: 10,
    });
    const noteOpacity = noteSpring;
    const noteTranslate =
        noteSpring === 0
            ? 0
            : interpolate(
                  noteSpring,
                  [0, 1],
                  stage.videoNoteSide === 'right' ? [24, 0] : [-24, 0],
              );

    const pages = useMemo(
        () => paginateWords(stage.words, new Set(stage.notes.map((note) => note.toWord))),
        [stage.words, stage.notes],
    );
    const currentPageIndex = useMemo(() => {
        if (pages.length === 0) {
            return 0;
        }

        let idx = 0;

        for (let i = pages.length - 1; i >= 0; i--) {
            if (pages[i][0].word.start <= sourceTime) {
                idx = i;
                break;
            }
        }

        return idx;
    }, [pages, sourceTime]);
    const currentPage = pages[currentPageIndex] ?? [];

    const progressPercent =
        sourceDuration > 0 ? (sourceTime / sourceDuration) * 100 : 0;

    return (
        <AbsoluteFill style={{ backgroundColor: '#060807' }}>
            <Backdrop accent={accent} />

            {/* title */}
            <div
                style={{
                    position: 'absolute',
                    top: 64,
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                    fontFamily: SANS,
                    fontWeight: 800,
                    fontSize: titleFontSize,
                    textTransform: 'uppercase',
                    letterSpacing: '-0.02em',
                    color: '#fff',
                    opacity: titleOpacity,
                    transform: `translateY(${titleTranslate}px)`,
                }}
            >
                {titleWords.map((word, index) => {
                    const isLast = index === titleWords.length - 1;

                    return (
                        <span
                            key={index}
                            style={{
                                color: isLast ? accent : '#fff',
                                textShadow: isLast
                                    ? `0 0 36px ${accent}55`
                                    : undefined,
                            }}
                        >
                            {word}
                            {index < titleWords.length - 1 ? ' ' : ''}
                        </span>
                    );
                })}
            </div>

            {/* video card */}
            <div
                style={{
                    position: 'absolute',
                    left: 320,
                    top: 196,
                    width: 440,
                    height: 782,
                    borderRadius: 36,
                    overflow: 'hidden',
                    border: '2px solid rgba(255, 255, 255, 0.14)',
                    boxShadow: `0 30px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px ${accent}22`,
                    transform: `scale(${cardScale})`,
                    opacity: cardOpacity,
                }}
            >
                <OffthreadVideo
                    src={videoSrc}
                    trimBefore={Math.round(stage.start * fps) || undefined}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                    }}
                />
                {/* top gradient */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 120,
                        background:
                            'linear-gradient(to bottom, rgba(0,0,0,0.35), transparent)',
                        pointerEvents: 'none',
                    }}
                />
                {/* views pill */}
                <div
                    style={{
                        position: 'absolute',
                        top: 14,
                        left: 14,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'rgba(0, 0, 0, 0.35)',
                        padding: '6px 14px',
                        borderRadius: 999,
                    }}
                >
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                        <path
                            d="M12 5C7 5 3 8.5 1 12c2 3.5 6 7 11 7s9-3.5 11-7c-2-3.5-6-7-11-7z"
                            stroke="#fff"
                            strokeWidth={2}
                            fill="none"
                        />
                        <circle cx={12} cy={12} r={3} fill="#fff" />
                    </svg>
                    <span
                        style={{
                            fontFamily: SANS,
                            fontWeight: 700,
                            fontSize: 26,
                            color: '#fff',
                            textShadow: '0 2px 8px rgba(0, 0, 0, 0.7)',
                        }}
                    >
                        {viewsLabel}
                    </span>
                </div>
            </div>

            {/* video note */}
            {stage.videoNote.trim() && (
                <>
                    {/* connector line */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 196 + 330 - 1,
                            left: stage.videoNoteSide === 'right' ? 760 : 280,
                            width: 40,
                            height: 2,
                            background: accent,
                            opacity: noteOpacity,
                        }}
                    />
                    {/* dot on card border */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 196 + 330 - 6,
                            left:
                                stage.videoNoteSide === 'right'
                                    ? 760 - 6
                                    : 320 - 6,
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            background: accent,
                            boxShadow: `0 0 12px ${accent}88`,
                            opacity: noteOpacity,
                        }}
                    />
                    {/* note text box */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 196 + 330,
                            left: stage.videoNoteSide === 'right' ? 800 : 30,
                            width: 250,
                            transform: `translateY(-50%) translateX(${noteTranslate}px)`,
                            fontFamily: SANS,
                            fontWeight: 700,
                            fontSize: 30,
                            lineHeight: 1.15,
                            color: accent,
                            textAlign:
                                stage.videoNoteSide === 'right'
                                    ? 'left'
                                    : 'right',
                            opacity: noteOpacity,
                        }}
                    >
                        {stage.videoNote}
                    </div>
                </>
            )}

            {/* transcript panel */}
            <div
                style={{
                    position: 'absolute',
                    left: 56,
                    right: 56,
                    top: 1004,
                    height: 300,
                    borderRadius: 28,
                    background: 'rgba(255, 255, 255, 0.045)',
                    border: '1px solid rgba(255, 255, 255, 0.10)',
                    backdropFilter: 'blur(8px)',
                    padding: '26px 34px',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                    opacity: panelOpacity,
                    transform: `translateY(${panelTranslate}px)`,
                }}
            >
                {/* header row */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 20,
                        height: 30,
                    }}
                >
                    <span
                        style={{
                            fontFamily: MONO,
                            fontWeight: 600,
                            fontSize: 20,
                            letterSpacing: '0.22em',
                            textTransform: 'uppercase',
                            color: accent,
                        }}
                    >
                        {stage.label}
                    </span>
                    {/* progress track */}
                    <div
                        style={{
                            flex: 1,
                            height: 4,
                            borderRadius: 2,
                            background: 'rgba(255, 255, 255, 0.14)',
                            position: 'relative',
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: `${progressPercent}%`,
                                background: accent,
                                borderRadius: 2,
                            }}
                        />
                        <div
                            style={{
                                position: 'absolute',
                                left: `${progressPercent}%`,
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                background: '#fff',
                                boxShadow: `0 0 12px ${accent}88`,
                            }}
                        />
                    </div>
                    {/* clock */}
                    <span
                        style={{
                            fontFamily: MONO,
                            fontWeight: 400,
                            fontSize: 20,
                            color: 'rgba(255, 255, 255, 0.55)',
                        }}
                    >
                        {formatTime(sourceTime)} / {formatTime(sourceDuration)}
                    </span>
                </div>

                {/* body */}
                <div
                    style={{
                        marginTop: 22,
                        fontFamily: MONO,
                        fontWeight: 500,
                        fontSize: 29,
                        lineHeight: 1.62,
                    }}
                >
                    {currentPage.map(({ word, originalIndex }) => {
                        const isSpoken = sourceTime >= word.start;
                        const isCurrent =
                            sourceTime >= word.start && sourceTime < word.end;
                        const color = isSpoken
                            ? '#FFFFFF'
                            : 'rgba(255,255,255,0.32)';
                        const textShadow = isCurrent
                            ? `0 0 18px ${accent}88`
                            : undefined;

                        const underlineNotes = stage.notes.filter(
                            (note) =>
                                note.fromWord <= originalIndex &&
                                note.toWord >= originalIndex &&
                                sourceTime >= stage.words[note.fromWord].start,
                        );
                        const hasUnderline = underlineNotes.length > 0;
                        const underlineProgress = hasUnderline
                            ? interpolate(
                                  sourceTime,
                                  [word.start, word.start + 6 / fps],
                                  [0, 1],
                                  {
                                      extrapolateLeft: 'clamp',
                                      extrapolateRight: 'clamp',
                                  },
                              )
                            : 0;

                        const noteLabel = stage.notes.find(
                            (note) => note.toWord === originalIndex,
                        );
                        const noteOpacity = noteLabel
                            ? Math.min(
                                  1,
                                  interpolate(
                                      sourceTime,
                                      [
                                          stage.words[noteLabel.toWord].start,
                                          stage.words[noteLabel.toWord].start +
                                              8 / fps,
                                      ],
                                      [0, 1],
                                      {
                                          extrapolateLeft: 'clamp',
                                          extrapolateRight: 'clamp',
                                      },
                                  ),
                              )
                            : 0;

                        return (
                            <Fragment key={originalIndex}>
                                <span
                                    style={{
                                        position: 'relative',
                                        display: 'inline-block',
                                        color,
                                        textShadow,
                                    }}
                                >
                                    {word.text}
                                    {hasUnderline && (
                                        <span
                                            style={{
                                                position: 'absolute',
                                                bottom: -4,
                                                left: 0,
                                                width: '100%',
                                                height: 3,
                                                background: accent,
                                                transform: `scaleX(${underlineProgress})`,
                                                transformOrigin: 'left',
                                            }}
                                        />
                                    )}
                                </span>{' '}
                                {noteLabel && (
                                    <span
                                        style={{
                                            display: 'block',
                                            margin: '2px 0 6px',
                                            fontFamily: SANS,
                                            fontWeight: 600,
                                            fontSize: 23,
                                            lineHeight: 1.2,
                                            color: accent,
                                            letterSpacing: 0,
                                            opacity: noteOpacity,
                                        }}
                                    >
                                        ↑ {noteLabel.text}
                                    </span>
                                )}
                            </Fragment>
                        );
                    })}
                </div>
            </div>
        </AbsoluteFill>
    );
}
