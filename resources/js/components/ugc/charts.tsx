import { useMemo, useRef, useState } from 'react';

/** 12.3K / 4.5M style compact number. */
export function formatNumber(n: number): string {
    if (Math.abs(n) >= 1_000_000) {
return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
}

    if (Math.abs(n) >= 1_000) {
return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
}

    return String(Math.round(n));
}

/** Integer cents -> localized money, e.g. 1999 -> "$19.99". */
export function formatMoney(cents: number, currency = 'USD'): string {
    try {
        return new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', {
            style: 'currency',
            currency,
        }).format(cents / 100);
    } catch {
        return (cents / 100).toFixed(2);
    }
}

function formatDay(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

interface Point {
    date: string;
    views: number;
}

/**
 * Cumulative views over time. A single-series area, so no legend: the card title
 * names it. Ships a crosshair + tooltip, the default for a line/area chart.
 */
export function ViewsAreaChart({ data, color = '#4F46E5' }: { data: Point[]; color?: string }) {
    const W = 720;
    const H = 240;
    const padL = 8;
    const padR = 8;
    const padT = 16;
    const padB = 24;
    const ref = useRef<SVGSVGElement>(null);
    const [hover, setHover] = useState<number | null>(null);

    const { points, areaPath, linePath, max, xAt, yAt } = useMemo(() => {
        const max = Math.max(1, ...data.map((d) => d.views));
        const n = data.length;
        const xAt = (i: number) => padL + (n <= 1 ? 0 : (i / (n - 1)) * (W - padL - padR));
        const yAt = (v: number) => padT + (1 - v / max) * (H - padT - padB);
        const points = data.map((d, i) => ({ x: xAt(i), y: yAt(d.views), ...d }));
        const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        const areaPath = points.length
            ? `${linePath} L${points[points.length - 1].x.toFixed(1)},${H - padB} L${points[0].x.toFixed(1)},${H - padB} Z`
            : '';

        return { points, areaPath, linePath, max, xAt, yAt };
    }, [data]);

    const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const svg = ref.current;

        if (!svg || data.length === 0) {
return;
}

        const rect = svg.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * W;
        const i = Math.round(((x - padL) / (W - padL - padR)) * (data.length - 1));
        setHover(Math.max(0, Math.min(data.length - 1, i)));
    };

    // A few evenly-spaced x labels so the axis never crowds.
    const labelStep = Math.max(1, Math.ceil(data.length / 6));

    return (
        <div className="relative">
            <svg
                ref={ref}
                viewBox={`0 0 ${W} ${H}`}
                className="w-full"
                style={{ height: 'auto' }}
                onMouseMove={onMove}
                onMouseLeave={() => setHover(null)}
                role="img"
                aria-label="Views ao longo do tempo"
            >
                <defs>
                    <linearGradient id="ugc-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* recessive gridlines */}
                {[0, 0.5, 1].map((t) => (
                    <line
                        key={t}
                        x1={padL}
                        x2={W - padR}
                        y1={yAt(max * t)}
                        y2={yAt(max * t)}
                        stroke="#ececea"
                        strokeWidth={1}
                    />
                ))}

                {areaPath && <path d={areaPath} fill="url(#ugc-area)" />}
                {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />}

                {hover !== null && points[hover] && (
                    <>
                        <line
                            x1={points[hover].x}
                            x2={points[hover].x}
                            y1={padT}
                            y2={H - padB}
                            stroke={color}
                            strokeWidth={1}
                            strokeDasharray="3 3"
                            opacity={0.5}
                        />
                        <circle cx={points[hover].x} cy={points[hover].y} r={4.5} fill={color} stroke="#fff" strokeWidth={2} />
                    </>
                )}

                {data.map((d, i) =>
                    i % labelStep === 0 ? (
                        <text key={d.date} x={xAt(i)} y={H - 6} textAnchor="middle" className="fill-gray-400" fontSize={11}>
                            {formatDay(d.date)}
                        </text>
                    ) : null,
                )}
            </svg>

            {hover !== null && points[hover] && (
                <div
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
                    style={{ left: `${(points[hover].x / W) * 100}%`, top: `${(points[hover].y / H) * 100}%` }}
                >
                    <div className="font-semibold">{formatNumber(points[hover].views)} views</div>
                    <div className="text-gray-300">{formatDay(points[hover].date)}</div>
                </div>
            )}
        </div>
    );
}

