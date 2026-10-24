<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
@foreach ($urls as $item)
    <url>
        <loc>{{ $item['loc'] }}</loc>
@if ($item['lastmod'])
        <lastmod>{{ $item['lastmod'] }}</lastmod>
@endif
@foreach ($item['alternates'] ?? [] as $loc => $href)
        <xhtml:link rel="alternate" hreflang="{{ $loc }}" href="{{ $href }}"/>
@endforeach
@if (!empty($item['alternates']['en']))
        <xhtml:link rel="alternate" hreflang="x-default" href="{{ $item['alternates']['en'] }}"/>
@endif
    </url>
@endforeach
</urlset>
