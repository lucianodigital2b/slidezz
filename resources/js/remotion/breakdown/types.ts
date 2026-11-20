import { secondsToFrames } from '../timeline';

export interface BreakdownCoverProps {
    accent: string;
    fontBaseUrl: string;
    headline: Array<Array<{ text: string; accent: boolean }>>;
    avatarSrc: string | null;
    handle: string;
    followersLabel: string;
    niche: string;
    videoSrc: string;
    durationSeconds: number;
    [key: string]: unknown;
}

export interface BreakdownSlideProps {
    accent: string;
    fontBaseUrl: string;
    videoSrc: string;
    viewsLabel: string;
    sourceDuration: number;
    stage: {
        key: string;
        title: string;
        label: string;
        start: number;
        end: number;
        videoNote: string;
        videoNoteSide: 'left' | 'right';
        words: Array<{ text: string; start: number; end: number }>;
        notes: Array<{ fromWord: number; toWord: number; text: string }>;
    };
    [key: string]: unknown;
}

export const BREAKDOWN_SIZE = { w: 1080, h: 1350 };

export const STAGE_TAIL_SECONDS = 0.6;

export const defaultCoverProps: BreakdownCoverProps = {
    accent: '#3BE37A',
    fontBaseUrl: '/fonts/breakdown',
    headline: [
        [{ text: "LET'S BREAK DOWN HOW", accent: false }],
        [{ text: 'JEFF NIPPARD', accent: true }],
        [
            { text: 'GOT ', accent: false },
            { text: '9,600,000', accent: true },
            { text: ' VIEWS', accent: false },
        ],
    ],
    avatarSrc: null,
    handle: 'jeffnippard',
    followersLabel: '4.1M followers',
    niche: 'Science-Based Bodybuilding',
    videoSrc: '',
    durationSeconds: 4,
};

export const defaultSlideProps: BreakdownSlideProps = {
    accent: '#3BE37A',
    fontBaseUrl: '/fonts/breakdown',
    videoSrc: '',
    viewsLabel: '9.6M',
    sourceDuration: 58,
    stage: {
        key: 'hook',
        title: 'The Hook',
        label: 'HOOK',
        start: 0,
        end: 4.2,
        videoNote: 'Jeff demonstrates a dead hang',
        videoNoteSide: 'right',
        words: [
            { text: 'This', start: 0.0, end: 0.15 },
            { text: 'dead', start: 0.15, end: 0.4 },
            { text: 'hang', start: 0.4, end: 0.7 },
            { text: 'is', start: 0.7, end: 0.85 },
            { text: 'brutal,', start: 0.85, end: 1.25 },
            { text: 'but', start: 1.25, end: 1.45 },
            { text: 'here', start: 1.45, end: 1.6 },
            { text: 'is', start: 1.6, end: 1.75 },
            { text: 'why', start: 1.75, end: 1.95 },
            { text: 'it', start: 1.95, end: 2.1 },
            { text: 'works.', start: 2.1, end: 2.5 },
            { text: 'Stay', start: 2.5, end: 2.7 },
            { text: 'with', start: 2.7, end: 2.85 },
            { text: 'me.', start: 2.85, end: 3.2 },
        ],
        notes: [
            { fromWord: 1, toWord: 2, text: 'dead hang demo' },
            { fromWord: 10, toWord: 13, text: 'open loop' },
        ],
    },
};

export function coverFrames(props: BreakdownCoverProps): number {
    return secondsToFrames(props.durationSeconds);
}

export function slideFrames(props: BreakdownSlideProps): number {
    return secondsToFrames(
        props.stage.end - props.stage.start + STAGE_TAIL_SECONDS,
    );
}
