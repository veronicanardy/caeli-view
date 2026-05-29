<?php

namespace App\Services\Jpl\Horizons;

/**
 * Fachada de alto nível para consultas de vetores de estado na API JPL Horizons.
 *
 * Combina HorizonsQueryBuilder (parâmetros) com HorizonsHttpTransport (HTTP),
 * expondo apenas as operações que os serviços de domínio precisam conhecer.
 */
final class HorizonsClient
{
    public function __construct(
        private readonly HorizonsQueryBuilder $queryBuilder,
        private readonly HorizonsHttpTransport $transport,
    ) {
    }

    /**
     * Consulta vetores de estado com retry automático.
     *
     * Usar quando o caller não implementa backoff próprio.
     */
    public function vectors(
        string $command,
        string $startTime,
        string $stopTime,
        string $stepSize,
        string $objectData = 'NO',
    ): string {
        $query = $this->queryBuilder->vectorQuery($command, $startTime, $stopTime, $stepSize, $objectData);

        return $this->transport->get($query);
    }

    /**
     * Consulta vetores de estado em tentativa única, sem retry interno.
     *
     * Usar quando o caller implementa seu próprio backoff (ex.: HorizonsEphemerisRetrier).
     */
    public function vectorsOnce(
        string $command,
        string $startTime,
        string $stopTime,
        string $stepSize,
        string $objectData = 'NO',
    ): string {
        $query = $this->queryBuilder->vectorQuery($command, $startTime, $stopTime, $stepSize, $objectData);

        return $this->transport->getOnce($query);
    }
}
