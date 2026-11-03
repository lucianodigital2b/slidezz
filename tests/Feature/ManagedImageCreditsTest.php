<?php

namespace Tests\Feature;

use App\Exceptions\ImageSourceException;
use App\Models\User;
use App\Services\AI\CarouselGenerationService;
use App\Services\Images\AiImageSource;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery\MockInterface;
use Tests\TestCase;

class ManagedImageCreditsTest extends TestCase
{
    use RefreshDatabase;

    private const IMAGE = 'data:image/png;base64,iVBORw0KGgo=';

    private function premiumUser(array $attributes = []): User
    {
        $user = User::factory()->create();
        $user->forceFill(['lifetime_access_at' => now(), ...$attributes])->save();

        return $user->fresh();
    }

    public function test_without_key_an_image_spends_one_credit_on_the_platform_key(): void
    {
        $user = $this->premiumUser(['credits' => 5]);

        $this->partialMock(CarouselGenerationService::class, function (MockInterface $mock) {
            $mock->shouldReceive('generateImageWithGemini')->once()->andReturn(self::IMAGE);
            $mock->shouldNotReceive('generateImage');
        });

        $this->actingAs($user)
            ->postJson('/carousel/generate-image', ['prompt' => 'Um gato astronauta'])
            ->assertOk()
            ->assertJson(['base64' => self::IMAGE]);

        $this->assertSame(4, $user->fresh()->credits);
    }

    public function test_without_key_and_without_credits_returns_no_credits(): void
    {
        $user = $this->premiumUser(['credits' => 0]);

        $this->partialMock(CarouselGenerationService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('generateImageWithGemini');
        });

        $this->actingAs($user)
            ->postJson('/carousel/generate-image', ['prompt' => 'Um gato astronauta'])
            ->assertStatus(402)
            ->assertJson(['error' => 'no_credits']);
    }

    public function test_failed_generation_refunds_the_credit(): void
    {
        $user = $this->premiumUser(['credits' => 3]);

        $this->partialMock(CarouselGenerationService::class, function (MockInterface $mock) {
            $mock->shouldReceive('generateImageWithGemini')->once()->andThrow(new \RuntimeException('boom'));
        });

        $this->actingAs($user)
            ->postJson('/carousel/generate-image', ['prompt' => 'Um gato astronauta'])
            ->assertStatus(500);

        $this->assertSame(3, $user->fresh()->credits);
    }

    public function test_own_key_spends_no_credits(): void
    {
        $user = $this->premiumUser(['credits' => 2, 'gemini_api_key' => 'user-key']);

        $this->partialMock(CarouselGenerationService::class, function (MockInterface $mock) {
            $mock->shouldReceive('generateImage')->once()->with('Um gato astronauta', '4:5', 'user-key')->andReturn(self::IMAGE);
        });

        $this->actingAs($user)
            ->postJson('/carousel/generate-image', ['prompt' => 'Um gato astronauta', 'aspect_ratio' => '4:5'])
            ->assertOk();

        $this->assertSame(2, $user->fresh()->credits);
    }

    public function test_non_premium_user_is_still_blocked(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/carousel/generate-image', ['prompt' => 'Um gato astronauta'])
            ->assertStatus(402)
            ->assertJson(['error' => 'premium_required']);
    }

    public function test_job_image_source_meters_each_image_and_stops_when_credits_run_out(): void
    {
        $user = $this->premiumUser(['credits' => 1]);

        $carousel = $this->mock(CarouselGenerationService::class, function (MockInterface $mock) {
            $mock->shouldReceive('generateImageWithGemini')->once()->andReturn(self::IMAGE);
        });

        $source = new AiImageSource($carousel, null, $user);

        $this->expectException(ImageSourceException::class);

        try {
            $source->search('um gato', 2);
        } finally {
            $this->assertSame(0, $user->fresh()->credits);
        }
    }

    public function test_job_image_source_refunds_on_failure(): void
    {
        $user = $this->premiumUser(['credits' => 2]);

        $carousel = $this->mock(CarouselGenerationService::class, function (MockInterface $mock) {
            $mock->shouldReceive('generateImageWithGemini')->once()->andThrow(new \RuntimeException('boom'));
        });

        try {
            (new AiImageSource($carousel, null, $user))->search('um gato', 1);
            $this->fail('expected ImageSourceException');
        } catch (ImageSourceException) {
            $this->assertSame(2, $user->fresh()->credits);
        }
    }

    public function test_job_image_source_never_generates_unmetered(): void
    {
        $carousel = $this->mock(CarouselGenerationService::class, function (MockInterface $mock) {
            $mock->shouldNotReceive('generateImageWithGemini');
        });

        $this->expectException(ImageSourceException::class);

        (new AiImageSource($carousel))->search('um gato', 1);
    }
}
