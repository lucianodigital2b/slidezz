<?php

namespace Tests\Feature;

use App\Models\ContentProject;
use App\Models\PostAnalytic;
use App\Models\Schedule;
use App\Models\SocialAccount;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\LaravelPdf\Facades\Pdf;
use Tests\TestCase;

class ReportControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_is_redirected(): void
    {
        $this->get('/reports')->assertRedirect('/login');
    }

    public function test_reports_page_renders(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get('/reports')
            ->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('Reports')
                ->has('report.summary.current')
                ->has('report.comparison')
                ->has('report.platforms.instagram')
                ->has('report.platforms.tiktok')
                ->has('config.instagram.sort')
                ->has('brand.name')
            );
    }

    public function test_summary_aggregates_only_posts_in_the_period(): void
    {
        $user = User::factory()->create();

        $this->publishedPostWithStats($user, 'instagram', now()->subDays(5), ['views' => 1000, 'likes' => 100, 'comments' => 10, 'shares' => 5]);
        // Outside the 30-day window: must not count.
        $this->publishedPostWithStats($user, 'instagram', now()->subDays(45), ['views' => 9999]);

        $this->actingAs($user)
            ->get('/reports?period=30')
            ->assertInertia(fn ($page) => $page
                ->where('report.summary.current.views', 1000)
                ->where('report.summary.current.likes', 100)
                ->where('report.summary.current.posts', 1)
                ->where('report.platforms.instagram.totals.views', 1000)
                ->where('report.platforms.instagram.posts', fn ($posts) => count($posts) === 1)
            );
    }

    public function test_delta_compares_to_the_previous_period(): void
    {
        $user = User::factory()->create();

        $this->publishedPostWithStats($user, 'instagram', now()->subDays(5), ['views' => 200]);
        $this->publishedPostWithStats($user, 'instagram', now()->subDays(45), ['views' => 100]);

        $this->actingAs($user)
            ->get('/reports?period=30')
            ->assertInertia(fn ($page) => $page
                ->where('report.summary.current.views', 200)
                ->where('report.summary.deltas.views', 100)
            );
    }

    public function test_tiktok_and_instagram_totals_are_separated_by_platform(): void
    {
        $user = User::factory()->create();

        $this->publishedPostWithStats($user, 'instagram', now()->subDays(3), ['views' => 500]);
        $this->publishedPostWithStats($user, 'tiktok', now()->subDays(3), ['views' => 800]);

        $this->actingAs($user)
            ->get('/reports?period=30')
            ->assertInertia(fn ($page) => $page
                ->where('report.platforms.instagram.totals.views', 500)
                ->where('report.platforms.tiktok.totals.views', 800)
                ->where('report.summary.current.views', 1300)
            );
    }

    public function test_other_users_posts_are_excluded(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $this->publishedPostWithStats($other, 'instagram', now()->subDays(5), ['views' => 7777]);

        $this->actingAs($user)
            ->get('/reports')
            ->assertInertia(fn ($page) => $page
                ->where('report.summary.current.views', 0)
                ->where('report.summary.current.posts', 0)
            );
    }

    public function test_pdf_route_renders_the_report_view(): void
    {
        Pdf::fake();

        $user = User::factory()->create();
        $this->publishedPostWithStats($user, 'instagram', now()->subDays(5), ['views' => 1000]);

        $this->actingAs($user)
            ->get('/reports/pdf?period=30')
            ->assertOk();

        Pdf::assertRespondedWithPdf(fn ($pdf) => $pdf->viewName === 'reports.pdf');
    }

    /**
     * @param  array<string, int>  $stats
     */
    private function publishedPostWithStats(User $user, string $provider, \DateTimeInterface $publishAt, array $stats): void
    {
        $workspace = Workspace::factory()->create(['owner_id' => $user->id]);
        $account = SocialAccount::factory()->create(['workspace_id' => $workspace->id, 'provider' => $provider]);
        $project = ContentProject::factory()->create(['workspace_id' => $workspace->id]);

        $schedule = Schedule::factory()->published()->create([
            'social_account_id' => $account->id,
            'content_project_id' => $project->id,
            'publish_at' => $publishAt,
        ]);

        PostAnalytic::factory()->create(array_merge([
            'schedule_id' => $schedule->id,
            'views' => 0,
            'likes' => 0,
            'comments' => 0,
            'shares' => 0,
            'bookmarks' => 0,
        ], $stats));
    }
}
