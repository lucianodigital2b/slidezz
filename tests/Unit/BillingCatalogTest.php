<?php

namespace Tests\Unit;

use App\Services\Billing\BillingCatalog;
use Illuminate\Http\Request;
use Tests\TestCase;

class BillingCatalogTest extends TestCase
{
    private BillingCatalog $catalog;

    protected function setUp(): void
    {
        parent::setUp();
        $this->catalog = new BillingCatalog;
    }

    private function requestFromCountry(?string $country): Request
    {
        $server = $country ? ['HTTP_CF_IPCOUNTRY' => $country] : [];

        return Request::create('/', 'GET', server: $server);
    }

    public function test_brazil_resolves_to_brl(): void
    {
        $this->assertEquals('brl', $this->catalog->currencyFor($this->requestFromCountry('BR')));
    }

    public function test_other_countries_resolve_to_usd(): void
    {
        $this->assertEquals('usd', $this->catalog->currencyFor($this->requestFromCountry('US')));
        $this->assertEquals('usd', $this->catalog->currencyFor($this->requestFromCountry('PT')));
    }

    public function test_plans_are_flattened_for_the_given_currency(): void
    {
        config([
            'plans.pro.prices.brl.monthly' => ['price_label' => 'R$649/mês', 'price_id' => 'price_pro_brl_m'],
            'plans.pro.prices.brl.annual' => ['price_label' => 'R$389/mês', 'price_id' => 'price_pro_brl_a'],
        ]);

        $plans = $this->catalog->plans('brl');

        $this->assertSame('R$649/mês', $plans['pro']['price_label']);
        $this->assertSame('price_pro_brl_m', $plans['pro']['price_id']);
        $this->assertSame('brl', $plans['pro']['currency']);
        $this->assertSame('price_pro_brl_a', $plans['pro']['annual']['price_id']);
        $this->assertArrayHasKey('features', $plans['pro']);
    }

    public function test_subscription_price_id_resolves_by_plan_cycle_and_currency(): void
    {
        config(['plans.starter.prices.usd.annual.price_id' => 'price_starter_usd_a']);

        $this->assertSame('price_starter_usd_a', $this->catalog->subscriptionPriceId('starter', 'annual', 'usd'));
    }

    public function test_credit_pack_price_id_resolves_by_currency(): void
    {
        config(['credits.packs' => [
            ['key' => 'pack_30', 'credits' => 30, 'price_id' => ['usd' => 'price_usd_30', 'brl' => 'price_brl_30']],
        ]]);

        $this->assertSame('price_brl_30', $this->catalog->creditPackPriceId('pack_30', 'brl'));
        $this->assertSame('price_usd_30', $this->catalog->creditPackPriceId('pack_30', 'usd'));
        $this->assertNull($this->catalog->creditPackPriceId('pack_inexistente', 'usd'));
    }

    public function test_unknown_currency_falls_back_to_usd(): void
    {
        config(['plans.pro.prices.usd.monthly.price_id' => 'price_pro_usd_m']);

        $this->assertSame('price_pro_usd_m', $this->catalog->subscriptionPriceId('pro', 'monthly', 'eur'));
    }
}
