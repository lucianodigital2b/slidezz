<?php

namespace App\Jobs;

use App\Models\ProfileAnalysis;
use App\Services\AI\ProfileAnalysisService;
use App\Services\Profile\ProfilePostCollector;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class AnalyzeProfile implements ShouldQueue
{
    use Queueable;

    public int $timeout = 600;

    public int $tries = 1;

    public function __construct(public ProfileAnalysis $analysis) {}

    public function handle(ProfilePostCollector $collector, ProfileAnalysisService $analyzer): void
    {
        $analysis = $this->analysis;
        $workspace = $analysis->workspace;

        try {
            $analysis->update(['status' => 'running']);

            $posts = $collector->collect($workspace, $analysis->links ?? []);

            if ($posts === []) {
                throw new RuntimeException('Não encontrei nenhum post. Cole links de posts públicos ou conecte uma conta.');
            }

            $language = $analysis->language === 'pt' ? 'Portuguese (Brazil)' : 'English';
            $report = $analyzer->analyze($posts, $workspace, $language);

            $analysis->update([
                'status' => 'done',
                'posts' => $posts,
                'report' => $report,
                'error' => null,
                'completed_at' => now(),
            ]);

            $profile = $workspace->profile ?? [];
            $profile['analysis'] = [
                'summary' => $report['summary'],
                'hooks_that_work' => $report['hooks_that_work'],
                'what_works' => array_column($report['what_works'], 'pattern'),
                'analyzed_at' => now()->toISOString(),
            ];
            $workspace->update(['profile' => $profile]);
        } catch (\Throwable $e) {
            $this->markFailed($e);

            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        if ($this->analysis->fresh()?->status === 'running') {
            $this->markFailed($exception);
        }
    }

    private function markFailed(\Throwable $exception): void
    {
        Log::error('[ProfileAnalysis] Job failed', [
            'profile_analysis_id' => $this->analysis->id,
            'message' => $exception->getMessage(),
            'class' => $exception::class,
        ]);

        $this->analysis->update([
            'status' => 'failed',
            'error' => $exception->getMessage(),
        ]);
    }
}
