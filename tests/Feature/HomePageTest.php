<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HomePageTest extends TestCase
{
    public function test_home_page_loads_without_external_nasa_calls(): void
    {
        Http::fake();

        $this->get('/')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Home')
                ->missing('earthImage')
                ->missing('earthImageError')
                ->missing('NASA_API_KEY')
                ->missing('nasaApiKey')
            );

        Http::assertNothingSent();
    }
}
