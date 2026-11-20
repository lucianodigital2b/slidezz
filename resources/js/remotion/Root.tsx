import { Composition } from 'remotion';
import { BreakdownCover } from './breakdown/BreakdownCover';
import { BreakdownSlide } from './breakdown/BreakdownSlide';
import {
    BREAKDOWN_SIZE,
    coverFrames,
    defaultCoverProps,
    defaultSlideProps,
    slideFrames,
} from './breakdown/types';
import { SlidezzVideo } from './SlidezzVideo';
import { timelineFrames, VIDEO_FORMATS, VIDEO_FPS } from './timeline';
import type { VideoCompositionProps } from './timeline';

export const COMPOSITION_ID = 'SlidezzVideo';
export const BREAKDOWN_COVER_ID = 'BreakdownCover';
export const BREAKDOWN_SLIDE_ID = 'BreakdownSlide';

const defaultProps: VideoCompositionProps = {
    format: 'stories',
    timeline: { clips: [], audio: null },
};

export function RemotionRoot() {
    return (
        <>
            <Composition
                id={COMPOSITION_ID}
                component={SlidezzVideo}
                fps={VIDEO_FPS}
                width={VIDEO_FORMATS.stories.w}
                height={VIDEO_FORMATS.stories.h}
                durationInFrames={1}
                defaultProps={defaultProps}
                calculateMetadata={({ props }) => ({
                    durationInFrames: timelineFrames(props.timeline),
                    width: VIDEO_FORMATS[props.format].w,
                    height: VIDEO_FORMATS[props.format].h,
                })}
            />
            <Composition
                id={BREAKDOWN_COVER_ID}
                component={BreakdownCover}
                fps={VIDEO_FPS}
                width={BREAKDOWN_SIZE.w}
                height={BREAKDOWN_SIZE.h}
                durationInFrames={120}
                defaultProps={defaultCoverProps}
                calculateMetadata={({ props }) => ({
                    durationInFrames: coverFrames(props),
                })}
            />
            <Composition
                id={BREAKDOWN_SLIDE_ID}
                component={BreakdownSlide}
                fps={VIDEO_FPS}
                width={BREAKDOWN_SIZE.w}
                height={BREAKDOWN_SIZE.h}
                durationInFrames={120}
                defaultProps={defaultSlideProps}
                calculateMetadata={({ props }) => ({
                    durationInFrames: slideFrames(props),
                })}
            />
        </>
    );
}
