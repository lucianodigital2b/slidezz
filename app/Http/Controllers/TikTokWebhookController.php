<?php

namespace App\Http\Controllers;

use App\Enums\ScheduleStatus;
use App\Models\Schedule;
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
        $data = $payload['data'] ?? [];

        match ($event) {
            'video.upload.status' => $this->handleVideoUploadStatus($data),
            default => Log::info('TikTok webhook: unhandled event', ['event' => $event, 'data' => $data]),
        };

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

    private function handleVideoUploadStatus(array $data): void
    {
        $publishId = $data['publish_id'] ?? null;
        $status = $data['status'] ?? null;

        if (! $publishId || ! $status) {
            return;
        }

        $schedule = Schedule::where('platform_post_id', $publishId)->first();

        if (! $schedule) {
            Log::warning('TikTok webhook: no schedule found for publish_id', ['publish_id' => $publishId]);

            return;
        }

        match ($status) {
            'UPLOAD_COMPLETE', 'PUBLISHED' => $schedule->update(['status' => ScheduleStatus::Published]),
            'UPLOAD_FAILED', 'FAILED' => $schedule->update([
                'status' => ScheduleStatus::Failed,
                'error_log' => 'TikTok reported upload failure via webhook.',
            ]),
            default => Log::info('TikTok webhook: unknown video status', ['status' => $status, 'publish_id' => $publishId]),
        };
    }
}
