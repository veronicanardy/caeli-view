<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EpicDateRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'date' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
        ];
    }

    public function messages(): array
    {
        return [
            'date.date_format' => 'Use a data no formato AAAA-MM-DD.',
            'date.before_or_equal' => 'A data não pode estar no futuro.',
        ];
    }
}
