import {
    AbsoluteFill,
    Img,
    OffthreadVideo,
    interpolate,
    spring,
    useCurrentFrame,
    useVideoConfig,
} from 'remotion';
import { Backdrop } from './Backdrop';
import { SANS, useBreakdownFonts } from './fonts';
import type { BreakdownCoverProps } from './types';

export function BreakdownCover(props: BreakdownCoverProps) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const {
        accent,
        headline,
        avatarSrc,
        handle,
        followersLabel,
        niche,
        videoSrc,
    } = props;

    useBreakdownFonts(props.fontBaseUrl);

    const lineElements = headline.map((line, lineIndex) => {
        const charCount = line.reduce((sum, seg) => sum + seg.text.length, 0);
        const baseSize = lineIndex === 1 ? 112 : 76;
        const fontSize =
            charCount > 16
                ? Math.max(56, (baseSize * 16) / charCount)
                : baseSize;

        const springValue = spring({
            fps,
            frame: Math.max(0, frame - lineIndex * 4),
            config: { damping: 200 },
        });
        const lineOpacity = springValue;
        const lineTranslate = interpolate(springValue, [0, 1], [30, 0]);

        return (
            <div
                key={lineIndex}
                style={{
                    fontFamily: SANS,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.0,
                    color: '#fff',
                    fontSize,
                    width: '100%',
                    maxWidth: 960,
                    textAlign: 'center',
                    opacity: lineOpacity,
                    transform: `translateY(${lineTranslate}px)`,
                }}
            >
                {line.map((segment, segIndex) => (
                    <span
                        key={segIndex}
                        style={{
                            color: segment.accent ? accent : '#fff',
                            textShadow: segment.accent
                                ? `0 0 40px ${accent}66`
                                : undefined,
                        }}
                    >
                        {segment.text}
                    </span>
                ))}
            </div>
        );
    });

    const avatarSpring = spring({
        fps,
        frame: Math.max(0, frame - 6),
        config: { damping: 200 },
    });
    const avatarScale = interpolate(avatarSpring, [0, 1], [0.85, 1]);
    const rotate = frame * 0.6;
    const pulse = interpolate(frame % 30, [0, 15, 30], [0.5, 1, 0.5], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    const followersFirstToken = followersLabel.trim()
        ? followersLabel.trim().split(/\s+/)[0]
        : '';
    const followersRest = followersLabel.trim()
        ? followersLabel.trim().slice(followersFirstToken.length)
        : '';

    const bottomSegments: React.ReactNode[] = [];

    if (followersLabel.trim()) {
        bottomSegments.push(
            <span key="followers">
                <span style={{ fontWeight: 700, color: '#fff' }}>
                    {followersFirstToken}
                </span>
                {followersRest && <span>{followersRest}</span>}
            </span>,
        );
    }

    if (followersLabel.trim() && niche.trim()) {
        bottomSegments.push(
            <span key="separator" style={{ margin: '0 12px' }}>
                ·
            </span>,
        );
    }

    if (niche.trim()) {
        bottomSegments.push(<span key="niche">{niche}</span>);
    }

    return (
        <AbsoluteFill style={{ backgroundColor: '#060807' }}>
            {/* background video layer */}
            {videoSrc && (
                <AbsoluteFill>
                    <OffthreadVideo
                        src={videoSrc}
                        muted
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: 'blur(40px) brightness(0.5)',
                            transform: 'scale(1.2)',
                            opacity: 0.35,
                        }}
                    />
                    <AbsoluteFill
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)' }}
                    />
                </AbsoluteFill>
            )}
            <Backdrop
                accent={accent}
                style={{ mixBlendMode: 'normal', opacity: 0.92 }}
            />

            {/* content */}
            <AbsoluteFill style={{ zIndex: 2 }}>
                {/* headline */}
                <div
                    style={{
                        position: 'absolute',
                        top: 150,
                        left: 0,
                        right: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0,
                        padding: '0 60px',
                    }}
                >
                    {lineElements}
                </div>

                {/* avatar */}
                <div
                    style={{
                        position: 'absolute',
                        top: 560,
                        left: 0,
                        right: 0,
                        display: 'flex',
                        justifyContent: 'center',
                    }}
                >
                    <div
                        style={{
                            position: 'relative',
                            width: 400,
                            height: 400,
                        }}
                    >
                        <div
                            style={{
                                width: 400,
                                height: 400,
                                borderRadius: '50%',
                                border: `10px solid ${accent}`,
                                boxShadow: `0 0 60px ${accent}55, inset 0 0 0 6px #060807`,
                                overflow: 'hidden',
                                position: 'relative',
                                transform: `scale(${avatarScale})`,
                            }}
                        >
                            {avatarSrc ? (
                                <Img
                                    src={avatarSrc}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                    }}
                                />
                            ) : (
                                <div
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        backgroundColor: '#111',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontFamily: SANS,
                                        fontWeight: 800,
                                        fontSize: 160,
                                        color: '#fff',
                                    }}
                                >
                                    {handle.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        {/* rotating dashed ring */}
                        <svg
                            width={444}
                            height={444}
                            style={{
                                position: 'absolute',
                                left: '50%',
                                top: '50%',
                                transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
                                opacity: 0.6,
                                pointerEvents: 'none',
                            }}
                        >
                            <circle
                                cx={222}
                                cy={222}
                                r={222}
                                fill="none"
                                stroke={accent}
                                strokeWidth={2}
                                strokeDasharray="6 14"
                            />
                        </svg>
                    </div>
                </div>

                {/* handle */}
                <div
                    style={{
                        position: 'absolute',
                        top: 1020,
                        left: 0,
                        right: 0,
                        textAlign: 'center',
                        fontFamily: SANS,
                        fontWeight: 700,
                        fontSize: 60,
                        color: '#fff',
                    }}
                >
                    @{handle}
                </div>

                {/* followers & niche */}
                <div
                    style={{
                        position: 'absolute',
                        top: 1096,
                        left: 0,
                        right: 0,
                        textAlign: 'center',
                        fontFamily: SANS,
                        fontWeight: 500,
                        fontSize: 32,
                        color: 'rgba(255, 255, 255, 0.6)',
                    }}
                >
                    {bottomSegments}
                </div>

                {/* swipe hint */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: 70,
                        left: 0,
                        right: 0,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 12,
                        opacity: pulse,
                        pointerEvents: 'none',
                    }}
                >
                    {[0, 1, 2].map((dot) => (
                        <div
                            key={dot}
                            style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: accent,
                            }}
                        />
                    ))}
                    <svg width={20} height={20} viewBox="0 0 20 20">
                        <path
                            d="M2 10 L14 10 M10 4 L16 10 L10 16"
                            stroke={accent}
                            strokeWidth={2.5}
                            fill="none"
                        />
                    </svg>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
}
