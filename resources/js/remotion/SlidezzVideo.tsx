import { linearTiming, TransitionSeries } from '@remotion/transitions';
import type { TransitionPresentation } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { wipe } from '@remotion/transitions/wipe';
import { Fragment } from 'react';
import { AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, useCurrentFrame, useVideoConfig } from 'remotion';
import { clipFrames, transitionFramesAt, VIDEO_FPS } from './timeline';
import type { ClipTransition, TextPosition, VideoClip, VideoCompositionProps } from './timeline';

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

function ClipView({ clip }: { clip: VideoClip }) {
    const frame = useCurrentFrame();
    const cover = { width: '100%', height: '100%', objectFit: 'cover' as const };
    const scale = clip.type === 'image' && clip.zoom
        ? interpolate(frame, [0, clipFrames(clip)], [1, 1.12], { extrapolateRight: 'clamp' })
        : 1;

    return (
        <AbsoluteFill style={{ backgroundColor: '#000', overflow: 'hidden' }}>
            {clip.type === 'image' ? (
                <Img src={clip.src} style={{ ...cover, transform: `scale(${scale})` }} />
            ) : (
                <OffthreadVideo
                    src={clip.src}
                    muted={clip.muted}
                    trimBefore={Math.round(clip.trimStart * VIDEO_FPS) || undefined}
                    style={cover}
                />
            )}
            {clip.text.trim() !== '' && <ClipText text={clip.text} position={clip.textPosition} />}
        </AbsoluteFill>
    );
}

export function SlidezzVideo({ timeline }: VideoCompositionProps) {
    const { clips, audio } = timeline;

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
        </AbsoluteFill>
    );
}
