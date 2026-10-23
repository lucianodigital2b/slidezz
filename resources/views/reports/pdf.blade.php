@php
    /** @var array $report */
    /** @var array $config */
    /** @var array $brand */

    $fmt = function ($n) {
        $n = (float) $n;
        if (abs($n) >= 1_000_000) return rtrim(rtrim(number_format($n / 1_000_000, 1), '0'), '.').'M';
        if (abs($n) >= 1_000) return rtrim(rtrim(number_format($n / 1_000, 1), '0'), '.').'K';
        return (string) (int) $n;
    };

    $delta = function (?float $d) {
        if ($d === null) return ['label' => '—', 'class' => 'neutral'];
        $sign = $d > 0 ? '+' : '';
        return ['label' => $sign.rtrim(rtrim(number_format($d, 1), '0'), '.').'%', 'class' => $d > 0 ? 'up' : ($d < 0 ? 'down' : 'neutral')];
    };

    $ptDate = fn ($iso) => \Illuminate\Support\Carbon::parse($iso)->translatedFormat('d M Y');

    $accent = $brand['color'] ?: '#1A1A1A';

    $metricCards = [
        ['key' => 'views', 'label' => 'Visualizações'],
        ['key' => 'likes', 'label' => 'Curtidas'],
        ['key' => 'comments', 'label' => 'Comentários'],
        ['key' => 'shares', 'label' => 'Compart.'],
        ['key' => 'engagement_rate', 'label' => 'Engajamento', 'percent' => true],
        ['key' => 'posts', 'label' => 'Publicações'],
    ];

    $platformLabels = ['instagram' => 'Instagram', 'tiktok' => 'TikTok'];

    $columns = [
        ['key' => 'views', 'label' => 'Views'],
        ['key' => 'likes', 'label' => 'Curtidas'],
        ['key' => 'comments', 'label' => 'Coment.'],
        ['key' => 'shares', 'label' => 'Compart.'],
        ['key' => 'bookmarks', 'label' => 'Salvos'],
        ['key' => 'engagement_rate', 'label' => 'Eng.', 'percent' => true],
    ];
