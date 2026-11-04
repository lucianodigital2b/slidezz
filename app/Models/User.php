<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Cashier\Billable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'locale'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token', 'gemini_api_key', 'anthropic_api_key'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use Billable, HasApiTokens, HasFactory, Notifiable, TwoFactorAuthenticatable;

    /** Managed AI-image credits granted once with the lifetime launch deal. */
    public const LIFETIME_WELCOME_CREDITS = 100;

    /** Dashboard languages a user can pick in settings (same codes as resources/js/i18n.ts). */
    public const LOCALES = ['pt', 'en'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'onboarding_completed_at' => 'datetime',
            'welcome_shown_at' => 'datetime',
            'trial_ends_at' => 'datetime',
            'lifetime_access_at' => 'datetime',
            'pass_expires_at' => 'datetime',
            'credits_refreshed_at' => 'datetime',
            'can_post' => 'boolean',
            // Stored encrypted at rest; the user pastes their own Gemini key for
            // BYOK image generation. Never exposed (see Hidden above).
            'gemini_api_key' => 'encrypted',
            // Stored encrypted at rest; the user pastes their own Anthropic key for
            // BYOK agent turns. Never exposed (see Hidden above).
            'anthropic_api_key' => 'encrypted',
        ];
    }

    public function hasCompletedOnboarding(): bool
    {
        return $this->onboarding_completed_at !== null;
    }

    /**
     * Whether the user may post to social networks (connect accounts, send
     * TikTok drafts, publish to Instagram, schedule, automations, analytics,
     * API/MCP posts). Off by default while the TikTok and Meta app reviews are
     * pending; set per user (`can_post`) by an admin. See EnsureCanPost.
     */
    public function canPost(): bool
    {
        return (bool) $this->can_post;
    }

    /**
     * Whether the user is allowed to see and use the Instagram integration.
     *
     * Gated behind INSTAGRAM_FEATURE_USER_IDS while the integration is in Meta
     * App Review: only the listed user IDs (e.g. Meta reviewers) get access.
     */
    public function canUseInstagram(): bool
    {
        $ids = collect(explode(',', (string) config('services.instagram.feature_user_ids')))
            ->map(fn (string $id): string => trim($id))
            ->filter()
            ->map(fn (string $id): int => (int) $id);

        return $this->canPost() && $ids->contains($this->id);
    }

    /**
     * The plan key ('monthly', 'annual') of the user's active subscription,
     * or null when there is no active/trialing subscription.
     */
    public function activePlanKey(): ?string
    {
        return $this->subscriptions()->active()->value('type');
    }

    /**
     * Whether the user bought the launch-offer lifetime deal (one-time payment).
     */
    public function hasLifetimeAccess(): bool
    {
        return $this->lifetime_access_at !== null;
    }

    /**
     * Whether the user holds an unexpired weekly pass (one-time payment).
     */
    public function hasActivePass(): bool
    {
        return $this->pass_expires_at?->isFuture() ?? false;
    }

    /**
     * Whether the user may run the AI generator: lifetime purchase, an active
     * subscription or an unexpired weekly pass. Signup is free (soft paywall),
     * only generation is gated.
     */
    public function hasPremiumAccess(): bool
    {
        return $this->hasLifetimeAccess() || $this->activePlanKey() !== null || $this->hasActivePass();
    }

    /**
     * Whether the user may bring their own Gemini key. BYOK is optional on every
     * plan: with a key, images are unlimited and spend no credits; without one,
     * each AI image spends 1 managed credit on the platform key.
     */
    public function byokEnabled(): bool
    {
        return true;
    }

    /**
     * The Gemini API key to use for image generation, or null when the user
     * has not connected one yet (managed credits are spent then).
     */
    public function byokGeminiKey(): ?string
    {
        $key = $this->gemini_api_key;

        return is_string($key) && $key !== '' ? $key : null;
    }

    /**
     * The Anthropic API key to use for agent turns, or null when the user
     * has not connected one yet (platform key + credits are used then).
     */
    public function byokAnthropicKey(): ?string
    {
        $key = $this->anthropic_api_key;

        return is_string($key) && $key !== '' ? $key : null;
    }

    public function hasCredits(): bool
    {
        return $this->credits > 0;
    }

    public function deductCredit(): bool
    {
        return (bool) static::where('id', $this->id)
            ->where('credits', '>', 0)
            ->decrement('credits');
    }

    public function addCredits(int $amount): void
    {
        static::where('id', $this->id)->increment('credits', $amount);
        $this->refresh();
    }

    /**
     * One-time managed image credits for the lifetime launch deal.
     */
    public function grantLifetimeCredits(): void
    {
        $this->addCredits(self::LIFETIME_WELCOME_CREDITS);
    }

    public function workspaces()
    {
        return $this->hasMany(Workspace::class, 'owner_id');
    }
}
