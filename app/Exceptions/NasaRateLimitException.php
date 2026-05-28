<?php

namespace App\Exceptions;

class NasaRateLimitException extends NasaApiException
{
    public function __construct()
    {
        parent::__construct(
            message: 'NASA API rate limit exceeded.',
            statusCode: 429,
            userMessage: 'A NASA limitou temporariamente as consultas. Aguarde um pouco antes de tentar novamente.'
        );
    }
}
