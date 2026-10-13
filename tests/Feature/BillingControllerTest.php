<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_billing_page_requires_authentication(): void
    {
        $this->get(route('billing.edit'))->assertRedirect(route('login'));
    }

    public function test_authenticated_user_can_view_billing_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('billing.edit'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('settings/billing')
                ->has('plans')
                ->has('subscription')
                ->has('invoices')
                ->has('stripe_key')
            );
    }

    public function test_billing_page_shows_no_subscription_when_user_has_none(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('billing.edit'))
            ->assertInertia(fn ($page) => $page
                ->where('subscription', null)
            );
    }

    public function test_subscribe_requires_authentication(): void
    {
        $this->post(route('billing.subscribe'), ['plan' => 'pro'])
            ->assertRedirect(route('login'));
    }

    public function test_subscribe_validates_plan(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('billing.subscribe'), ['plan' => 'invalid_plan'])
            ->assertSessionHasErrors('plan');
    }

    public function test_cancel_requires_authentication(): void
    {
        $this->post(route('billing.cancel'))->assertRedirect(route('login'));
    }

    public function test_resume_requires_authentication(): void
    {
        $this->post(route('billing.resume'))->assertRedirect(route('login'));
    }

    public function test_portal_requires_authentication(): void
    {
        $this->get(route('billing.portal'))->assertRedirect(route('login'));
    }

    public function test_plans_config_is_present_in_billing_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('billing.edit'))
            ->assertInertia(fn ($page) => $page
                ->has('plans.starter')
                ->has('plans.pro')
                ->where('plans.pro.name', 'Pro')
                ->where('plans.starter.name', 'Starter')
                // Plans are flattened per currency by BillingCatalog.
                ->where('plans.pro.currency', 'usd')
                ->has('plans.pro.price_label')
                ->has('plans.pro.monthly.price_id')
            );
    }

    public function test_invoice_download_requires_authentication(): void
    {
        $this->get(route('billing.invoice.download', 'in_test123'))
            ->assertRedirect(route('login'));
    }
}
