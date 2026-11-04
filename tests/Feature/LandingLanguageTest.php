<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LandingLanguageTest extends TestCase
{
    use RefreshDatabase;

    public function test_portuguese_browser_is_sent_to_the_pt_landing(): void
    {
        $this->get(route('home'), ['Accept-Language' => 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'])
            ->assertRedirect(route('home.br'));
    }

    public function test_english_browser_stays_on_the_english_landing(): void
    {
        $this->get(route('home'), ['Accept-Language' => 'en-US,en;q=0.9,pt;q=0.5'])
            ->assertOk();
    }

    public function test_request_without_language_stays_on_the_english_landing(): void
    {
        $this->get(route('home'))->assertOk();
    }

    public function test_pt_landing_never_redirects(): void
    {
        $this->get(route('home.br'), ['Accept-Language' => 'en-US'])->assertOk();
    }
}
