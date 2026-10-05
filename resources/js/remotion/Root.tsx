import { Composition } from 'remotion';
import { SlidezzVideo } from './SlidezzVideo';
import { timelineFrames, VIDEO_FORMATS, VIDEO_FPS } from './timeline';
import type { VideoCompositionProps } from './timeline';

export const COMPOSITION_ID = 'SlidezzVideo';

const defaultProps: VideoCompositionProps = {
    format: 'stories',
    timeline: { clips: [], audio: null },
};

export function RemotionRoot() {
    return (
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
    );
}
