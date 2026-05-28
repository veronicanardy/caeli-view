<?php

namespace Tests\Fixtures;

final class JplResponses
{
    public static function cadApproaches(): array
    {
        return [
            'signature' => ['source' => 'NASA/JPL SBDB Close Approach Data API', 'version' => '1.5'],
            'count' => 3,
            'fields' => ['des', 'orbit_id', 'jd', 'cd', 'dist', 'dist_min', 'dist_max', 'v_rel', 'v_inf', 't_sigma_f', 'h', 'diameter', 'diameter_sigma', 'fullname'],
            'data' => [
                ['153814', '174', '2461948.7245', '2028-Jun-26 05:23', '0.0016625', '0.0016623', '0.0016627', '10.24', '10.08', '< 00:01', '18.33', '0.932', '0.011', '153814 (2001 WN5)'],
                ['1P', '90', '2462000.0000', '2028-Aug-15 02:10', '0.1400000', '0.139', '0.141', '34.20', '33.90', '00:05', '5.5', null, null, '1P/Halley'],
                ['2001 AV43', '42', '2462452.1420', '2029-Nov-11 15:25', '0.0020927', '0.0020912', '0.0020941', '3.99', '3.66', '00:03', '24.6', null, null, '(2001 AV43)'],
            ],
        ];
    }

    public static function horizonsVectors(): array
    {
        return [
            'signature' => ['source' => 'NASA/JPL Horizons API', 'version' => '1.2'],
            'result' => self::horizonsVectorsText(),
        ];
    }

    public static function horizonsVectorsText(): string
    {
        return <<<'TEXT'
*******************************************************************************
$$SOE
2460000.000000000, A.D. 2026-May-19 12:00:00.0000, -720000.0, -360000.0, 12000.0, 0, 0, 0, 2.6, 805069.6, -1.0
2460000.500000000, A.D. 2026-May-20 00:00:00.0000, -360000.0, -180000.0, 8000.0, 0, 0, 0, 1.3, 402572.4, -0.5
2460001.000000000, A.D. 2026-May-20 12:00:00.0000, 800000.0, 0.0, 4000.0, 0, 0, 0, 0.2, 800010.0, 0.0
2460001.500000000, A.D. 2026-May-21 00:00:00.0000, 360000.0, 180000.0, 8000.0, 0, 0, 0, 1.3, 402572.4, 0.5
2460002.000000000, A.D. 2026-May-21 12:00:00.0000, 720000.0, 360000.0, 12000.0, 0, 0, 0, 2.6, 805069.6, 1.0
$$EOE
*******************************************************************************
TEXT;
    }

    /**
     * Horizons VECTORS response that also includes the osculating orbital elements header that the
     * parser reads (EC, QR, IN, OM, W, TP, EPOCH). Use this when exercising parseOrbitalElements.
     */
    public static function horizonsVectorsWithElementsText(): string
    {
        return <<<'TEXT'
*******************************************************************************
 Revised: ... 2026  Apophis (99942)  ...

 EPOCH=  2461184.5 ! 2026-Jun-15.0000 (TDB)
  EC= .1911807 QR= .7461292 TP= 2461206.39521
  OM= 204.06 W=  126.39482 IN= 3.331426
  A=  .9223
*******************************************************************************
$$SOE
2460000.000000000, A.D. 2026-May-19 12:00:00.0000, -720000.0, -360000.0, 12000.0, 0.5, 0.3, 0.01, 2.6, 805069.6, -1.0
2460000.500000000, A.D. 2026-May-20 00:00:00.0000, -360000.0, -180000.0, 8000.0, 0.5, 0.3, 0.01, 1.3, 402572.4, -0.5
2460001.000000000, A.D. 2026-May-20 12:00:00.0000, 800000.0, 0.0, 4000.0, 0.5, 0.3, 0.01, 0.2, 800010.0, 0.0
$$EOE
*******************************************************************************
TEXT;
    }

    public static function sbdbSmallBody(): array
    {
        return [
            'signature' => ['source' => 'NASA/JPL Small-Body Database (SBDB) API', 'version' => '1.3'],
            'object' => [
                'des' => '1P',
                'spkid' => '1000012',
                'fullname' => '1P/Halley',
                'shortname' => 'Halley',
                'kind' => 'cn',
                'prefix' => 'P',
                'orbit_class' => ['code' => 'HTC', 'name' => 'Halley-type Comet'],
            ],
            'orbit' => [
                'epoch' => '2449400.5',
                'equinox' => 'J2000',
                'first_obs' => '1835-08-21',
                'soln_date' => '2026-Jan-01',
                'elements' => [
                    ['name' => 'e', 'label' => 'e', 'title' => 'eccentricity', 'value' => '0.967', 'sigma' => '0.001', 'units' => null],
                    ['name' => 'q', 'label' => 'q', 'title' => 'perihelion distance', 'value' => '0.586', 'sigma' => null, 'units' => 'au'],
                    ['name' => 'i', 'label' => 'i', 'title' => 'inclination', 'value' => '162.2', 'sigma' => null, 'units' => 'deg'],
                    ['name' => 'a', 'label' => 'a', 'title' => 'semi-major axis', 'value' => '17.8', 'sigma' => null, 'units' => 'au'],
                    ['name' => 'per', 'label' => 'period', 'title' => 'orbital period', 'value' => '27500', 'sigma' => null, 'units' => 'd'],
                ],
            ],
            'phys_par' => [
                ['name' => 'H', 'value' => '5.5', 'sigma' => null, 'units' => 'mag', 'title' => 'absolute magnitude', 'desc' => 'absolute magnitude'],
                ['name' => 'diameter', 'value' => '11', 'sigma' => '1', 'units' => 'km', 'title' => 'diameter', 'desc' => 'effective diameter'],
                ['name' => 'albedo', 'value' => '0.04', 'sigma' => null, 'units' => null, 'title' => 'albedo', 'desc' => 'geometric albedo'],
            ],
            'ca_data' => [
                ['body' => 'Earth', 'cd' => '2061-Jul-29 10:00', 'jd' => '2474000.5', 'sigma_tf' => '00:10', 'dist' => '0.477', 'dist_min' => '0.476', 'dist_max' => '0.478', 'v_rel' => '54.5', 'v_inf' => '54.4', 'orbit_ref' => '90'],
            ],
        ];
    }

    public static function sbdbWithoutPhysicalData(): array
    {
        $response = self::sbdbSmallBody();
        $response['phys_par'] = [];
        $response['orbit']['elements'] = [];

        return $response;
    }

    public static function sbdbNotFound(): array
    {
        return [
            'signature' => ['source' => 'NASA/JPL Small-Body Database (SBDB) API', 'version' => '1.3'],
            'code' => 200,
            'message' => 'specified object was not found',
        ];
    }
}
