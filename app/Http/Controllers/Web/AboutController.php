<?php

namespace App\Http\Controllers\Web;

use Inertia\Inertia;
use Inertia\Response;

class AboutController
{
    public function __invoke(): Response
    {
        return Inertia::render('About');
    }
}
