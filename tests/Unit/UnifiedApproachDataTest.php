<?php

namespace Tests\Unit;

use App\DTOs\Approaches\UnifiedApproachData;
use Tests\Fixtures\JplResponses;
use Tests\Fixtures\NasaResponses;
use Tests\TestCase;

class UnifiedApproachDataTest extends TestCase
{
    public function test_it_normalizes_neows_asteroids_for_the_observatory(): void
    {
        $asteroid = UnifiedApproachData::fromNeoWs([
            ...NasaResponses::asteroidLookup(),
            'primaryApproach' => [
                'date' => '2026-05-20',
                'dateTime' => '2026-05-20 12:00',
                'velocityKmPerHour' => 62_000.0,
                'missDistanceKm' => 800_000.0,
                'missDistanceLunar' => 2.08,
                'orbitingBody' => 'Earth',
            ],
            'estimatedDiameterMinKm' => 0.8,
            'estimatedDiameterMaxKm' => 1.2,
            'potentiallyHazardous' => true,
        ]);

        $this->assertSame('neows', $asteroid->source);
        $this->assertSame('asteroid', $asteroid->objectType);
        $this->assertSame(800_000.0, $asteroid->nominalDistanceKm);
        $this->assertSame(800.0, $asteroid->estimatedDiameterMinMeters);
        $this->assertTrue($asteroid->hazardFlag);
        $this->assertStringStartsWith('/radar/objetos/', $asteroid->toArray()['detailRoute']);
    }

    public function test_it_exposes_identity_fields_for_named_objects(): void
    {
        $asteroid = UnifiedApproachData::fromNeoWs([
            ...NasaResponses::asteroidLookup(),
            'name' => '1943 Anteros (1973 EC)',
            'primaryApproach' => [
                'date' => '2026-05-20',
                'dateTime' => '2026-05-20 12:00',
                'velocityKmPerHour' => 62_000.0,
                'missDistanceKm' => 800_000.0,
                'missDistanceLunar' => 2.08,
                'orbitingBody' => 'Earth',
            ],
        ])->toArray();

        $this->assertSame('1943 Anteros (1973 EC)', $asteroid['rawName']);
        $this->assertSame('Anteros', $asteroid['name']);
        $this->assertSame('Anteros', $asteroid['displayName']);
        $this->assertSame('1943', $asteroid['permanentNumber']);
        $this->assertSame('1973 EC', $asteroid['provisionalDesignation']);
        $this->assertSame('1943 · designação 1973 EC', $asteroid['subtitle']);
    }

    public function test_it_normalizes_cad_comets_for_the_observatory(): void
    {
        $response = JplResponses::cadApproaches();
        $cad = \App\DTOs\Jpl\CloseApproachData::fromCadRecord($response['fields'], $response['data'][1], 'Earth')->toArray();
        $approach = UnifiedApproachData::fromCad($cad);

        $this->assertSame('cad', $approach->source);
        $this->assertSame('comet', $approach->objectType);
        $this->assertSame('1P', $approach->detailIdentifier);
        $this->assertNotNull($approach->lunarDistance);
        $this->assertSame('/radar/objetos/1P', $approach->toArray()['detailRoute']);
    }
}
