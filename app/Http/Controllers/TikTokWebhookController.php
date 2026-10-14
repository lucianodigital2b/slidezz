<?php

namespace App\Http\Controllers;

use App\Enums\ScheduleStatus;
use App\Jobs\SyncPostAnalytics;
use App\Models\Schedule;
use App\Services\Social\TikTokPublisher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class TikTokWebhookController extends Controller
{
    public function verify(Request $request): Response
    {
        // PHP's parse_str converts dots in keys to underscores, so parse the raw query string manually.
        $challenge = $this->parseRawQuery($request->server('QUERY_STRING', ''))['hub.challenge'] ?? '';

        return response($challenge);
    }

    public function handle(Request $request): JsonResponse
    {
        if (! $this->verifySignature($request)) {
            return response()->json(['message' => 'Invalid signature.'], 401);
        }

        $payload = $request->json()->all();
        $event = $payload['event'] ?? null;
        // TikTok sends `content` as a JSON-encoded string.
        $content = is_string($payload['content'] ?? null)
            ? (array) json_decode($payload['content'], true)
            : (array) ($payload['content'] ?? []);

        match ($event) {
            'post.publish.inbox_delivered', 'post.publish.complete', 'post.publish.publicly_available' => $this->settle($content, ScheduleStatus::Published),
            'post.publish.failed' => $this->settle($content, ScheduleStatus::Failed),
            default => Log::info('TikTok webhook: unhandled event', ['event' => $event, 'content' => $content]),
        };

        if ($event === 'post.publish.publicly_available') {
            $this->linkPublicPost($content);
        }

        return response()->json(['message' => 'OK']);
    }

    /**
     * @return array<string, string>
     */
    private function parseRawQuery(string $query): array
    {
        $params = [];

        foreach (explode('&', $query) as $pair) {
            if ($pair === '') {
                continue;
            }
            [$key, $value] = array_pad(explode('=', $pair, 2), 2, '');
            $params[urldecode($key)] = urldecode($value);
        }

        return $params;
    }

    private function verifySignature(Request $request): bool
    {
        $secret = config('services.tiktok.webhook_secret');

        if (! $secret) {
            return true;
        }

        $signature = $request->header('X-TikTok-Signature');

        if (! $signature) {
            return false;
        }

        if (str_starts_with($signature, 'sha256=')) {
            $signature = substr($signature, 7);
        }

        $expected = hash_hmac('sha256', $request->getContent(), $secret);

        return hash_equals($expected, $signature);
    }

    /**
     * Settle a schedule still waiting on TikTok, the same way the status check
     * (CheckTikTokPublishStatus) does; whichever arrives first wins.
     *
     * @see https://developers.tiktok.com/doc/content-posting-api-reference-webhooks
     *
     * @param  array<string, mixed>  $content
     */
    private function settle(array $content, ScheduleStatus $status): void
    {
        $publishId = $content['publish_id'] ?? null;

        if (! $publishId) {
            return;
        }

        $schedule = Schedule::where('platform_post_id', $publishId)
            ->where('status', ScheduleStatus::Publishing)
            ->first();

        if (! $schedule) {
            return;
        }

        $schedule->update($status === ScheduleStatus::Failed
            ? ['status' => $status, 'error_log' => app(TikTokPublisher::class)->describeFailure((string) ($content['reason'] ?? ''))]
            : ['status' => $status, 'error_log' => null]);
    }

    /**
     * The creator posted the draft publicly: keep the id of the posted video,
     * which its stats are read from, and read them right away. The status
     * check (TikTokPublisher::publicPostId) finds it too when this never comes.
     *
     * @param  array<string, mixed>  $content
     */
    private function linkPublicPost(array $content): void
    {
        $publishId = $content['publish_id'] ?? null;
        $postId = $content['post_id'] ?? null;

        if (! $publishId || ! $postId) {
            return;
        }

        $schedule = Schedule::where('platform_post_id', $publishId)
            ->whereNull('public_post_id')
            ->first();

        if (! $schedule) {
            return;
        }

        $schedule->update(['public_post_id' => (string) $postId]);

        SyncPostAnalytics::dispatch($schedule);
    }
}
