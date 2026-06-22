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
        $country = $request->header('CF-IPCountry');

        if (! $country) {
            try {
                $country = Location::get($request->ip())?->countryCode;
            } catch (\Throwable) {
                $country = null;
            }
        }

        return $country === 'BR' ? 'brl' : self::DEFAULT_CURRENCY;
    }

    /**
     * Plans flattened for one currency, in the shape the frontends expect:
     * a top-level monthly price (used by onboarding) plus monthly/annual
     * sub-objects (used by the billing settings cycle toggle).
     *
     * @return array<string, array<string, mixed>>
     */
    public function plans(string $currency): array
    {
        $currency = $this->normalize($currency);

        return collect(config('plans'))
            ->map(function (array $plan) use ($currency): array {
                $prices = $plan['prices'][$currency] ?? [];

                return [
                    'name' => $plan['name'],
                    'description' => $plan['description'],
                    'credits_per_cycle' => $plan['credits_per_cycle'],
                    'features' => $plan['features'],
                    'currency' => $currency,
                    'price_label' => $prices['monthly']['price_label'] ?? null,
                    'price_id' => $prices['monthly']['price_id'] ?? null,
                    'monthly' => $prices['monthly'] ?? null,
                    'annual' => $prices['annual'] ?? null,
                ];
            })
            ->toArray();
    }

    public function subscriptionPriceId(string $plan, string $cycle, string $currency): ?string
    {
        return config("plans.{$plan}.prices.{$this->normalize($currency)}.{$cycle}.price_id");
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
