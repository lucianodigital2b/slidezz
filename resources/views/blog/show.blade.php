@extends('blog.layout')

@section('title', $post->meta_title ?: $post->title)
@section('description', $post->description())
@section('canonical', $post->canonical())
@section('og_type', 'article')
@if ($post->hero_image_url)
    @section('og_image', $post->hero_image_url)
@endif
@if ($isPreview || $post->noindex)
    @section('noindex', '1')
@endif

@push('head')
    @include('blog.partials.hreflang', ['alternates' => $post->alternates()])
    <link rel="alternate" type="text/markdown" href="{{ $post->markdownUrl() }}">
    @foreach ($post->structuredData() as $schema)
        <script type="application/ld+json">{!! json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) !!}</script>
    @endforeach
@endpush

@section('content')
    @if ($isPreview)
        <div class="preview-banner">{{ __('blog.preview_banner', ['status' => $post->status->value]) }}</div>
    @endif

    <nav class="crumbs"><a href="{{ url('/') }}">{{ __('blog.home') }}</a> / <a href="{{ \App\Models\BlogPost::blogIndexUrl($post->locale) }}">{{ __('blog.nav_blog') }}</a></nav>

    <article>
        <h1>{{ $post->title }}</h1>
        <p class="meta">
            {{ $post->author_name }}
            · {{ $post->publishedDate() }}
            @if ($post->published_at && $post->updated_at->diffInDays($post->published_at, true) >= 1)
                · {{ __('blog.updated') }} {{ $post->updatedDate() }}
            @endif
            · {{ $post->readingMinutes() }} {{ __('blog.min_read') }}
        </p>

        @if ($post->hero_image_url)
            <img class="hero" src="{{ $post->hero_image_url }}" alt="{{ $post->hero_image_alt }}">
        @endif

        {!! $post->bodyHtml() !!}

        @if (! empty($post->faqs))
            <section class="faq">
                <h2>{{ __('blog.faq') }}</h2>
                @foreach ($post->faqs as $faq)
                    <h3>{{ $faq['question'] }}</h3>
                    {!! \App\Models\BlogPost::renderMarkdown($faq['answer']) !!}
                @endforeach
            </section>
        @endif
    </article>

    <aside class="cta">
        <h2>{{ __('blog.cta_h2') }}</h2>
        <p>{{ __('blog.cta_p') }}</p>
        <a class="btn" href="{{ route('register', ['utm_source' => 'blog', 'utm_medium' => 'cta', 'utm_campaign' => $post->slug]) }}">{{ __('blog.cta_button') }}</a>
    </aside>
@endsection
