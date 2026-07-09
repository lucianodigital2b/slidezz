<?php

namespace App\Http\Controllers;

use App\Jobs\SyncPostAnalytics;
use App\Models\Schedule;
use App\Models\SocialAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

/**
 * Meta / Instagram Graph API webhook.
 *
 * A single endpoint serves every connected Instagram account across every
 * workspace: each delivery carries the Instagram account id (`entry.id`), which
 * we resolve to the exact {@see SocialAccount} (and therefore its workspace) via
 * {@see SocialAccount::locate()}. Another network later follows the same shape
 * (see {@see TikTokWebhookController}) — a sibling controller + routes, reusing
 * the same provider/provider_id routing.
 */
class InstagramWebhookController extends Controller
{
    /**
     * Subscription verification handshake: echo `hub.challenge` back when the
     * verify token matches. Meta sends this once when the webhook is registered.
     */
    public function verify(Request $request): Response
    {
        // PHP's parse_str turns dots into underscores, so read the raw query string.
        $params = $this->parseRawQuery($request->server('QUERY_STRING', ''));

        $expected = config('services.instagram.webhook_verify_token');

        $matches = $expected
            && ($params['hub.mode'] ?? '') === 'subscribe'
            && hash_equals((string) $expected, (string) ($params['hub.verify_token'] ?? ''));

        return $matches
            ? response($params['hub.challenge'] ?? '')
            : response('Forbidden', 403);
    }

    /**
     * Event delivery: verify the signature, then fan each entry out to the
     * workspace/account it belongs to.
     */
    public function handle(Request $request): JsonResponse
    {
        if (! $this->verifySignature($request)) {
            return response()->json(['message' => 'Invalid signature.'], 401);
        }

        $payload = $request->json()->all();

        if (($payload['object'] ?? null) !== 'instagram') {
            Log::info('Instagram webhook: ignored object', ['object' => $payload['object'] ?? null]);

            return response()->json(['message' => 'Ignored']);
        }

        foreach ($payload['entry'] ?? [] as $entry) {
            $this->handleEntry(is_array($entry) ? $entry : []);
        }

        return response()->json(['message' => 'OK']);
    }

    /**
     * Route one entry to the Instagram account (and workspace) that owns it.
     *
     * @param  array<string, mixed>  $entry
     */
    private function handleEntry(array $entry): void
    {
        $igAccountId = (string) ($entry['id'] ?? '');
        $account = $igAccountId !== '' ? SocialAccount::locate('instagram', $igAccountId) : null;

        if (! $account) {
            Log::warning('Instagram webhook: no connected account', ['ig_account_id' => $igAccountId]);

            return;
        }

        foreach ($entry['changes'] ?? [] as $change) {
            if (is_array($change)) {
                $this->handleChange($account, (string) ($change['field'] ?? ''), (array) ($change['value'] ?? []));
            }
        }
    }

    /**
     * Dispatch a single field change. New per-field handling (comments, mentions,
     * story_insights, ...) is added here without touching the routing above.
     *
     * @param  array<string, mixed>  $value
     */
    private function handleChange(SocialAccount $account, string $field, array $value): void
    {
        $context = [
            'workspace_id' => $account->workspace_id,
            'social_account_id' => $account->id,
            'handle' => $account->handle,
        ];

        match ($field) {
            'comments' => $this->handleComment($account, $value, $context),
            'mentions' => Log::info('Instagram webhook: mention', $context + ['value' => $value]),
            default => Log::info('Instagram webhook: unhandled field', $context + ['field' => $field]),
        };
    }

    /**
     * A new comment changes a post's engagement, so refresh that post's analytics
     * when the comment maps to one of this account's published schedules.
     *
     * @param  array<string, mixed>  $value
     * @param  array<string, mixed>  $context
     */
    private function handleComment(SocialAccount $account, array $value, array $context): void
    {
        $mediaId = (string) data_get($value, 'media.id', '');

        $schedule = $mediaId !== ''
            ? Schedule::where('social_account_id', $account->id)
                ->where('platform_post_id', $mediaId)
                ->first()
            : null;

        Log::info('Instagram webhook: comment', $context + [
            'comment_id' => data_get($value, 'id'),
            'media_id' => $mediaId,
            'schedule_id' => $schedule?->id,
        ]);

        if ($schedule) {
            SyncPostAnalytics::dispatch($schedule);
        }
    }

    /**
     * Instagram signs the raw request body with the Meta app secret
     * (`client_secret`) as `X-Hub-Signature-256: sha256=<hmac>`.
     */
    private function verifySignature(Request $request): bool
    {
        $secret = config('services.instagram.client_secret');

        if (! $secret) {
            return true;
        }

        $signature = $request->header('X-Hub-Signature-256');

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
}
