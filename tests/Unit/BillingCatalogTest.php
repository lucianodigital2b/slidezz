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
        config(['plans.annual.prices.brl.price_id' => 'price_annual_brl']);

        $plans = $this->catalog->plans('brl');

        $this->assertSame(['weekly', 'monthly', 'annual'], array_keys($plans));
        $this->assertSame('R$297,90', $plans['annual']['price_label']);
        $this->assertSame('price_annual_brl', $plans['annual']['price_id']);
        $this->assertSame('R$1.174,80', $plans['annual']['compare_at']);
        $this->assertTrue($plans['annual']['highlighted']);
        $this->assertSame('brl', $plans['annual']['currency']);
        $this->assertSame('Anual', $plans['annual']['name']);
        $this->assertSame('pass', $plans['weekly']['mode']);
        $this->assertNull($plans['weekly']['compare_at']);
        $this->assertNotEmpty($plans['monthly']['features']);
    }

    public function test_plans_text_follows_the_currency_language(): void
    {
        $plans = $this->catalog->plans('usd');

        $this->assertSame('Weekly', $plans['weekly']['name']);
        $this->assertSame('$9.90', $plans['weekly']['price_label']);
        $this->assertSame('50 AI images per month', $plans['monthly']['credits_note']);
    }

    public function test_packs_are_flattened_for_the_given_currency(): void
    {
        config(['credits.packs' => [
            ['key' => 'pack_30', 'credits' => 30, 'label' => 'Basic Pack', 'price' => ['usd' => '$39', 'brl' => 'R$199'], 'badge' => 'MAIS POPULAR'],
            ['key' => 'pack_10', 'credits' => 10, 'label' => 'Starter Pack', 'price' => ['usd' => '$15', 'brl' => 'R$79']],
        ]]);

        $packs = $this->catalog->packs('brl');

        $this->assertCount(2, $packs);
        $this->assertSame('pack_30', $packs[0]['key']);
        $this->assertSame('R$199', $packs[0]['price']);
        $this->assertSame('MAIS POPULAR', $packs[0]['badge']);
        $this->assertNull($packs[1]['badge']);
    }

    public function test_price_id_resolves_by_plan_and_currency(): void
    {
        config(['plans.annual.prices.usd.price_id' => 'price_annual_usd']);

        $this->assertSame('price_annual_usd', $this->catalog->priceId('annual', 'usd'));
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
        config(['plans.monthly.prices.usd.price_id' => 'price_monthly_usd']);

        $this->assertSame('price_monthly_usd', $this->catalog->priceId('monthly', 'eur'));
    }
}
