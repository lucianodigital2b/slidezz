<?php

namespace App\Services\Billing;

use Illuminate\Http\Request;
use Stevebauman\Location\Facades\Location;

/**
 * Resolves the customer's billing currency (BRL for Brazil, USD otherwise) and
 * maps plans / credit packs to the matching Stripe Price ids. Centralizes the
 * currency logic shared by the onboarding, billing settings and credit flows.
 */
class BillingCatalog
{
    public const DEFAULT_CURRENCY = 'usd';

    public const SUPPORTED_CURRENCIES = ['usd', 'brl'];

    /**
     * Resolve the currency from the request's country (Cloudflare header first,
     * then IP geolocation). Brazil pays in BRL; everyone else in USD.
     */
    public function currencyFor(Request $request): string
    {
        if ($request->hasSession() && ($cached = $request->session()->get('billing_currency'))) {
            return $this->normalize($cached);
        }

        $country = $request->header('CF-IPCountry');

        if (! $country) {
            try {
                $country = Location::get($request->ip())?->countryCode;
            } catch (\Throwable) {
                $country = null;
            }
        }

        $currency = $country === 'BR' ? 'brl' : self::DEFAULT_CURRENCY;

        if ($request->hasSession()) {
            $request->session()->put('billing_currency', $currency);
        }

        return $currency;
    }

    /**
     * The display language for a currency: BRL → pt, USD → en.
     */
    public function locale(string $currency): string
    {
        return $this->normalize($currency) === 'brl' ? 'pt' : 'en';
    }

    /**
     * Plans flattened for one currency, keyed by plan key (weekly, monthly,
     * annual), with the localized display text and the currency's price.
     *
     * @return array<string, array<string, mixed>>
     */
    public function plans(string $currency): array
    {
        $currency = $this->normalize($currency);
        $locale = $this->locale($currency);

        return collect(config('plans'))
            ->map(function (array $plan, string $key) use ($currency, $locale): array {
                $price = $plan['prices'][$currency] ?? [];

                return [
                    'key' => $key,
                    'name' => $plan['name'][$locale] ?? $key,
                    'mode' => $plan['mode'] ?? 'subscription',
                    'billing_note' => $plan['billing_note'][$locale] ?? null,
                    'per_day' => $plan['per_day'][$currency] ?? null,
                    'credits_note' => $plan['credits_note'][$locale] ?? null,
                    'credits_per_cycle' => (int) ($plan['credits_per_cycle'] ?? 0),
                    'features' => $plan['features'][$locale] ?? [],
                    'currency' => $currency,
                    'price_label' => $price['price_label'] ?? null,
                    'price_id' => $price['price_id'] ?? null,
                    'compare_at' => $price['compare_at'] ?? null,
                    'save' => $price['save'] ?? null,
                    'highlighted' => (bool) ($plan['highlighted'] ?? false),
                ];
            })
            ->toArray();
    }

    /**
     * Credit packs flattened for one currency, in the shape the credits modal expects.
     *
     * @return list<array<string, mixed>>
     */
    public function packs(string $currency): array
    {
        $currency = $this->normalize($currency);

        return collect(config('credits.packs'))
            ->map(fn (array $pack): array => [
                'key' => $pack['key'],
                'credits' => $pack['credits'],
                'label' => $pack['label'],
                'price' => $pack['price'][$currency] ?? null,
                'badge' => $pack['badge'] ?? null,
            ])
            ->values()
            ->toArray();
    }

    /**
     * The launch-offer lifetime deal for one currency (one-time payment).
     *
     * @return array{price_label: string|null, price_id: string|null}
     */
    public function lifetime(string $currency): array
    {
        $prices = config('lifetime.prices.'.$this->normalize($currency), []);

        return [
            'price_label' => $prices['price_label'] ?? null,
            'price_id' => $prices['price_id'] ?? null,
        ];
    }

    public function priceId(string $plan, string $currency): ?string
    {
        return config("plans.{$plan}.prices.{$this->normalize($currency)}.price_id");
    }

    public function creditPackPriceId(string $packKey, string $currency): ?string
    {
        $pack = collect(config('credits.packs'))->firstWhere('key', $packKey);

        return $pack['price_id'][$this->normalize($currency)] ?? null;
    }

    private function normalize(string $currency): string
    {
        $currency = strtolower($currency);

        return in_array($currency, self::SUPPORTED_CURRENCIES, true)
            ? $currency
            : self::DEFAULT_CURRENCY;
    }
}
