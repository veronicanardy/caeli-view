<?php

use App\Http\Controllers\Web\AboutController;
use App\Http\Controllers\Web\ApodController;
use App\Http\Controllers\Web\RadarController;
use App\Http\Controllers\Web\AsteroidController;
use App\Http\Controllers\Web\EpicController;
use App\Http\Controllers\Web\HomeAstronomyFeedController;
use App\Http\Controllers\Web\HomeController;
use App\Http\Controllers\Web\ReverseGeocodeProxyController;
use App\Http\Controllers\Web\SkyObservationProxyController;
use App\Http\Controllers\Web\SmallBodiesController;
use App\Http\Controllers\Web\TermsController;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->middleware('throttle:nasa')->name('home');
Route::get('/proxy/sky-observation', SkyObservationProxyController::class)->middleware('throttle:60,1')->name('proxy.sky-observation');
Route::get('/proxy/reverse-geocode', ReverseGeocodeProxyController::class)->middleware('throttle:60,1')->name('proxy.reverse-geocode');
Route::get('/home/astronomy-feed', HomeAstronomyFeedController::class)->middleware('throttle:nasa')->name('home.astronomy-feed');
Route::get('/sobre', AboutController::class)->name('about');
Route::get('/termos', TermsController::class)->name('terms');

Route::middleware('throttle:nasa')->group(function (): void {
    Route::get('/radar', [RadarController::class, 'index'])->name('radar.index');
    Route::get('/radar/closest-now', [RadarController::class, 'closestNow'])->name('radar.closest-now');
    Route::get('/radar/famous', [RadarController::class, 'famous'])->name('radar.famous');
    Route::get('/radar/trajectory', [RadarController::class, 'trajectory'])->name('radar.trajectory');
    Route::get('/radar/asteroid-model', [RadarController::class, 'asteroidModel'])->name('radar.asteroid-model');
    Route::get('/radar/small-body/{identifier}', [RadarController::class, 'smallBody'])
        ->where('identifier', '[A-Za-z0-9%._ -]+')
        ->name('radar.small-body');
    Route::get('/radar/objetos/{identifier}', [SmallBodiesController::class, 'show'])
        ->where('identifier', '[A-Za-z0-9%._ -]+')
        ->name('radar.objects.show');
    Route::get('/asteroides', [AsteroidController::class, 'index'])->name('asteroids.index');
    Route::get('/asteroides/{asteroidId}', [AsteroidController::class, 'show'])
        ->whereAlphaNumeric('asteroidId')
        ->name('asteroids.show');
    Route::get('/epic/data', [EpicController::class, 'data'])->name('epic.data');
    Route::get('/epic', [EpicController::class, 'index'])->name('epic.index');
    Route::get('/apod/data', [ApodController::class, 'data'])->name('apod.data');
    Route::get('/apod', [ApodController::class, 'index'])->name('apod.index');
    Route::get('/viajantes', [SmallBodiesController::class, 'index'])->name('small-bodies.index');
});
