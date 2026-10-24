<?php

namespace App\Http\Controllers\Api;

use App\Enums\BlogPostStatus;
use App\Http\Controllers\Controller;
use App\Jobs\SubmitToIndexNow;
use App\Models\BlogPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Blog CMS for the SEO agent (RomeoSEO "CMS publishing adapter"): content model, drafts,
 * permissioned publishing, image upload and full readback. Editors only (services.blog.editor_emails).
 */
class BlogPostController extends Controller
{
    private const SLUG_PATTERN = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/';

    public function schema(): JsonResponse
    {
        Gate::authorize('manage-blog');

        return response()->json(['data' => [
            'body_format' => 'markdown-gfm',
            'url_pattern' => ['en' => url('/blog/{slug}'), 'pt-BR' => url('/pt/blog/{slug}')],
            'statuses' => array_column(BlogPostStatus::cases(), 'value'),
            'locales' => ['en', 'pt-BR'],
            'default_status' => 'draft',
            'publish_ability' => 'blog:publish',
            'fields' => [
                'locale' => 'en (default) or pt-BR. pt-BR posts are served under /pt/blog. Use a native keyword, never a literal translation of the slug.',
                'translation_key' => 'optional, max 64. Give a post and its translation in the other locale the same translation_key so hreflang links them.',
                'slug' => 'required on create, lowercase a-z 0-9 and hyphens, max 160, unique per locale',
                'title' => 'required on create, max 200, rendered as the H1',
                'body' => 'required on create, GitHub-flavored Markdown (tables ok). Start at H2, the title is the H1.',
                'meta_title' => 'optional, max 70, <title> (falls back to title)',
                'meta_description' => 'optional, max 170',
                'excerpt' => 'optional, max 300, shown on /blog',
                'faqs' => 'optional, up to 20 {question, answer}; rendered as a visible FAQ section + FAQPage schema',
                'json_ld' => 'optional list of extra schema objects (HowTo, ItemList, SoftwareApplication...)',
                'category' => 'optional, max 80',
                'tags' => 'optional, up to 10 strings',
                'author_name' => 'optional, default "Slidezz Team"',
                'hero_image_url' => 'optional URL (upload with POST /api/blog/images); hero_image_alt required with it',
                'canonical_url' => 'optional, null = the post URL',
                'primary_keyword' => 'optional', 'secondary_keywords' => 'optional list', 'search_intent' => 'optional',
                'task_ref' => 'optional ticket/issue URL that produced the post',
                'noindex' => 'optional boolean',
                'status' => 'draft | published | archived',
                'published_at' => 'optional ISO date; set to now when first published',
                'confirm_slug_change' => 'required true to change the slug of a live post',
            ],
            'notes' => [
                'Raw HTML in body and FAQ answers is stripped.',
                'BlogPosting and BreadcrumbList schema are generated; json_ld entries of those types or FAQPage are ignored.',
                'updated_at is dateModified.',
                'PATCH only changes the fields you send.',
                'Every write returns the full readback, including body_html, structured_data and a 7-day signed preview_url.',
            ],
        ]]);
    }

