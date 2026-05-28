<?php

namespace App\Exceptions;

class JplRateLimitException extends JplApiException
{
    public function __construct()
    {
        parent::__construct(
            message: 'JPL API rate limit reached.',
            statusCode: 429,
            userMessage: 'O observatório do JPL está recebendo muitas consultas agora. Aguarde um instante e tente novamente.'
        );
    }
}
