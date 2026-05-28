<?php

namespace App\Exceptions;

class NasaUnavailableException extends NasaApiException
{
    public function __construct()
    {
        parent::__construct(
            message: 'NASA API unavailable or timed out.',
            statusCode: 503,
            userMessage: 'A NASA parece indisponível agora. Seus dados não foram perdidos; tente novamente em instantes.'
        );
    }
}
