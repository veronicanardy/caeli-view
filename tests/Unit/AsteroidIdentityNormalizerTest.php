<?php

namespace Tests\Unit;

use App\Support\AsteroidIdentityNormalizer;
use Tests\TestCase;

class AsteroidIdentityNormalizerTest extends TestCase
{
    public function test_it_normalizes_named_numbered_objects(): void
    {
        $identity = AsteroidIdentityNormalizer::normalize('1943 Anteros (1973 EC)');

        $this->assertSame('1943 Anteros (1973 EC)', $identity['rawName']);
        $this->assertSame('1943', $identity['permanentNumber']);
        $this->assertSame('Anteros', $identity['properName']);
        $this->assertSame('1973 EC', $identity['provisionalDesignation']);
        $this->assertSame('Anteros', $identity['displayName']);
        $this->assertSame('1943 · designação 1973 EC', $identity['subtitle']);
        $this->assertSame(['1943', 'Anteros', '1943 Anteros', '1973 EC', '1943 1973 EC'], $identity['aliases']);
    }

    public function test_it_normalizes_numbered_objects_without_proper_name(): void
    {
        $identity = AsteroidIdentityNormalizer::normalize('439877 (1999 XM141)');

        $this->assertSame('439877', $identity['permanentNumber']);
        $this->assertNull($identity['properName']);
        $this->assertSame('1999 XM141', $identity['provisionalDesignation']);
        $this->assertSame('1999 XM141', $identity['displayName']);
        $this->assertSame('Objeto numerado 439877', $identity['subtitle']);
        $this->assertSame(['439877', '1999 XM141', '439877 1999 XM141'], $identity['aliases']);
    }

    public function test_it_normalizes_pure_provisional_designations(): void
    {
        $identity = AsteroidIdentityNormalizer::normalize('(2026 KN2)');

        $this->assertNull($identity['permanentNumber']);
        $this->assertNull($identity['properName']);
        $this->assertSame('2026 KN2', $identity['provisionalDesignation']);
        $this->assertSame('2026 KN2', $identity['displayName']);
        $this->assertSame('Designação provisória', $identity['subtitle']);
        $this->assertSame(['2026 KN2'], $identity['aliases']);
    }
}
