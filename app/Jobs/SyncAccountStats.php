<?php

namespace App\Jobs;

use App\Models\AccountPost;
use App\Models\AccountSnapshot;
use App\Models\SocialAccount;
use App\Services\Social\AccountStatsFetcher;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class SyncAccountStats implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public SocialAccount $account) {}

    public function handle(AccountStatsFetcher $fetcher): void
    {
        if ($this->account->needs_reconnect) {
            Log::info('[SyncAccountStats] Skipping account with needs_reconnect', [
                'account_id' => $this->account->id,
            ]);

            return;
        }

        try {
            $result = $fetcher->fetch($this->account);

            AccountSnapshot::updateOrCreate(
                [
                    'social_account_id' => $this->account->id,
                    'snapshot_date' => today()->toDateString(),
                ],
                [
                    'followers' => $result['profile']['followers'],
                    'following' => $result['profile']['following'],
                    'posts_count' => $result['profile']['posts_count'],
                    'total_likes' => $result['profile']['total_likes'],
                ]
            );

            $now = now();
            $posts = array_map(function (array $post) use ($now): array {
                return [
                    'social_account_id' => $this->account->id,
                    'platform_post_id' => $post['platform_post_id'],
                    'media_type' => $post['media_type'],
                    'caption' => $post['caption'],
                    'permalink' => $post['permalink'],
                    'thumbnail_url' => $post['thumbnail_url'],
                    // APIs return ISO 8601 with offsets; MySQL wants a plain UTC datetime.
                    'posted_at' => $post['posted_at'] ? Carbon::parse($post['posted_at'])->utc()->toDateTimeString() : null,
                    'views' => $post['views'],
                    'likes' => $post['likes'],
                    'comments' => $post['comments'],
                    'shares' => $post['shares'],
                    'saves' => $post['saves'],
                    'last_synced_at' => $now,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }, $result['posts']);

            if ($posts !== []) {
                AccountPost::upsert($posts, ['social_account_id', 'platform_post_id'], [
                    'media_type',
                    'caption',
                    'permalink',
                    'thumbnail_url',
                    'posted_at',
                    'views',
                    'likes',
                    'comments',
                    'shares',
                    'saves',
                    'last_synced_at',
                    'updated_at',
                ]);
            }
        } catch (\Throwable $e) {
            Log::warning('[SyncAccountStats] Failed to sync account stats', [
                'account_id' => $this->account->id,
                'provider' => $this->account->provider,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
