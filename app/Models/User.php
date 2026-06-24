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
     * The plan key ('starter', 'pro', 'agency') of the user's active subscription,
     * or null when there is no active/trialing subscription.
     */
    public function activePlanKey(): ?string
    {
        return $this->subscriptions()->active()->value('type');
    }

    /**
     * Whether the user's current plan allows bring-your-own Gemini key.
     */
    public function byokEnabled(): bool
    {
        $plan = $this->activePlanKey();

        return $plan !== null && (bool) config("plans.{$plan}.byok_enabled", false);
    }

    /**
     * The Gemini API key to use for image generation: the user's own key when
     * BYOK is allowed on their plan and a key is set, otherwise null (managed —
     * the platform key is used).
     */
    public function byokGeminiKey(): ?string
    {
        if (! $this->byokEnabled()) {
            return null;
        }

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
