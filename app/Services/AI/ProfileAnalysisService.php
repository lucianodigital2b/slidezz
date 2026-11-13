<?php

namespace App\Services\AI;

use App\Models\Workspace;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Facades\Prism;
use RuntimeException;

class ProfileAnalysisService
{
    /**
     * @param  list<array<string, mixed>>  $posts
     * @param  string  $language  e.g. 'Portuguese (Brazil)'
     * @return array{summary: string, what_works: list<array{pattern: string, evidence: string}>, what_is_missing: list<array{gap: string, why: string}>, top_posts: list<array{url: string, why_it_worked: string}>, hooks_that_work: list<string>, next_posts: list<array{format: string, idea: string, hook: string}>, posting_frequency: string}
     */
    public function analyze(array $posts, Workspace $workspace, string $language): array
    {
        $allowedUrls = array_flip(array_values(array_filter(array_column($posts, 'url'))));
        $postTable = $this->compactTable($posts);
        $medianViews = $this->median(array_filter(array_column($posts, 'views'), fn ($value): bool => $value > 0));
        $medianLikes = $this->median(array_filter(array_column($posts, 'likes'), fn ($value): bool => $value > 0));

        $systemPrompt = $this->systemPrompt($language);
        $userPrompt = $this->userPrompt($posts, $workspace, $medianViews, $medianLikes, $postTable);

        $parsed = $this->parse($this->runWithFallback($systemPrompt, $userPrompt), $allowedUrls);

        // Retry once when the model returns no usable report.
        if ($parsed['summary'] === '') {
            \Log::warning('[ProfileAnalysis] Model returned an empty report; retrying');

            $parsed = $this->parse($this->runWithFallback($systemPrompt, $userPrompt), $allowedUrls);
        }

        if ($parsed['summary'] === '') {
            throw new RuntimeException('Profile analysis generation failed: no usable report in response');
        }

        return $parsed;
    }

    private function systemPrompt(string $language): string
    {
        return <<<PROMPT
You are a senior social media analyst for content creators. You read the metrics of the creator's own posts and translate the numbers into an actionable, specific report.

RULES
- Base every claim on the numbers given in the posts list.
- Compare performance against the creator's own median views and likes, which are provided.
- Never invent metrics, never invent posts, never skip the evidence for a claim.
- Write the whole answer in {$language}.
- The sample may be small. If fewer than 3 posts have any metric, say explicitly in the summary that the sample is small and the patterns are provisional.
- Do not use em dash characters anywhere. Use commas or hyphens.

OUTPUT
Respond ONLY with one JSON object, no markdown, no code fences. The shape must be:
{
  "summary": "2-3 sentences",
  "what_works": [{"pattern": "clear pattern", "evidence": "numbers from the table"}],
  "what_is_missing": [{"gap": "clear gap", "why": "numbers from the table"}],
  "top_posts": [{"url": "one of the provided post urls", "why_it_worked": "numbers based reason"}],
  "hooks_that_work": ["short hook pattern"],
  "next_posts": [{"format": "carousel|slideshow|talking_video", "idea": "specific topic or angle", "hook": "first line the creator can use"}],
  "posting_frequency": "recommendation with days per week"
}

THE LIST SIZES
- what_works: at most 5 items.
- what_is_missing: at most 5 items.
- top_posts: at most 3 items, and each url must be exactly one of the urls from the posts table.
- hooks_that_work: at most 5 short strings.
- next_posts: exactly 6 or fewer items, each format one of carousel, slideshow, talking_video.
PROMPT;
    }

    /**
     * @param  list<array<string, mixed>>  $posts
     */
    private function userPrompt(array $posts, Workspace $workspace, mixed $medianViews, mixed $medianLikes, string $postTable): string
    {
        $brand = [
            'name' => $workspace->name ?? 'Not informed',
            'industry' => $workspace->industry ?? 'Not informed',
            'target_audience' => $workspace->target_audience ?? 'Not informed',
            'tone_of_voice' => $workspace->tone_of_voice ?? 'Not informed',
            'goal' => $workspace->goal ?? 'Not informed',
        ];

        return <<<PROMPT
BRAND
{$this->brandLine($brand['name'])}
Industry: {$brand['industry']}
Target audience: {$brand['target_audience']}
Tone of voice: {$brand['tone_of_voice']}
Goal: {$brand['goal']}

MEDIANS
Median views: {$this->formatNumber($medianViews)}
Median likes: {$this->formatNumber($medianLikes)}

POSTS
{$postTable}
PROMPT;
    }

    private function brandLine(mixed $name): string
    {
        $name = trim((string) $name);

        return $name === '' ? 'Name: Not informed' : "Name: {$name}";
    }

    /**
     * @param  list<array<string, mixed>>  $posts
     */
    private function compactTable(array $posts): string
    {
        if ($posts === []) {
            return 'No posts.';
        }

        $lines = [];

        foreach ($posts as $index => $post) {
            $caption = (string) ($post['caption'] ?? '');
            $caption = mb_substr($caption, 0, 300);
            $lines[] = sprintf(
                '%d. [%s] url=%s views=%d likes=%d comments=%d shares=%d caption=%s',
                $index + 1,
                $post['platform'] ?? 'unknown',
                $post['url'] ?? 'no-url',
                (int) ($post['views'] ?? 0),
                (int) ($post['likes'] ?? 0),
                (int) ($post['comments'] ?? 0),
                (int) ($post['shares'] ?? 0),
                $caption,
            );
        }

        return implode("\n", $lines);
    }

    /**
     * @param  list<mixed>  $values
     */
    private function median(array $values): mixed
    {
        $values = array_values(array_map('intval', $values));
        sort($values);
        $count = count($values);

        if ($count === 0) {
            return 0;
        }

        $middle = intdiv($count, 2);

        return $count % 2 === 1 ? $values[$middle] : intval(round(($values[$middle - 1] + $values[$middle]) / 2));
    }

