<?php

use App\Exceptions\NasaApiException;
use App\Exceptions\NasaRateLimitException;
use App\Exceptions\NasaUnavailableException;
use App\Exceptions\JplApiException;
use App\Exceptions\JplRateLimitException;
use App\Exceptions\JplUnavailableException;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            HandleInertiaRequests::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontReport([
            NasaApiException::class,
            NasaRateLimitException::class,
            NasaUnavailableException::class,
            JplApiException::class,
            JplRateLimitException::class,
            JplUnavailableException::class,
        ]);

        $exceptions->render(function (NasaApiException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getUserMessage()], $e->getStatusCode());
            }

            return back()->with('error', $e->getUserMessage());
        });

        $exceptions->render(function (JplApiException $e, Request $request) {
            if ($request->expectsJson()) {
                return response()->json(['message' => $e->getUserMessage()], $e->getStatusCode());
            }

            return back()->with('error', $e->getUserMessage());
        });
    })
    ->create();
