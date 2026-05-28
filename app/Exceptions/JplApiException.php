<?php

namespace App\Exceptions;

use RuntimeException;

class JplApiException extends RuntimeException
{
    public function __construct(
        string $message = 'JPL API request failed.',
        protected int $statusCode = 502,
        protected string $userMessage = 'Não foi possível consultar o JPL neste momento. Tente novamente em alguns minutos.'
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
