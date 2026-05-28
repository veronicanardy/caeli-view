<?php

namespace App\Http\Controllers\Web;

use Inertia\Inertia;
use Inertia\Response;

class HomeController
{
    public function __invoke(): Response
    {
        return Inertia::render('Home', [
            'apod' => null,
            'apodError' => null,
            'nextApproach' => null,
            'spaceNewsHighlight' => null,
        ]);
    }
}
