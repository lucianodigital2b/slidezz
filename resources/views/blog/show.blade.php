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
    @foreach ($post->structuredData() as $schema)
        <script type="application/ld+json">{!! json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) !!}</script>
    @endforeach
@endpush

@section('content')
    @if ($isPreview)
        <div class="preview-banner">Preview · status: {{ $post->status->value }}. This page is not indexed.</div>
    @endif

    <nav class="crumbs"><a href="{{ url('/') }}">Home</a> / <a href="{{ route('blog.index') }}">Blog</a></nav>

    <article>
        <h1>{{ $post->title }}</h1>
        <p class="meta">
            {{ $post->author_name }}
            · {{ ($post->published_at ?? $post->created_at)->format('M j, Y') }}
            @if ($post->published_at && $post->updated_at->diffInDays($post->published_at, true) >= 1)
                · Updated {{ $post->updated_at->format('M j, Y') }}
            @endif
            · {{ $post->readingMinutes() }} min read
        </p>

        @if ($post->hero_image_url)
            <img class="hero" src="{{ $post->hero_image_url }}" alt="{{ $post->hero_image_alt }}">
        @endif

        {!! $post->bodyHtml() !!}

        @if (! empty($post->faqs))
            <section class="faq">
                <h2>FAQ</h2>
                @foreach ($post->faqs as $faq)
                    <h3>{{ $faq['question'] }}</h3>
                    {!! \App\Models\BlogPost::renderMarkdown($faq['answer']) !!}
                @endforeach
            </section>
        @endif
    </article>

    <aside class="cta">
        <h2>Make your next carousel in under a minute</h2>
        <p>Slidezz writes and designs the whole carousel. You just post it.</p>
        <a class="btn" href="{{ route('register', ['utm_source' => 'blog', 'utm_medium' => 'cta', 'utm_campaign' => $post->slug]) }}">Get started</a>
    </aside>
@endsection
