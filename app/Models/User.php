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

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token', 'gemini_api_key'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use Billable, HasFactory, Notifiable, TwoFactorAuthenticatable;

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
            // Stored encrypted at rest; the user pastes their own Gemini key for
            // BYOK image generation. Never exposed (see Hidden above).
            'gemini_api_key' => 'encrypted',
        ];
    }

    public function hasCompletedOnboarding(): bool
    {
        return $this->onboarding_completed_at !== null;
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

        return $ids->contains($this->id);
    }

    /**
     * The plan key ('starter', 'pro', 'agency') of the user's active subscription,
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
     * Whether the user may run the AI generator: lifetime purchase or any
     * active subscription. Signup is free (soft paywall) — only generation
     * is gated.
     */
    public function hasPremiumAccess(): bool
    {
        return $this->hasLifetimeAccess() || $this->activePlanKey() !== null;
    }

    /**
     * Whether the user may bring their own Gemini key. LAUNCH OFFER: images
     * are BYOK-only for everyone, so this always returns true. When managed
     * credits come back, restore the plan gate via config plans.*.byok_enabled.
     */
    public function byokEnabled(): bool
    {
        return true;
    }

    /**
     * The Gemini API key to use for image generation, or null when the user
     * has not connected one yet (image generation is unavailable then).
     */
    public function byokGeminiKey(): ?string
    {
        $key = $this->gemini_api_key;

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

    public function workspaces()
    {
        return $this->hasMany(Workspace::class, 'owner_id');
    }
}