interface BarItem {
    label: string;
    sublabel?: string;
    value: number;
    color?: string;
}

/**
 * Horizontal leaderboard. Direct value labels on every bar (the data-ink relief
 * a low-contrast fill needs), bars rounded at the data end.
 */
export function BarList({ items, color = '#4F46E5', formatValue = formatNumber }: { items: BarItem[]; color?: string; formatValue?: (n: number) => string }) {
    const max = Math.max(1, ...items.map((i) => i.value));

    if (items.length === 0) {
        return <p className="py-8 text-center text-sm text-gray-400">Sem dados ainda.</p>;
    }

    return (
        <div className="space-y-3">
            {items.map((item, i) => (
                <div key={`${item.label}-${i}`} className="flex items-center gap-3">
                    <div className="w-28 shrink-0 truncate text-sm text-gray-700" title={item.label}>
                        {item.label}
                        {item.sublabel && <span className="block truncate text-xs text-gray-400">{item.sublabel}</span>}
                    </div>
                    <div className="relative h-5 flex-1 rounded bg-gray-100">
                        <div
                            className="absolute inset-y-0 left-0 rounded"
                            style={{ width: `${(item.value / max) * 100}%`, background: item.color ?? color }}
                        />
                    </div>
                    <div className="w-16 shrink-0 text-right text-sm font-medium text-gray-900">{formatValue(item.value)}</div>
                </div>
            ))}
        </div>
    );
}

interface DonutSlice {
    label: string;
    value: number;
    color: string;
}

/**
 * Two-to-few category split. Labels + values sit beside the ring, so identity is
 * never color-alone and the low-contrast fills are relieved by text.
 */
export function DonutChart({ slices }: { slices: DonutSlice[] }) {
    const total = slices.reduce((s, d) => s + d.value, 0);

    if (total === 0) {
        return <p className="py-8 text-center text-sm text-gray-400">Sem dados ainda.</p>;
    }

    const R = 54;
    const C = 2 * Math.PI * R;

    return (
        <div className="flex items-center gap-6">
            <svg viewBox="0 0 140 140" className="h-32 w-32 shrink-0">
                <g transform="rotate(-90 70 70)">
                    {slices.map((s, i) => {
                        const dash = (s.value / total) * C;
                        // Offset = tudo que vem antes desta fatia, sem acumulador mutável.
                        const offset = slices.slice(0, i).reduce((sum, p) => sum + (p.value / total) * C, 0);

                        return (
                            <circle
                                key={s.label}
                                cx={70}
                                cy={70}
                                r={R}
                                fill="none"
                                stroke={s.color}
                                strokeWidth={18}
                                strokeDasharray={`${dash} ${C - dash}`}
                                strokeDashoffset={-offset}
                            />
                        );
                    })}
                </g>
                <text x={70} y={66} textAnchor="middle" className="fill-gray-900" fontSize={18} fontWeight={700}>
                    {formatNumber(total)}
                </text>
                <text x={70} y={82} textAnchor="middle" className="fill-gray-400" fontSize={10}>
                    views
                </text>
            </svg>
            <ul className="space-y-2 text-sm">
                {slices.map((s) => (
                    <li key={s.label} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                        <span className="text-gray-700">{s.label}</span>
                        <span className="font-medium text-gray-900">{formatNumber(s.value)}</span>
                        <span className="text-xs text-gray-400">{Math.round((s.value / total) * 100)}%</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
