<?php

namespace Tests\Feature;

use Tests\TestCase;

class TermsPageTest extends TestCase
{
    public function test_terms_page_renders(): void
    {
        $this->get('/termos')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Terms'));
    }
}
