<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ApodDateRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:1995-06-16', 'before_or_equal:today'],
        ];
    }

    public function messages(): array
    {
        return [
            'date.date_format' => 'Use a data no formato AAAA-MM-DD.',
            'date.after_or_equal' => 'A APOD só possui registros a partir de 16 de junho de 1995.',
            'date.before_or_equal' => 'A data não pode estar no futuro.',
        ];
    }
}