    private function formatNumber(mixed $number): string
    {
        return number_format((int) $number);
    }

    private function runWithFallback(string $systemPrompt, string $userPrompt): string
    {
        try {
            return $this->run(Provider::DeepSeek, 'deepseek-chat', $systemPrompt, $userPrompt);
        } catch (\Throwable $e) {
            \Log::warning('[ProfileAnalysis] Primary text provider failed; falling back to OpenAI', [
                'provider' => 'deepseek',
                'message' => $e->getMessage(),
            ]);

            return $this->run(Provider::OpenAI, 'gpt-4o', $systemPrompt, $userPrompt);
        }
    }

    private function run(Provider $provider, string $model, string $systemPrompt, string $userPrompt): string
    {
        return Prism::text()
            ->using($provider, $model)
            ->withSystemPrompt($systemPrompt)
            ->withPrompt($userPrompt)
            ->withClientOptions(['timeout' => 120])
            ->generate()
            ->text;
    }

    /**
     * @param  array<int, true>  $allowedUrls
     * @return array{summary: string, what_works: list<array{pattern: string, evidence: string}>, what_is_missing: list<array{gap: string, why: string}>, top_posts: list<array{url: string, why_it_worked: string}>, hooks_that_work: list<string>, next_posts: list<array{format: string, idea: string, hook: string}>, posting_frequency: string}
     */
    private function parse(string $json, array $allowedUrls): array
    {
        $json = $this->stripFences($json);
        $data = json_decode($json, true);

        if (! is_array($data)) {
            return $this->emptyReport();
        }

        $summary = $this->cleanText($data['summary'] ?? '');

        return [
            'summary' => $summary,
            'what_works' => $this->listOfObjects($data['what_works'] ?? [], ['pattern', 'evidence'], 5),
            'what_is_missing' => $this->listOfObjects($data['what_is_missing'] ?? [], ['gap', 'why'], 5),
            'top_posts' => $this->topPosts($allowedUrls, $data['top_posts'] ?? []),
            'hooks_that_work' => $this->listOfStrings($data['hooks_that_work'] ?? [], 5),
            'next_posts' => $this->nextPosts($data['next_posts'] ?? []),
            'posting_frequency' => $this->cleanText($data['posting_frequency'] ?? ''),
        ];
    }

    private function stripFences(string $json): string
    {
        $start = strpos($json, '{');
        $end = strrpos($json, '}');

        if ($start === false || $end === false || $end < $start) {
            return $json;
        }

        return substr($json, $start, $end - $start + 1);
    }

    /**
     * @param  list<string>  $keys
     * @return list<array<string, string>>
     */
    private function listOfObjects(mixed $items, array $keys, int $max): array
    {
        $result = [];

        foreach (array_slice((array) $items, 0, $max) as $item) {
            if (! is_array($item)) {
                continue;
            }

            $row = [];

            foreach ($keys as $key) {
                $row[$key] = $this->cleanText($item[$key] ?? '');
            }

            if ($row[$keys[0]] === '') {
                continue;
            }

            $result[] = $row;
        }

        return $result;
    }

    /**
     * @return list<string>
     */
    private function listOfStrings(mixed $items, int $max): array
    {
        return array_slice(array_values(array_filter(array_map(
            fn (mixed $item): string => $this->cleanText($item),
            (array) $items,
        ))), 0, $max);
    }

    /**
     * @param  array<int, true>  $allowedUrls
     * @return list<array{url: string, why_it_worked: string}>
     */
    private function topPosts(array $allowedUrls, mixed $items): array
    {
        $result = [];

        foreach ((array) $items as $item) {
            if (! is_array($item)) {
                continue;
            }

            $url = trim((string) ($item['url'] ?? ''));
            $why = $this->cleanText($item['why_it_worked'] ?? '');

            if ($url === '' || ! isset($allowedUrls[$url]) || $why === '') {
                continue;
            }

            $result[] = ['url' => $url, 'why_it_worked' => $why];

            if (count($result) >= 3) {
                break;
            }
        }

        return $result;
    }

    /**
     * @return list<array{format: string, idea: string, hook: string}>
     */
    private function nextPosts(mixed $items): array
    {
        $allowedFormats = ['carousel', 'slideshow', 'talking_video'];
        $result = [];

        foreach (array_slice((array) $items, 0, 6) as $item) {
            if (! is_array($item)) {
                continue;
            }

            $format = trim((string) ($item['format'] ?? ''));
            $idea = $this->cleanText($item['idea'] ?? '');
            $hook = $this->cleanText($item['hook'] ?? '');

            if (! in_array($format, $allowedFormats, true) || $idea === '' || $hook === '') {
                continue;
            }

            $result[] = ['format' => $format, 'idea' => $idea, 'hook' => $hook];
        }

        return $result;
    }

    private function cleanText(mixed $value): string
    {
        $text = trim((string) $value);

        return str_replace('—', '-', $text);
    }

    /**
     * @return array{summary: string, what_works: list<array{pattern: string, evidence: string}>, what_is_missing: list<array{gap: string, why: string}>, top_posts: list<array{url: string, why_it_worked: string}>, hooks_that_work: list<string>, next_posts: list<array{format: string, idea: string, hook: string}>, posting_frequency: string}
     */
    private function emptyReport(): array
    {
        return [
            'summary' => '',
            'what_works' => [],
            'what_is_missing' => [],
            'top_posts' => [],
            'hooks_that_work' => [],
            'next_posts' => [],
            'posting_frequency' => '',
        ];
    }
}
