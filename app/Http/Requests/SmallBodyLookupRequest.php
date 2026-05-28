<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SmallBodyLookupRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'identifier' => ['required', 'string', 'max:40', 'regex:/^[A-Za-z0-9 ._-]+$/'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'identifier' => trim(rawurldecode((string) $this->route('identifier'))),
        ]);
    }

    public function identifier(): string
    {
        return (string) $this->validated('identifier');
    }

    public function messages(): array
    {
        return [
            'identifier.regex' => 'A designação do viajante não parece válida para consulta no JPL.',
            'identifier.max' => 'A designação do viajante está longa demais para uma consulta segura.',
        ];
    }
}
