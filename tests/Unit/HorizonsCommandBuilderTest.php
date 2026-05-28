<?php

namespace Tests\Unit;

use App\Support\AsteroidIdentityNormalizer;
use App\Support\HorizonsCommandBuilder;
use Tests\TestCase;

class HorizonsCommandBuilderTest extends TestCase
{
    public function test_it_builds_commands_for_pure_provisional_designation(): void
    {
        $identity = AsteroidIdentityNormalizer::normalize('(2012 KZ41)');

        $this->assertSame([
            'DES=2012 KZ41;',
            '2012 KZ41',
        ], HorizonsCommandBuilder::build($identity));
    }

    public function test_it_builds_commands_for_named_numbered_object(): void
    {
        $identity = AsteroidIdentityNormalizer::normalize('1943 Anteros (1973 EC)');

        $this->assertSame([
            '1943;',
            'DES=1973 EC;',
            'Anteros',
        ], HorizonsCommandBuilder::build($identity));
    }

    public function test_it_builds_commands_for_numbered_object_without_proper_name(): void
    {
        $identity = AsteroidIdentityNormalizer::normalize('439877 (1999 XM141)');

        $this->assertSame([
            '439877;',
            'DES=1999 XM141;',
        ], HorizonsCommandBuilder::build($identity));
    }

    public function test_it_builds_commands_for_bennu(): void
    {
        $identity = AsteroidIdentityNormalizer::normalize('101955 Bennu (1999 RQ36)');

        $this->assertSame([
            '101955;',
            'DES=1999 RQ36;',
            'Bennu',
        ], HorizonsCommandBuilder::build($identity));
    }

    public function test_it_treats_bare_provisional_designation_as_designation(): void
    {
        $identity = AsteroidIdentityNormalizer::normalize('2024 XN1');

        $this->assertNull($identity['permanentNumber']);
        $this->assertSame('2024 XN1', $identity['provisionalDesignation']);
        $this->assertSame([
            'DES=2024 XN1;',
            '2024 XN1',
        ], HorizonsCommandBuilder::build($identity));
    }

    public function test_it_treats_designation_with_trailing_digits_as_designation(): void
    {
        $identity = AsteroidIdentityNormalizer::normalize('2012 KZ41');

        $this->assertNull($identity['permanentNumber']);
        $this->assertSame('2012 KZ41', $identity['provisionalDesignation']);
        $this->assertSame([
            'DES=2012 KZ41;',
            '2012 KZ41',
        ], HorizonsCommandBuilder::build($identity));
    }

    public function test_it_prioritizes_trusted_spk_id(): void
    {
        $identity = AsteroidIdentityNormalizer::normalize('101955 Bennu (1999 RQ36)');

        $this->assertSame([
            '2101955',
            '101955;',
            'DES=1999 RQ36;',
            'Bennu',
        ], HorizonsCommandBuilder::build($identity, '2101955'));
    }
}
