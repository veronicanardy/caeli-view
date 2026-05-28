<?php

namespace App\Http\Requests;

use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class NeoWsDateRangeRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'end_date' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:start_date'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->filled('start_date') || ! $this->filled('end_date')) {
                return;
            }

            $start = CarbonImmutable::parse($this->input('start_date'));
            $end = CarbonImmutable::parse($this->input('end_date'));

            if ($start->diffInDays($end) > 7) {
                $validator->errors()->add('end_date', 'A API NeoWs aceita consultas de no máximo 7 dias por vez.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'start_date.date_format' => 'Use a data inicial no formato AAAA-MM-DD.',
            'end_date.date_format' => 'Use a data final no formato AAAA-MM-DD.',
            'end_date.after_or_equal' => 'A data final deve ser igual ou posterior à data inicial.',
        ];
    }
}