@endphp
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @page { margin: 0; }
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #1A1A1A;
            font-size: 11px;
            line-height: 1.45;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .page { padding: 32px 38px; }
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 18px;
            border-bottom: 3px solid {{ $accent }};
            margin-bottom: 26px;
        }
        .brand-logo { max-height: 40px; max-width: 220px; }
        .brand-name { font-size: 20px; font-weight: 700; color: {{ $accent }}; }
        .header-meta { text-align: right; }
        .header-meta .title { font-size: 13px; font-weight: 700; }
        .header-meta .range { font-size: 11px; color: #6b7280; margin-top: 2px; }
        .header-meta .compare { font-size: 9px; color: #9ca3af; margin-top: 1px; }

        h2 {
            font-size: 13px;
            font-weight: 700;
            margin: 26px 0 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        h2 .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }

        .cards { display: flex; flex-wrap: wrap; gap: 10px; }
        .card {
            width: calc((100% - 50px) / 6);
            border: 1px solid #ececec;
            border-radius: 10px;
            padding: 11px 12px;
        }
        .card .label { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: .3px; }
        .card .value { font-size: 19px; font-weight: 700; margin-top: 5px; }
        .card .delta { font-size: 9px; margin-top: 3px; font-weight: 600; }
        .delta.up, .pill.up { color: #15803d; }
        .delta.down, .pill.down { color: #dc2626; }
        .delta.neutral, .pill.neutral { color: #9ca3af; }

        .platform-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 8px; }
        .platform-head .totals { font-size: 10px; color: #6b7280; }
        .platform-head .totals b { color: #1A1A1A; }

        table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        th, td { text-align: right; padding: 7px 8px; font-size: 10px; }
        th:first-child, td:first-child { text-align: left; }
        thead th { color: #6b7280; font-weight: 600; border-bottom: 1.5px solid #ececec; font-size: 9px; text-transform: uppercase; letter-spacing: .3px; }
        tbody tr { border-bottom: 1px solid #f3f4f6; }
        td.post { max-width: 230px; }
        td.post .handle { font-weight: 600; }
        td.post .ttl { color: #9ca3af; font-size: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 230px; }
        .empty { color: #9ca3af; font-size: 10px; padding: 14px 8px; text-align: center; }
        .dash { color: #c4c4c4; }

        .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #ececec; font-size: 8.5px; color: #b0b0b0; text-align: center; }
    </style>
</head>
<body>
<div class="page">
    <div class="header">
        <div>
            @if ($brand['logo'])
                <img class="brand-logo" src="{{ $brand['logo'] }}" alt="{{ $brand['name'] }}">
            @else
                <div class="brand-name">{{ $brand['name'] }}</div>
            @endif
        </div>
        <div class="header-meta">
            <div class="title">Relatório de Redes Sociais</div>
            <div class="range">{{ $report['period']['label'] }}</div>
            <div class="compare">Comparado a {{ $report['comparison']['label'] }}</div>
        </div>
    </div>

    @if ($config['summary']['enabled'] ?? true)
        <h2><span class="dot" style="background: {{ $accent }}"></span> Resumo</h2>
        <div class="cards">
            @foreach ($metricCards as $card)
                @php $d = $delta($report['summary']['deltas'][$card['key']] ?? null); @endphp
                <div class="card">
                    <div class="label">{{ $card['label'] }}</div>
                    <div class="value">
                        {{ ($card['percent'] ?? false) ? $report['summary']['current'][$card['key']].'%' : $fmt($report['summary']['current'][$card['key']]) }}
                    </div>
                    <div class="delta {{ $d['class'] }}">{{ $d['label'] }}</div>
                </div>
            @endforeach
        </div>
    @endif

    @foreach (['instagram', 'tiktok'] as $platform)
        @continue(! ($config[$platform]['enabled'] ?? true))
        @php
            $section = $report['platforms'][$platform];
            $totals = $section['totals'];
            $posts = $section['posts'];
        @endphp
        <h2>
            <span class="dot" style="background: {{ $platform === 'instagram' ? '#E1306C' : '#000000' }}"></span>
            {{ $platformLabels[$platform] }}
        </h2>
        <div class="platform-head">
            <div class="totals">
                <b>{{ $fmt($totals['views']) }}</b> views ·
                <b>{{ $fmt($totals['likes']) }}</b> curtidas ·
                <b>{{ $fmt($totals['comments']) }}</b> coment. ·
                <b>{{ $totals['engagement_rate'] }}%</b> eng. ·
                <b>{{ $totals['posts'] }}</b> posts
            </div>
        </div>
        @if (count($posts) === 0)
            <div class="empty">Nenhuma publicação nesse período.</div>
        @else
            <table>
                <thead>
                    <tr>
                        <th>Publicação</th>
                        @foreach ($columns as $col)
                            <th>{{ $col['label'] }}</th>
                        @endforeach
                        <th>Data</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($posts as $post)
                        <tr>
                            <td class="post">
                                <div class="handle">{{ '@'.$post['handle'] }}</div>
                                <div class="ttl">{{ $post['title'] }}</div>
                            </td>
                            @foreach ($columns as $col)
                                <td>
                                    @if (! $post['synced'])
                                        <span class="dash">—</span>
                                    @elseif ($col['percent'] ?? false)
                                        {{ $post[$col['key']] }}%
                                    @else
                                        {{ $fmt($post[$col['key']]) }}
                                    @endif
                                </td>
                            @endforeach
                            <td>{{ $ptDate($post['published_at']) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        @endif
    @endforeach

    <div class="footer">
        Gerado por Slidezz · {{ \Illuminate\Support\Carbon::now()->translatedFormat('d M Y') }}
    </div>
</div>
</body>
</html>
