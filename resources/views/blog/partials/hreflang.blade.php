{{-- hreflang alternates. $alternates is [locale => url]; en doubles as x-default. --}}
@foreach ($alternates as $loc => $href)
    <link rel="alternate" hreflang="{{ $loc }}" href="{{ $href }}">
@endforeach
@isset($alternates['en'])
    <link rel="alternate" hreflang="x-default" href="{{ $alternates['en'] }}">
@endisset
