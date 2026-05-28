<?php

namespace App\Exceptions;

use RuntimeException;

class NasaApiException extends RuntimeException
{
    public function __construct(
        string $message = 'A NASA não conseguiu responder agora.',
        protected int $statusCode = 502,
        protected string $userMessage = 'Não foi possível consultar a NASA neste momento. Tente novamente em alguns minutos.'
    ) {
        parent::__construct($message, $statusCode);
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }

    public function getUserMessage(): string
    {
        return $this->userMessage;
    }
}
