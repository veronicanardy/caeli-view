<?php

namespace App\Exceptions;

class JplUnavailableException extends JplApiException
{
    public function __construct()
    {
        parent::__construct(
            message: 'JPL API unavailable.',
            statusCode: 503,
            userMessage: 'O JPL parece indisponível agora. A observação pode ser retomada em alguns instantes.'
        );
    }
}
