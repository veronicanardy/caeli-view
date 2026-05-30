<?php

namespace App\Services\Jpl\Horizons;

use App\DTOs\Jpl\Horizons\HorizonsVectorFetchResultData;
use App\Exceptions\JplApiException;
use App\Exceptions\JplRateLimitException;
use App\Exceptions\JplUnavailableException;
use App\Services\Jpl\Sbdb\SmallBodyService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Sleep;

/**
 * Executa o pipeline de fetch de efemérides vetoriais com retry e fallback.
 *
 * Pipeline em caso de falha transiente (503/timeout):
 *   1. Tenta cada comando candidato uma vez.
 *   2. Se todos falharam transitoriamente, repete com backoff exponencial.
 *   3. Se ainda falhar, busca o SPKID via SBDB e adiciona como candidato extra.
 *   4. Tenta o candidato SPKID.
 *   5. Só então retorna indisponível com o motivo da última falha.
 */
final class HorizonsEphemerisRetrier
{
    /** Delays (ms) entre tentativas após falha transiente. */
    private const RETRY_DELAYS_MS = [800, 2000];

    public function __construct(
        private readonly HorizonsClient $client,
        private readonly HorizonsTextParser $parser,
        private readonly SmallBodyService $smallBodies,
    ) {
    }

    /**
     * Executa o pipeline completo de fetch para a janela temporal solicitada.
     *
     * @param  array<int, string>  $commands      candidatos de comando Horizons
     * @param  string|null  $designationForSbdb    designação usada no fallback SBDB
     */
    public function fetch(
        array $commands,
        string $startTime,
        string $stopTime,
        string $stepSize,
        ?string $designationForSbdb = null,
    ): HorizonsVectorFetchResultData {
        if ($commands === []) {
            return HorizonsVectorFetchResultData::unavailable('no_command_candidates');
        }

        // Fase 1: primeira passagem por todos os candidatos.
        $lastFailureReason = null;
        $hadTransientFailure = false;

        $result = $this->tryCommands($commands, $startTime, $stopTime, $stepSize, $lastFailureReason, $hadTransientFailure);
        if ($result !== null) {
            return $result;
        }

        // Fase 2: se todas as falhas foram transientes, repete com backoff antes de desistir.
        if ($hadTransientFailure) {
            foreach (self::RETRY_DELAYS_MS as $delayMs) {
                Sleep::usleep($delayMs * 1000);
                $result = $this->tryCommands($commands, $startTime, $stopTime, $stepSize, $lastFailureReason, $hadTransientFailure);
                if ($result !== null) {
                    Log::info('Horizons: sucesso após retry transiente.', ['commands' => $commands, 'delay_ms' => $delayMs]);

                    return $result;
                }
            }

            // Fase 3: busca o SPKID no SBDB e adiciona como candidato adicional.
            if ($designationForSbdb !== null) {
                $spkId = $this->smallBodies->spkIdFor($designationForSbdb);
                if ($spkId !== null && ! in_array($spkId, $commands, true) && ! in_array($spkId.';', $commands, true)) {
                    Log::info('Horizons: fallback via SPKID do SBDB após falha transiente.', [
                        'designation' => $designationForSbdb,
                        'spkId' => $spkId,
                    ]);
                    $result = $this->tryCommands([$spkId], $startTime, $stopTime, $stepSize, $lastFailureReason, $hadTransientFailure);
                    if ($result !== null) {
                        Log::info('Horizons: sucesso via SPKID do SBDB.', ['spkId' => $spkId]);

                        return $result;
                    }
                }
            }
        }

        return HorizonsVectorFetchResultData::unavailable($lastFailureReason ?? 'no_ephemeris');
    }

    /**
     * Tenta cada comando uma única vez (sem retry interno).
     * Atualiza $lastFailureReason e $hadTransientFailure por referência.
     *
     * @param  array<int, string>  $commands
     */
    private function tryCommands(
        array $commands,
        string $startTime,
        string $stopTime,
        string $stepSize,
        ?string &$lastFailureReason,
        bool &$hadTransientFailure,
    ): ?HorizonsVectorFetchResultData {
        foreach ($commands as $command) {
            try {
                $content = $this->client->vectorsOnce($command, $startTime, $stopTime, $stepSize, 'YES');

                if (! $this->parser->hasEphemeris($content)) {
                    $lastFailureReason = 'no_ephemeris';
                    continue;
                }

                $points = $this->parser->parseVectorPoints($content);
                if (count($points) >= 1) {
                    return HorizonsVectorFetchResultData::available(
                        $points,
                        $this->parser->parseOrbitalElements($content),
                    );
                }

                $lastFailureReason = 'parse_error';
            } catch (JplRateLimitException) {
                Log::info('Horizons: rate limit no candidato.', ['command' => $command]);
                $lastFailureReason = 'rate_limit';
                $hadTransientFailure = true;
            } catch (JplUnavailableException) {
                Log::info('Horizons: candidato indisponível.', ['command' => $command]);
                $lastFailureReason = 'timeout';
                $hadTransientFailure = true;
            } catch (JplApiException $e) {
                Log::info('Horizons: falha no candidato.', ['command' => $command, 'message' => $e->getMessage()]);
                $lastFailureReason = 'http_error';
                $hadTransientFailure = true;
            }
        }

        return null;
    }
}
