<?php

namespace App\DTOs\Jpl\Horizons;

final readonly class HorizonsOrbitalElementsData
{
    public function __construct(
        public float $ec,
        public float $qrAu,
        public float $inDeg,
        public float $omDeg,
        public float $wDeg,
        public float $tpJd,
        public float $epochJd,
    ) {
    }

    /**
     * @return array{ec: float, qrAu: float, inDeg: float, omDeg: float, wDeg: float, tpJd: float, epochJd: float}
     */
    public function toArray(): array
    {
        return [
            'ec' => $this->ec,
            'qrAu' => $this->qrAu,
            'inDeg' => $this->inDeg,
            'omDeg' => $this->omDeg,
            'wDeg' => $this->wDeg,
            'tpJd' => $this->tpJd,
            'epochJd' => $this->epochJd,
        ];
    }
}
