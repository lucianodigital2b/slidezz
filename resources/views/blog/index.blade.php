@extends('blog.layout')

@section('title', 'Slidezz Blog: carousel and content playbooks')
@section('canonical', $posts->currentPage() > 1 ? $posts->url($posts->currentPage()) : route('blog.index'))

@section('content')
    <h1>Slidezz Blog</h1>
    <p class="meta">Carousel, content and growth playbooks for creators who post every week.</p>

    @if ($posts->isEmpty())
        <p>No posts yet. The first ones are on the way.</p>
    @else
        <div class="post-list">
            @foreach ($posts as $post)
                <article>
                    <h2><a href="{{ $post->url() }}">{{ $post->title }}</a></h2>
                    @if ($post->excerpt)
                        <p>{{ $post->excerpt }}</p>
                    @endif
                    <small class="meta">{{ $post->published_at->format('M j, Y') }} · {{ $post->readingMinutes() }} min read</small>
                </article>
            @endforeach
        </div>

        <nav class="pager">
            <span>@if ($posts->previousPageUrl())<a href="{{ $posts->previousPageUrl() }}">&larr; Newer</a>@endif</span>
            <span>@if ($posts->nextPageUrl())<a href="{{ $posts->nextPageUrl() }}">Older &rarr;</a>@endif</span>
        </nav>
    @endif
@endsection