    public function index(Request $request): JsonResponse
    {
        Gate::authorize('manage-blog');

        $validated = $request->validate([
            'status' => ['nullable', Rule::enum(BlogPostStatus::class)],
            'locale' => ['nullable', 'string', 'max:10'],
        ]);

        $posts = BlogPost::query()
            ->when($validated['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($validated['locale'] ?? null, fn ($q, $locale) => $q->where('locale', $locale))
            ->latest('updated_at')
            ->limit(500)
            ->get();

        return response()->json(['data' => $posts->map(fn (BlogPost $post): array => [
            'id' => $post->id,
            'locale' => $post->locale,
            'slug' => $post->slug,
            'title' => $post->title,
            'status' => $post->status->value,
            'published_at' => $post->published_at?->toIso8601String(),
            'updated_at' => $post->updated_at->toIso8601String(),
            'url' => $post->url(),
            'primary_keyword' => $post->primary_keyword,
            'task_ref' => $post->task_ref,
        ])]);
    }

    public function show(BlogPost $blogPost): JsonResponse
    {
        Gate::authorize('manage-blog');

        return response()->json(['data' => $this->present($blogPost)]);
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('manage-blog');

        $validated = $this->validatePost($request);
        $validated['status'] ??= BlogPostStatus::Draft->value;
        $validated['locale'] ??= 'en';

        $this->ensureCanPublish($request, $validated);

        if ($validated['status'] === BlogPostStatus::Published->value && empty($validated['published_at'])) {
            $validated['published_at'] = now();
        }

        $post = BlogPost::create([...$validated, 'last_editor_id' => $request->user()->id]);

        $this->pingIndexNow($post);

        return response()->json(['data' => $this->present($post->refresh())], 201);
    }

    public function update(Request $request, BlogPost $blogPost): JsonResponse
    {
        Gate::authorize('manage-blog');

        $validated = $this->validatePost($request, $blogPost);

        $this->ensureCanPublish($request, $validated);

        if (isset($validated['slug']) && $validated['slug'] !== $blogPost->slug && $blogPost->isLive() && ! $request->boolean('confirm_slug_change')) {
            throw ValidationException::withMessages([
                'slug' => 'Changing the slug of a live post loses its rankings. Send confirm_slug_change=true if this was approved.',
            ]);
        }

        if (($validated['status'] ?? null) === BlogPostStatus::Published->value && ! array_key_exists('published_at', $validated) && $blogPost->published_at === null) {
            $validated['published_at'] = now();
        }

        $blogPost->fill([...$validated, 'last_editor_id' => $request->user()->id])->save();

        $this->pingIndexNow($blogPost);

        return response()->json(['data' => $this->present($blogPost->refresh())]);
    }

    public function uploadImage(Request $request): JsonResponse
    {
        Gate::authorize('manage-blog');

        $validated = $request->validate([
            'image' => ['required', 'file', 'image', 'max:10240'],
            'alt' => ['nullable', 'string', 'max:255'],
        ]);

        $file = $validated['image'];
        [$width, $height] = getimagesize($file->getRealPath()) ?: [null, null];

        $disk = Storage::disk(config('filesystems.media_disk'));
        $path = $disk->putFileAs('blog/'.now()->format('Y/m'), $file, Str::uuid().'.'.$file->extension(), 'public');

        return response()->json(['data' => [
            'url' => url($disk->url($path)),
            'path' => $path,
            'alt' => $validated['alt'] ?? null,
            'width' => $width,
            'height' => $height,
            'mime' => $file->getMimeType(),
        ]], 201);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatePost(Request $request, ?BlogPost $post = null): array
    {
        $required = $post ? 'sometimes' : 'required';
        $locale = $request->input('locale', $post?->locale ?? 'en');

        return $request->validate([
            'locale' => ['sometimes', 'string', Rule::in(['en', 'pt-BR'])],
            'translation_key' => ['sometimes', 'nullable', 'string', 'max:64'],
            'slug' => [$required, 'string', 'max:160', 'regex:'.self::SLUG_PATTERN,
                Rule::unique('blog_posts', 'slug')->where('locale', $locale)->ignore($post?->id)],
            'title' => [$required, 'string', 'max:200'],
            'body' => [$required, 'string'],
            'meta_title' => ['sometimes', 'nullable', 'string', 'max:70'],
            'meta_description' => ['sometimes', 'nullable', 'string', 'max:170'],
            'excerpt' => ['sometimes', 'nullable', 'string', 'max:300'],
            'faqs' => ['sometimes', 'nullable', 'array', 'max:20'],
            'faqs.*.question' => ['required', 'string', 'max:300'],
            'faqs.*.answer' => ['required', 'string', 'max:3000'],
            'json_ld' => ['sometimes', 'nullable', 'array'],
            'json_ld.*' => ['array'],
            'category' => ['sometimes', 'nullable', 'string', 'max:80'],
            'tags' => ['sometimes', 'nullable', 'array', 'max:10'],
            'tags.*' => ['string', 'max:40'],
            'author_name' => ['sometimes', 'string', 'max:120'],
            'hero_image_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'hero_image_alt' => ['sometimes', 'nullable', 'required_with:hero_image_url', 'string', 'max:255'],
            'canonical_url' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'primary_keyword' => ['sometimes', 'nullable', 'string', 'max:160'],
            'secondary_keywords' => ['sometimes', 'nullable', 'array'],
            'secondary_keywords.*' => ['string', 'max:160'],
            'search_intent' => ['sometimes', 'nullable', 'string', 'max:40'],
            'task_ref' => ['sometimes', 'nullable', 'string', 'max:255'],
            'noindex' => ['sometimes', 'boolean'],
            'status' => ['sometimes', Rule::enum(BlogPostStatus::class)],
            'published_at' => ['sometimes', 'nullable', 'date'],
        ]);
    }

    /** Notify IndexNow (Bing + Brave) when a live, indexable post is created or changed. */
    private function pingIndexNow(BlogPost $post): void
    {
        if (config('services.indexnow.key') && $post->isLive() && ! $post->noindex) {
            SubmitToIndexNow::dispatch([$post->url()]);
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function ensureCanPublish(Request $request, array $validated): void
    {
        if (($validated['status'] ?? null) === BlogPostStatus::Published->value) {
            abort_unless(
                $request->user()->tokenCan('blog:publish'),
                403,
                'This token cannot publish. Save as draft or use a token with the blog:publish ability.',
            );
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function present(BlogPost $post): array
    {
        return [
            ...$post->only([
                'id', 'locale', 'translation_key', 'slug', 'title', 'meta_title', 'meta_description', 'excerpt', 'body', 'faqs', 'json_ld',
                'category', 'tags', 'author_name', 'hero_image_url', 'hero_image_alt', 'canonical_url',
                'primary_keyword', 'secondary_keywords', 'search_intent', 'task_ref', 'noindex', 'last_editor_id',
            ]),
            'alternates' => $post->alternates(),
            'status' => $post->status->value,
            'is_live' => $post->isLive(),
            'published_at' => $post->published_at?->toIso8601String(),
            'created_at' => $post->created_at->toIso8601String(),
            'updated_at' => $post->updated_at->toIso8601String(),
            'url' => $post->url(),
            'canonical' => $post->canonical(),
            'preview_url' => $post->previewUrl(),
            'body_html' => $post->bodyHtml(),
            'structured_data' => $post->structuredData(),
            'word_count' => $post->wordCount(),
            'reading_minutes' => $post->readingMinutes(),
        ];
    }
}
