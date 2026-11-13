import { linearTiming, TransitionSeries } from '@remotion/transitions';
import type { TransitionPresentation } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { Fragment } from 'react';
import { AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, useCurrentFrame, useVideoConfig } from 'remotion';
import { clipFrames, transitionFramesAt, VIDEO_FPS } from './timeline';
import type { CaptionsTrack, ClipTransition, TextPosition, VideoClip, VideoCompositionProps } from './timeline';

/*
 * The one composition behind both the editor preview (@remotion/player) and the
 * server render (render.mjs). Imports stay relative — the render bundle is built
 * by Remotion's webpack, which doesn't know the Vite `@/` alias.
 */

const TEXT_JUSTIFY: Record<TextPosition, 'flex-start' | 'center' | 'flex-end'> = {
    top: 'flex-start',
    center: 'center',
    bottom: 'flex-end',
};

function presentationFor(transition: ClipTransition): TransitionPresentation<Record<string, unknown>> {
    const presentation = transition === 'slide' ? slide() : transition === 'wipe' ? wipe() : fade();

    return presentation as TransitionPresentation<Record<string, unknown>>;
}

function ClipText({ text, position }: { text: string; position: TextPosition }) {
    const { width } = useVideoConfig();

    return (
        <AbsoluteFill
            style={{
                justifyContent: TEXT_JUSTIFY[position],
                alignItems: 'center',
                // Keep copy inside TikTok/Reels' safe zone, clear of their UI.
                padding: `${width * 0.18}px ${width * 0.085}px`,
            }}
        >
            <div
                style={{
                    color: '#fff',
                    fontFamily: '"TikTok Sans", "Helvetica Neue", Arial, sans-serif',
                    fontWeight: 800,
                    fontSize: width * 0.068,
                    lineHeight: 1.2,
                    textAlign: 'center',
                    whiteSpace: 'pre-wrap',
                    textShadow: '0 0 12px rgba(0,0,0,0.55), 0 3px 6px rgba(0,0,0,0.6)',
                }}
            >
                {text}
            </div>
        </AbsoluteFill>
    );
}

function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

function ClipView({ clip }: { clip: VideoClip }) {
    const frame = useCurrentFrame();
    const cover = { width: '100%', height: '100%', objectFit: 'cover' as const };

    let scale = 1;

    if (clip.type === 'image' && clip.zoom) {
        scale = interpolate(frame, [0, clipFrames(clip)], [1, 1.12], {
            extrapolateRight: 'clamp',
            easing: (t) => t,
        });
    }

    if (clip.type === 'video' && clip.punchIn) {
        const total = clipFrames(clip);
        const zoomInFrames = 6;
        const zoomOutFrames = 6;

        if (frame < zoomInFrames) {
            scale = interpolate(frame, [0, zoomInFrames - 1], [1, 1.12], {
                extrapolateRight: 'clamp',
                easing: (t) => t,
            });
        } else if (frame >= total - zoomOutFrames) {
            const t = (frame - (total - zoomOutFrames)) / (zoomOutFrames - 1);
            scale = interpolate(easeOutCubic(t), [0, 1], [1.12, 1]);
        } else {
            scale = 1.12;
        }
    }

    return (
        <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
            {clip.type === 'image' ? (
                <Img src={clip.src} style={{ ...cover, transform: `scale(${scale})` }} />
            ) : (
                <OffthreadVideo
                    src={clip.src}
                    muted={clip.muted ?? false}
                    trimBefore={Math.round(clip.trimStart * VIDEO_FPS) || undefined}
                    style={{ ...cover, transform: `scale(${scale})` }}
                />
            )}
            {clip.text.trim() !== '' && <ClipText text={clip.text} position={clip.textPosition} />}
        </AbsoluteFill>
    );
}

function CaptionsOverlay({ captions }: { captions: CaptionsTrack }) {
    const frame = useCurrentFrame();
    const { fps, width } = useVideoConfig();

    if (!captions.enabled || captions.items.length === 0) {
        return null;
    }

    const time = frame / fps;
    const item = captions.items.find((caption) => time >= caption.start && time < caption.end);

    if (!item) {
        return null;
    }

    const wordElements = item.words.map((word, index) => {
        const isActive = time >= word.start && time < word.end;
        const isHighlight = word.highlight || isActive;
        const fontFamily = captions.style === 'bold'
            ? '"TikTok Sans", "Helvetica Neue", Arial, sans-serif'
            : '"Helvetica Neue", Arial, sans-serif';
        const fontWeight = captions.style === 'bold' ? 800 : 700;
        const textShadow = captions.style === 'bold'
            ? '0 0 12px rgba(0,0,0,0.8), 0 3px 6px rgba(0,0,0,0.8), 0 0 2px #000, 0 0 2px #000'
            : '0 2px 4px rgba(0,0,0,0.5)';
        const color = isHighlight ? '#FFE14D' : '#fff';
        const transform = isActive ? 'scale(1.08)' : 'none';

        return (
            <span
                key={`${word.text}-${index}`}
                style={{
                    display: 'inline-block',
                    color,
                    fontFamily,
                    fontWeight,
                    fontSize: width * 0.055,
                    lineHeight: 1.25,
                    textShadow,
                    textTransform: captions.style === 'bold' ? 'uppercase' : 'none',
                    marginRight: '0.3em',
                    transform,
                    transformOrigin: 'center bottom',
                }}
            >
                {word.text}
            </span>
        );
    });

    return (
        <AbsoluteFill
            style={{
                justifyContent: TEXT_JUSTIFY[captions.position],
                alignItems: 'center',
                padding: `${width * 0.18}px ${width * 0.085}px`,
                pointerEvents: 'none',
                zIndex: 10,
            }}
        >
            <div style={{ textAlign: 'center', maxWidth: '100%' }}>{wordElements}</div>
        </AbsoluteFill>
    );
}

export function SlidezzVideo({ timeline }: VideoCompositionProps) {
    const { clips, audio, captions } = timeline;

    return (
        <AbsoluteFill style={{ backgroundColor: '#000' }}>
            <TransitionSeries>
                {clips.map((clip, index) => {
                    const transitionFrames = transitionFramesAt(clips, index);

                    return (
                        <Fragment key={clip.id}>
                            {transitionFrames > 0 && (
                                <TransitionSeries.Transition
                                    presentation={presentationFor(clip.transition)}
                                    timing={linearTiming({ durationInFrames: transitionFrames })}
                                />
                            )}
                            <TransitionSeries.Sequence durationInFrames={clipFrames(clip)}>
                                <ClipView clip={clip} />
                            </TransitionSeries.Sequence>
                        </Fragment>
                    );
                })}
            </TransitionSeries>
            {audio && <Audio src={audio.src} volume={audio.volume} loop />}
            {captions && <CaptionsOverlay captions={captions} />}
        </AbsoluteFill>
    );
}
