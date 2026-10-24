@extends('blog.layout')

@section('title', __('blog.index_title'))
@section('canonical', $canonical)

@push('head')
    @include('blog.partials.hreflang', ['alternates' => $alternates])
@endpush

@section('content')
    <h1>{{ __('blog.index_h1') }}</h1>
    <p class="meta">{{ __('blog.index_sub') }}</p>

    @if ($posts->isEmpty())
        <p>{{ __('blog.empty') }}</p>
    @else
        <div class="post-list">
            @foreach ($posts as $post)
                <article>
                    <h2><a href="{{ $post->url() }}">{{ $post->title }}</a></h2>
                    @if ($post->excerpt)
                        <p>{{ $post->excerpt }}</p>
                    @endif
                    <small class="meta">{{ $post->publishedDate() }} · {{ $post->readingMinutes() }} {{ __('blog.min_read') }}</small>
                </article>
            @endforeach
        </div>

        <nav class="pager">
            <span>@if ($posts->previousPageUrl())<a href="{{ $posts->previousPageUrl() }}">{!! __('blog.newer') !!}</a>@endif</span>
            <span>@if ($posts->nextPageUrl())<a href="{{ $posts->nextPageUrl() }}">{!! __('blog.older') !!}</a>@endif</span>
        </nav>
    @endif
@endsection
