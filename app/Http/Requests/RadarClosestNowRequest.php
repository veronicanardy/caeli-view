<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RadarClosestNowRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'date_min'      => ['nullable', 'date_format:Y-m-d'],
            'date_max'      => ['nullable', 'date_format:Y-m-d'],
            'limit'         => ['nullable', 'integer', 'min:1', 'max:30'],
            'mode'          => ['nullable', 'string', 'in:nearest,upcoming'],
            'force_refresh' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'date_min.date_format' => 'Use a data inicial no formato AAAA-MM-DD.',
            'date_max.date_format' => 'Use a data final no formato AAAA-MM-DD.',
            'limit.integer'        => 'O limite deve ser um número inteiro.',
            'limit.min'            => 'O limite mínimo é 1.',
            'limit.max'            => 'O limite máximo é 30.',
            'mode.in'              => 'Escolha nearest ou upcoming.',
        ];
    }
}
