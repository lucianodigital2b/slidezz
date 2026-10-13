/**
 * The video timeline contract shared by the editor, the in-browser Player and the
 * server-side render (resources/js/remotion/render.mjs). Mirrored by the validation
 * rules in VideoProjectController, so keep both in sync.
 *
 * Times are stored in seconds (editor-friendly, fps-independent) and converted to
 * frames only inside the composition.
 */

export const VIDEO_FPS = 30;

/** How long a transition overlaps the two clips around it. */
export const TRANSITION_SECONDS = 0.5;

export const MIN_CLIP_SECONDS = 0.5;

export const MAX_CLIP_SECONDS = 60;

export const VIDEO_FORMATS = {
    stories: { w: 1080, h: 1920, ratio: '9:16' },
    post: { w: 1080, h: 1350, ratio: '4:5' },
} as const;

export type VideoFormat = keyof typeof VIDEO_FORMATS;

export const CLIP_TRANSITIONS = ['none', 'fade', 'slide', 'wipe'] as const;

export type ClipTransition = (typeof CLIP_TRANSITIONS)[number];

export type TextPosition = 'top' | 'center' | 'bottom';

export interface VideoClip {
    id: string;
    type: 'image' | 'video';
    src: string;
    /** Seconds the clip stays on screen. */
    duration: number;
    /** Seconds skipped at the start of a video clip. Ignored for images. */
    trimStart: number;
    /** Transition used when this clip enters. Ignored on the first clip. */
    transition: ClipTransition;
    text: string;
    textPosition: TextPosition;
    /** Slow Ken Burns push-in. Images only. */
    zoom: boolean;
    /** Drops the clip's own sound. Videos only. */
    muted: boolean;
}

export interface AudioTrack {
    src: string;
    /** 0–1. */
    volume: number;
}

export interface VideoTimeline {
    clips: VideoClip[];
    audio: AudioTrack | null;
}

export interface VideoCompositionProps {
    format: VideoFormat;
    timeline: VideoTimeline;
    [key: string]: unknown;
}

export function secondsToFrames(seconds: number): number {
    return Math.max(1, Math.round(seconds * VIDEO_FPS));
}

export function clipFrames(clip: VideoClip): number {
    return secondsToFrames(clip.duration);
}

/**
 * Frames the transition into `clips[index]` overlaps. Clamped below both clips'
 * lengths, which TransitionSeries requires.
 */
export function transitionFramesAt(clips: VideoClip[], index: number): number {
    if (index === 0 || clips[index].transition === 'none') {
        return 0;
    }

    const shortest = Math.min(clipFrames(clips[index - 1]), clipFrames(clips[index]));

    return Math.max(0, Math.min(secondsToFrames(TRANSITION_SECONDS), shortest - 1));
}

/** Transitions overlap neighbours, so every one of them shortens the whole video. */
export function timelineFrames(timeline: VideoTimeline): number {
    const total = timeline.clips.reduce(
        (frames, clip, index) => frames + clipFrames(clip) - transitionFramesAt(timeline.clips, index),
        0,
    );

    return Math.max(1, total);
}

export function makeClip(type: VideoClip['type'], src: string, overrides: Partial<VideoClip> = {}): VideoClip {
    return {
        id: crypto.randomUUID(),
        type,
        src,
        duration: type === 'image' ? 3 : 5,
        trimStart: 0,
        transition: 'fade',
        text: '',
        textPosition: 'center',
        zoom: type === 'image',
        muted: false,
        ...overrides,
    };
}
