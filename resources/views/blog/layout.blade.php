@php
    $htmlLang = app()->getLocale() === 'pt' ? 'pt-BR' : 'en';
    $blogIndex = \App\Models\BlogPost::blogIndexUrl($htmlLang);
@endphp
<!DOCTYPE html>
<html lang="{{ $htmlLang }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title>@yield('title', __('blog.default_title'))</title>
        <meta name="description" content="@yield('description', __('blog.default_description'))">
        <link rel="canonical" href="@yield('canonical', url()->current())">
        @hasSection('noindex')
            <meta name="robots" content="noindex, nofollow">
        @endif

        <meta property="og:site_name" content="Slidezz">
        <meta property="og:type" content="@yield('og_type', 'website')">
        <meta property="og:title" content="@yield('title', __('blog.default_title'))">
        <meta property="og:description" content="@yield('description', __('blog.default_description'))">
        <meta property="og:url" content="@yield('canonical', url()->current())">
        @hasSection('og_image')
            <meta property="og:image" content="@yield('og_image')">
        @endif
        <meta name="twitter:card" content="summary_large_image">

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700|inter-tight:700,800" rel="stylesheet" />

        @if (config('services.meta.pixel_id'))
            <script>
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '{{ config('services.meta.pixel_id') }}');
                fbq('track', 'PageView');
            </script>
            <noscript><img height="1" width="1" style="display:none"
                src="https://www.facebook.com/tr?id={{ config('services.meta.pixel_id') }}&ev=PageView&noscript=1"/></noscript>
        @endif

        @if (config('app.env') == 'production')
            <script type="text/javascript">
                (function(c,l,a,r,i,t,y){
                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "xg67xhvgtl");
            </script>
        @endif

        <style>
            :root { --ink: #19171c; --muted: #6e6e73; --line: #d7d7db; --soft: #f2f1f3; --accent: #34d27b; --accent-deep: #087a41; --accent-soft: #e5f8ec; }
            * { box-sizing: border-box; }
            body { margin: 0; background: #fff; color: var(--ink); font: 18px/1.7 Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
            a { color: var(--accent-deep); }
            .wrap { max-width: 720px; margin: 0 auto; padding: 0 16px; }
            .site-header { border-bottom: 1px solid var(--line); }
            .site-header .wrap { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 16px; padding-bottom: 16px; }
            .wordmark { font-family: 'Inter Tight', Inter, sans-serif; font-weight: 800; font-size: 22px; letter-spacing: -0.03em; color: var(--ink); text-decoration: none; }
            .site-nav { display: flex; align-items: center; gap: 16px; font-size: 15px; }
            .site-nav a:not(.btn) { color: var(--ink); text-decoration: none; font-weight: 500; }
            .btn { display: inline-block; background: var(--accent); color: var(--ink); padding: 10px 18px; border-radius: 999px; font-weight: 600; font-size: 15px; line-height: 1.2; text-decoration: none; }
            .btn:hover { filter: brightness(0.95); }
            main.wrap { padding-top: 40px; padding-bottom: 64px; }
            h1, h2, h3 { font-family: 'Inter Tight', Inter, sans-serif; line-height: 1.15; letter-spacing: -0.02em; font-weight: 800; }
            h1 { font-size: 40px; margin: 0 0 16px; }
            h2 { font-size: 28px; margin: 48px 0 12px; }
            h3 { font-size: 21px; margin: 32px 0 8px; font-weight: 700; }
            p, ul, ol { margin: 0 0 20px; }
            li { margin-bottom: 6px; }
            blockquote { margin: 24px 0; padding: 4px 0 4px 20px; border-left: 4px solid var(--accent); color: var(--muted); }
            code { background: var(--soft); padding: 2px 6px; border-radius: 4px; font-size: 0.88em; }
            pre { background: var(--soft); padding: 16px; border-radius: 10px; overflow-x: auto; }
            pre code { background: none; padding: 0; }
            table { display: block; overflow-x: auto; border-collapse: collapse; margin: 24px 0; font-size: 16px; }
            th, td { border: 1px solid var(--line); padding: 10px 12px; text-align: left; vertical-align: top; }
            th { background: var(--soft); font-weight: 700; }
            img { max-width: 100%; height: auto; border-radius: 12px; }
            hr { border: 0; border-top: 1px solid var(--line); margin: 40px 0; }
            .crumbs { font-size: 14px; color: var(--muted); margin-bottom: 20px; }
            .crumbs a { color: var(--muted); }
            .meta { font-size: 15px; color: var(--muted); margin-bottom: 28px; }
            .hero { margin: 0 0 32px; }
            .preview-banner { background: var(--accent-soft); border: 1px solid var(--accent); padding: 10px 14px; border-radius: 10px; font-size: 15px; margin-bottom: 24px; }
            .faq h3 { margin-top: 24px; }
            .cta { margin-top: 56px; background: var(--soft); border-radius: 32px; padding: 28px 24px; text-align: center; }
            .cta h2 { margin: 0 0 8px; font-size: 26px; }
            .cta p { color: var(--muted); }
            .post-list article { padding: 24px 0; border-bottom: 1px solid var(--line); }
            .post-list h2 { margin: 0 0 6px; font-size: 24px; }
            .post-list h2 a { color: var(--ink); text-decoration: none; }
            .post-list h2 a:hover { color: var(--accent-deep); }
            .post-list p { margin: 0 0 6px; color: var(--muted); }
            .pager { display: flex; justify-content: space-between; margin-top: 32px; }
            .site-footer { border-top: 1px solid var(--line); font-size: 14px; color: var(--muted); }
            .site-footer .wrap { padding-top: 24px; padding-bottom: 32px; display: flex; gap: 16px; flex-wrap: wrap; }
            .site-footer a { color: var(--muted); }
            @media (max-width: 600px) {
                body { font-size: 17px; }
                h1 { font-size: 31px; }
                h2 { font-size: 24px; }
                .site-nav a:not(.btn) { display: none; }
            }
        </style>

        @stack('head')
    </head>
    <body>
        <header class="site-header">
            <div class="wrap">
                <a href="{{ url('/') }}" class="wordmark">Slidezz</a>
                <nav class="site-nav">
                    <a href="{{ $blogIndex }}">{{ __('blog.nav_blog') }}</a>
                    <a href="{{ route('register', ['utm_source' => 'blog', 'utm_medium' => 'header']) }}" class="btn">{{ __('blog.cta_button') }}</a>
                </nav>
            </div>
        </header>

        <main class="wrap">
            @yield('content')
        </main>

        <footer class="site-footer">
            <div class="wrap">
                <span>&copy; {{ date('Y') }} Slidezz</span>
                <a href="{{ $blogIndex }}">{{ __('blog.nav_blog') }}</a>
                <a href="{{ route('privacy-policy') }}">Privacy</a>
                <a href="{{ route('terms') }}">Terms</a>
            </div>
        </footer>
    </body>
</html>
